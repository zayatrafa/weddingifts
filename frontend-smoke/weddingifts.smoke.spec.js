import { test, expect } from "@playwright/test";
import {
  createAuthenticatedSession,
  createEnrichedEvent,
  createEvent,
  createGift,
  createGuest,
  createUser,
  formatCpf,
  futureDateTimeInputValue,
  generateUniqueCpf,
  getGuests,
  getRsvp,
  uniqueSuffix
} from "./support/api-helpers.js";

test("login válido autentica e redireciona para o fluxo privado", async ({ page }) => {
  const user = await createUser();

  await page.goto("/login.html");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/create-event\.html$/);
  await expect(page.getByRole("heading", { name: "Crie e publique o seu evento" })).toBeVisible();
  await expect(page.locator("#user-menu-button")).toBeVisible();
});

test("create-event cria evento com sucesso e redireciona para meus eventos", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const eventName = `Evento Smoke ${uniqueSuffix()}`;
  const invitationMessage = "Estamos felizes em celebrar com você no nosso grande dia.";

  await seedAuthSession(page, session.login);
  await page.goto("/create-event.html");

  await page.getByLabel("Nome do evento").fill(eventName);
  await page.getByLabel("Nomes do casal").fill("Ana e Bruno");
  await page.getByLabel("Data e hora").fill(futureDateTimeInputValue());
  await page.getByLabel("Fuso do evento").selectOption("America/Sao_Paulo");
  await page.getByLabel("Nome do local").fill("Espaço Smoke");
  await page.getByLabel("Endereço do local").fill("Rua Smoke, 123 - São Paulo, SP");
  await page.getByLabel("Link do Google Maps").fill("https://maps.google.com/?q=Espaco+Smoke");
  await page.getByLabel("Informações da cerimônia").fill("Cerimônia e recepção no mesmo local.");
  await page.getByLabel("Traje").fill("Esporte fino");
  await page.getByLabel("Mensagem do convite").fill(invitationMessage);
  await expect(page.getByLabel("URL da imagem de capa")).not.toHaveAttribute("required", "");
  await page.getByRole("button", { name: "Criar evento" }).click();

  await page.waitForURL(/my-events\.html\?focusEventId=\d+/);
  await expect(page.locator(".event-title", { hasText: eventName })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: "Ana e Bruno" })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: invitationMessage })).toBeVisible();

  await page.getByRole("button", { name: "Editar evento" }).click();
  await expect(page.getByLabel("Mensagem do convite")).toHaveValue(invitationMessage);
  await expect(page.getByLabel("URL da imagem de capa")).toHaveValue("");
});

test("my-events carrega eventos do usuário e mantém ações principais funcionais", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const eventName = `Evento Listagem ${uniqueSuffix()}`;
  const eventData = await createEvent(session.token, { name: eventName });

  await seedAuthSession(page, session.login);
  await page.goto("/my-events.html");

  await expect(page.locator(".event-title", { hasText: eventName })).toBeVisible();
  await expect(page.getByRole("button", { name: "Convidados" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Presentes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Histórico de reservas" })).toBeVisible();

  await page.getByRole("button", { name: "Presentes" }).click();
  await expect(page).toHaveURL(new RegExp(`my-event\\.html\\?eventId=${eventData.id}$`));
});

test("my-event mantem resumo compacto com campos longos", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const longUrlTail = "setor-a-corredor-b-".repeat(18);
  const eventData = await createEnrichedEvent(session.token, {
    name: `Evento Privado ${uniqueSuffix()} ${"Detalhe ".repeat(7)}`.slice(0, 118),
    hostNames: `Ana e Bruno ${"Familia convidada ".repeat(5)}`.slice(0, 158),
    locationName: "Espaco Smoke Principal",
    locationAddress: `Rua das Celebracoes, 123 - ${"Bloco especial com referencia longa ".repeat(6)}`.slice(0, 253),
    locationMapsUrl: `https://maps.google.com/?q=${longUrlTail}`,
    ceremonyInfo: `Cerimonia e recepcao no mesmo local. ${"Orientacao detalhada para chegada e acesso. ".repeat(9)}`.slice(0, 498),
    dressCode: "Esporte fino com observacoes compactas",
    coverImageUrl: `https://cdn.example.com/capas/${longUrlTail}foto.jpg`
  });

  await seedAuthSession(page, session.login);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/my-event.html?eventId=${eventData.id}`);

  const summary = page.locator("#selected-event-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Evento selecionado");
  await expect(summary.locator("h2")).toHaveAttribute("title", eventData.name);

  const mapLink = summary.getByRole("link", { name: eventData.locationMapsUrl });
  await expect(mapLink).toHaveAttribute("title", eventData.locationMapsUrl);
  await expect(mapLink).toHaveCSS("text-overflow", "ellipsis");

  const desktopMetrics = await page.evaluate(() => {
    const summaryElement = document.querySelector("#selected-event-summary");
    const detailsElement = document.querySelector(".selected-event-details");
    const detailItem = document.querySelector(".selected-event-details div");
    const dashboard = document.querySelector(".dashboard-grid");
    const summaryRect = summaryElement.getBoundingClientRect();
    const dashboardRect = dashboard.getBoundingClientRect();
    const detailItemStyle = getComputedStyle(detailItem);
    return {
      summaryHeight: summaryRect.height,
      dashboardTop: dashboardRect.top,
      detailColumns: getComputedStyle(detailsElement).gridTemplateColumns.split(" ").filter(Boolean).length,
      detailItemBorderTopWidth: detailItemStyle.borderTopWidth,
      detailItemBorderRadius: detailItemStyle.borderTopLeftRadius,
      detailItemBackgroundColor: detailItemStyle.backgroundColor,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  expect(desktopMetrics.detailColumns).toBe(3);
  expect(desktopMetrics.summaryHeight).toBeLessThanOrEqual(220);
  expect(desktopMetrics.dashboardTop).toBeLessThanOrEqual(560);
  expect(desktopMetrics.detailItemBorderTopWidth).toBe("0px");
  expect(desktopMetrics.detailItemBorderRadius).toBe("0px");
  expect(desktopMetrics.detailItemBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(desktopMetrics.horizontalOverflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 800 });

  const mobileMetrics = await page.evaluate(() => {
    const detailsElement = document.querySelector(".selected-event-details");
    const scrollElement = document.querySelector(".selected-event-summary-scroll");
    const titleRect = document.querySelector(".selected-event-summary-head h2").getBoundingClientRect();
    const dateRect = document.querySelector(".selected-event-summary-head .tag").getBoundingClientRect();
    return {
      detailColumns: getComputedStyle(detailsElement).gridTemplateColumns.split(" ").filter(Boolean).length,
      detailsClientHeight: scrollElement.clientHeight,
      detailsScrollHeight: scrollElement.scrollHeight,
      dateTop: dateRect.top,
      titleBottom: titleRect.bottom,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  expect(mobileMetrics.detailColumns).toBe(1);
  expect(mobileMetrics.detailsScrollHeight).toBeGreaterThan(mobileMetrics.detailsClientHeight);
  expect(mobileMetrics.dateTop).toBeGreaterThanOrEqual(mobileMetrics.titleBottom - 1);
  expect(mobileMetrics.horizontalOverflow).toBeLessThanOrEqual(1);
});

test("my-guests cria e edita limite de acompanhantes", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const eventData = await createEvent(session.token, {
    name: `Evento Convidados ${uniqueSuffix()}`
  });
  const guestName = "Maria Souza";
  const guestCpf = generateUniqueCpf();
  const guestEmail = `guest-${uniqueSuffix()}@weddingifts.local`;

  await seedAuthSession(page, session.login);
  await page.goto(`/my-guests.html?eventId=${eventData.id}`);

  await page.getByLabel("CPF").fill(formatCpf(guestCpf));
  await page.getByLabel("Nome").fill(guestName);
  await page.getByLabel("E-mail").fill(guestEmail);
  await page.getByLabel("Celular").fill("(11) 99999-0000");
  await page.getByLabel("Acompanhantes permitidos").fill("2");
  await page.getByRole("button", { name: "Adicionar convidado" }).click();

  const guestCard = page.locator(".guest-card", { hasText: guestName });
  await expect(guestCard).toBeVisible();
  await expect(guestCard).toContainText("Acompanhantes: 2");

  await expect.poll(async () => {
    const guests = await getGuests(session.token, eventData.id);
    return guests.find((guest) => guest.cpf === guestCpf)?.maxExtraGuests;
  }).toBe(2);

  await guestCard.getByRole("button", { name: "Editar convidado" }).click();
  await page.getByLabel("Acompanhantes permitidos").fill("1");
  await page.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(guestCard).toContainText("Acompanhantes: 1");
  await expect.poll(async () => {
    const guests = await getGuests(session.token, eventData.id);
    return guests.find((guest) => guest.cpf === guestCpf)?.maxExtraGuests;
  }).toBe(1);
});

test("evento público permite reservar e cancelar reserva sem quebra do fluxo", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Público ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id);
  const gift = await createGift(owner.token, eventData.id, {
    name: `Presente Público ${uniqueSuffix()}`,
    price: 150,
    quantity: 1
  });
  const secondGift = await createGift(owner.token, eventData.id, {
    name: `Outro Presente ${uniqueSuffix()}`,
    description: "Item para validar busca e ordenação.",
    price: 450,
    quantity: 2
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/event.html?slug=${eventData.slug}`);

  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#invitation-guest-cpf-input")).toBeHidden();
  await expect(page.getByRole("button", { name: "OK" })).toHaveCount(0);
  await expect(page.locator("#rsvp-panel")).toContainText("Confirmação pendente");
  await page.locator("#rsvp-submit-button").click();

  await expect(page.locator("#invitation-step-panel")).toContainText("Clique em Continuar para seguir para a etapa de presentes.");
  await expect(page.locator(".invitation-info-list")).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar" })).toBeVisible();
  await expect(page.locator("#invitation-complete-button")).toHaveText("Continuar");
  await expect(page.locator(".invitation-info-row dt").filter({ hasText: /^Data e hora$/ })).toHaveCount(1);
  await expect(page.locator(".invitation-info-row dt").filter({ hasText: /^Local$/ })).toHaveCount(1);
  const eventInfoMetrics = await page.evaluate(() => {
    const card = document.querySelector(".invitation-step-card");
    const row = document.querySelector(".invitation-info-row");
    const cardStyle = getComputedStyle(card);
    const rowStyle = getComputedStyle(row);
    return {
      cardBorderTopWidth: cardStyle.borderTopWidth,
      cardBackgroundColor: cardStyle.backgroundColor,
      rowBorderTopWidth: rowStyle.borderTopWidth,
      rowBackgroundColor: rowStyle.backgroundColor,
      hasSavingText: document.body.innerText.includes("Salvando confirmação")
    };
  });
  expect(eventInfoMetrics.cardBorderTopWidth).toBe("0px");
  expect(eventInfoMetrics.cardBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(eventInfoMetrics.rowBorderTopWidth).toBe("0px");
  expect(eventInfoMetrics.rowBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(eventInfoMetrics.hasSavingText).toBe(false);
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.locator("#gift-search-input")).toBeHidden();
  await page.locator("#invitation-complete-button").click();
  await expect(page.locator(".invitation-gift-icon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quero presentear" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Não vou presentear" })).toBeVisible();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await page.getByRole("button", { name: "Quero presentear" }).click();
  await expect(page).toHaveURL(new RegExp(`gifts\\.html\\?slug=${eventData.slug}$`));
  await expect(page.locator("#gift-search-input")).toBeVisible();
  await expect(page.locator("#gift-cart-panel")).not.toContainText("Voltar ao convite");
  const giftLayoutMetrics = await page.evaluate(() => {
    const filters = document.querySelector("#public-gift-filter-section").getBoundingClientRect();
    const grid = document.querySelector("#gift-grid").getBoundingClientRect();
    const cart = document.querySelector("#gift-cart-panel").getBoundingClientRect();
    return {
      filterRight: filters.right,
      gridLeft: grid.left,
      gridRight: grid.right,
      cartLeft: cart.left,
      filterPosition: getComputedStyle(document.querySelector("#public-gift-filter-section")).position,
      cartPosition: getComputedStyle(document.querySelector("#gift-cart-panel")).position,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(giftLayoutMetrics.filterRight).toBeLessThanOrEqual(giftLayoutMetrics.gridLeft + 1);
  expect(giftLayoutMetrics.gridRight).toBeLessThanOrEqual(giftLayoutMetrics.cartLeft + 1);
  expect(giftLayoutMetrics.filterPosition).toBe("sticky");
  expect(giftLayoutMetrics.cartPosition).toBe("sticky");
  expect(giftLayoutMetrics.horizontalOverflow).toBeLessThanOrEqual(1);
  await page.locator("#gift-search-input").fill(secondGift.name);
  await expect(page.locator(".gift-name", { hasText: secondGift.name })).toBeVisible();
  await expect(page.locator(".gift-name", { hasText: gift.name })).toHaveCount(0);

  await page.locator("#gift-search-input").fill("");
  await page.locator("#gift-sort-select").selectOption("price-desc");
  await expect(page.locator(".gift-name").first()).toHaveText(secondGift.name);

  await page.locator("[data-gift-filter='available']").click();
  await expect(page.locator(".gift-name", { hasText: gift.name })).toBeVisible();

  const giftCard = page.locator("article.card.card-pad").filter({
    has: page.locator(".gift-name", { hasText: gift.name })
  }).first();

  await expect(giftCard).toBeVisible();
  const giftButtonOverflow = await giftCard.evaluate((card) => {
    return Array.from(card.querySelectorAll(".gift-card-actions .btn")).map((button) => {
      return button.scrollWidth - button.clientWidth;
    });
  });
  expect(Math.max(...giftButtonOverflow)).toBeLessThanOrEqual(1);
  await expect(page.locator("#gift-cart-panel")).toContainText("Carrinho de presentes");
  await giftCard.getByRole("button", { name: "Adicionar ao carrinho" }).click();

  await expect(page.locator("#public-gifts-status")).toContainText("Presente adicionado ao carrinho.");
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);
  await page.locator("[data-gift-filter='reserved']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("0 disponíveis | 1 reservados");

  await giftCard.getByRole("button", { name: "Remover do carrinho" }).click();

  await expect(page.locator("#public-gifts-status")).toContainText("Presente removido do carrinho.");
  await expect(page.locator("#gift-cart-panel")).toContainText("Seu carrinho está vazio");
  await page.locator("[data-gift-filter='available']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("1 disponíveis | 0 reservados");

  await giftCard.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);
  await page.locator("#gift-checkout-button").click();
  await expect(page.locator("#gift-order-success")).toContainText("Presentes reservados com sucesso");

  await page.evaluate(() => sessionStorage.removeItem("wg_public_gift_context"));
  await page.goto(`/gifts.html?slug=${eventData.slug}`);
  await expect(page.locator("#gift-guest-identification")).toBeVisible();
  await expect(page.locator("#gift-identify-back-link")).toHaveAttribute("href", `./event.html?slug=${eventData.slug}`);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#invitation-return-menu")).toBeVisible();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.getByText("Consultando RSVP")).toHaveCount(0);
  await expect(page.locator("#invitation-guest-cpf-input")).toBeHidden();
  await page.getByRole("button", { name: "Presentear casal" }).click();
  await expect(page).toHaveURL(new RegExp(`gifts\\.html\\?slug=${eventData.slug}$`));
  await expect(page.locator("#gift-search-input")).toBeVisible();
  const directGiftCard = page.locator("article.card.card-pad").filter({
    has: page.locator(".gift-name", { hasText: secondGift.name })
  }).first();
  await directGiftCard.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.locator("#public-gifts-status")).toContainText("Presente adicionado ao carrinho.");
});

test("lista de presentes usa carrinho mobile em gaveta", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEvent(owner.token, {
    name: `Evento Mobile ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id);
  const gift = await createGift(owner.token, eventData.id, {
    name: `Presente Mobile ${uniqueSuffix()}`,
    price: 123,
    quantity: 2
  });

  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/gifts.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("#gift-search-input")).toBeVisible();
  await expect(page.locator("#gift-cart-mobile-bar")).toBeHidden();

  const giftCard = page.locator("article.card.card-pad").filter({
    has: page.locator(".gift-name", { hasText: gift.name })
  }).first();

  await giftCard.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.locator("#public-gifts-status")).toContainText("Presente adicionado ao carrinho.");

  const mobileBar = page.locator("#gift-cart-mobile-bar");
  await expect(mobileBar).toBeVisible();
  await expect(mobileBar).toContainText("1 presente");
  await mobileBar.click();
  await expect(page.locator("#gift-cart-mobile-overlay")).toBeVisible();
  await expect(page.locator("#gift-cart-panel")).toHaveClass(/is-open/);
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);

  await page.locator("#gift-cart-panel [data-cart-remove-gift-id]").click();
  await expect(page.locator("#public-gifts-status")).toContainText("Presente removido do carrinho.");
  await expect(mobileBar).toBeHidden();
  await expect(page.locator("#gift-cart-panel")).not.toHaveClass(/is-open/);

  await giftCard.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(mobileBar).toBeVisible();
  await mobileBar.click();
  await page.locator("#gift-checkout-button").click();
  await expect(page.locator("#gift-order-success")).toContainText("Presentes reservados com sucesso");
});

test("convite público permite pular presentes sem reserva", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Sem Presente ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id, {
    maxExtraGuests: 1
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#rsvp-panel")).toContainText("Confirmação pendente");
  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Clara Smoke");
  await page.locator("#companion-0-birth-date").fill("2018-01-01");
  await page.locator("#rsvp-submit-button").click();

  await expect(page.locator("#invitation-step-panel")).toContainText("Clique em Continuar para seguir para a etapa de presentes.");
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.locator("#gift-search-input")).toBeHidden();
  await page.locator("#invitation-complete-button").click();
  await expect(page.locator(".invitation-gift-icon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quero presentear" })).toBeVisible();
  await page.getByRole("button", { name: "Não vou presentear" }).click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Convite concluído");

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#invitation-return-menu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Presentear casal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Informações do evento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar/editar convidados extras" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar/cancelar presença" })).toBeVisible();

  await page.getByRole("button", { name: "Presentear casal" }).click();
  await expect(page).toHaveURL(new RegExp(`gifts\\.html\\?slug=${eventData.slug}$`));
  await expect(page.locator("#gift-grid")).toContainText("Nenhum presente");

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#invitation-return-menu")).toBeVisible();
  await page.getByRole("button", { name: "Informações do evento" }).click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Espaço Smoke");
  await page.getByRole("button", { name: "Voltar ao menu" }).click();

  await page.getByRole("button", { name: "Confirmar/cancelar presença" }).click();
  await expect(page.locator("#companion-0-name")).toHaveValue("Clara Smoke");
  await expect(page.locator("#companion-0-birth-date")).toHaveValue("2018-01-01");
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#rsvp-status")).toContainText(/Presen.a confirmada com sucesso\./);
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.name ?? ""}`;
  }).toBe("accepted:1:Clara Smoke");
});

test("convite público abre por slug e identifica convidado por CPF", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Convite ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id, {
    name: "Maria Souza",
    maxExtraGuests: 1
  });
  const notInvitedCpf = generateUniqueCpf();

  await page.goto("/event.html");
  await expect(page.locator("#invitation-flow-root")).toHaveAttribute("data-state", "missing-slug");
  await expect(page.locator("#invitation-step-panel")).toContainText("Link do convite");
  await expect(page.locator("#slug-input")).toHaveCount(0);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await expect(page.locator(".invitation-event-panel")).toHaveCount(0);
  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await expect(page.locator("#event-hosts")).toContainText("Ana e Bruno");
  await expect(page.locator("#invitation-guest-cpf-input")).toBeVisible();
  await expect(page.locator("#invitation-step-panel")).toContainText("Voc");

  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-guest-cpf-input")).toHaveClass(/input-invalid/);
  await expect(page.locator("#invitation-guest-cpf-input")).toBeFocused();

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(notInvitedCpf));
  await expect(page.locator("#invitation-identify-fields .field-error")).toContainText("Não foi possível consultar");
  await expect(page.locator("#invitation-guest-cpf-input")).toBeFocused();
  await expect(page.locator("#invitation-step-panel")).not.toContainText("Maria Souza");

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(guest.cpf));
  await expect(page.locator("#rsvp-panel")).toContainText("Maria Souza");
  await expect(page.locator("#invitation-guest-cpf-input")).toBeHidden();
  await expect(page.locator("#invitation-next-button")).toBeHidden();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.getByRole("button", { name: "OK" })).toHaveCount(0);
});

test("evento público permite consultar e atualizar RSVP", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento RSVP ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id, {
    name: "Maria Souza",
    maxExtraGuests: 2
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);

  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await expect(page.locator("#event-subtitle")).toContainText("Ana e Bruno");
  await expect(page.locator("#event-date")).toContainText("19:00");
  await expect(page.locator("#event-details")).toContainText("Espaço Smoke");

  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));

  await expect(page.locator("#invitation-guest-cpf-input")).toBeHidden();
  await expect(page.locator("#invitation-next-button")).toBeHidden();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.getByRole("button", { name: "OK" })).toHaveCount(0);
  await expect(page.locator("#invitation-step-panel")).toContainText("Confirme sua presença");
  await expect(page.locator("#rsvp-panel")).toContainText("Confirmação pendente");
  await expect(page.locator("#rsvp-panel")).toContainText("Acompanhantes permitidos: 2");

  await expect(page.getByLabel("Quantidade de acompanhantes")).toHaveAttribute("max", "2");
  await page.getByLabel("Quantidade de acompanhantes").fill("3");
  await expect(page.getByLabel("Quantidade de acompanhantes")).toHaveValue("2");
  await expect(page.locator(".rsvp-companion-card")).toHaveCount(2);
  const companionInputOffset = await page.locator(".rsvp-companion-card").first().evaluate((card) => {
    const birthDate = card.querySelector('[data-companion-field="birthDate"]').getBoundingClientRect();
    const cpf = card.querySelector('[data-companion-field="cpf"]').getBoundingClientRect();
    return Math.abs(birthDate.top - cpf.top);
  });
  expect(companionInputOffset).toBeLessThanOrEqual(1);
  await page.getByLabel("Quantidade de acompanhantes").fill("0");

  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Pedro Souza");
  await page.locator("#companion-0-birth-date").fill("2018-01-01");
  await expect(page.locator("[data-companion-cpf-help]")).toContainText("CPF opcional");

  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Carlos Souza");
  await page.locator("#companion-0-birth-date").fill("1990-01-01");
  await expect(page.locator("[data-companion-cpf-help]")).toContainText("CPF obrig");
  await page.locator("#companion-0-cpf").fill("");
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#companion-0-cpf")).toHaveClass(/input-invalid/);
  await expect(page.locator("#companion-0-cpf")).toBeFocused();
  await expect(page.locator("#companion-0-cpf-error")).toContainText("CPF do acompanhante 1");

  const adultCompanionCpf = generateUniqueCpf();
  await page.locator("#companion-0-cpf").fill(formatCpf(adultCompanionCpf));
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Clique em Continuar para seguir para a etapa de presentes.");
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.locator("#gift-search-input")).toBeHidden();
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.cpf ?? ""}`;
  }).toBe(`accepted:1:${adultCompanionCpf}`);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await expect(page.locator("#rsvp-panel")).toContainText(/Presen.a confirmada/);

  await page.getByLabel("Não poderei comparecer").check();
  await expect(page.locator("#rsvp-accepted-fields")).toBeHidden();
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Clique em Continuar para seguir para a etapa de presentes.");
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}`;
  }).toBe("declined:0");
});

async function seedAuthSession(page, loginPayload) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("wg_auth_session", JSON.stringify(session));
  }, loginPayload);
}
