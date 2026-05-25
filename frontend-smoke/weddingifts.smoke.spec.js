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
  reserveGift,
  updateRsvp,
  uniqueSuffix
} from "./support/api-helpers.js";

test("login valido autentica e redireciona para o fluxo privado", async ({ page }) => {
  const user = await createUser();

  await page.goto("/login.html");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/create-event\.html$/);
  await expect(page.getByRole("heading", { name: "Crie e publique o seu evento" })).toBeVisible();
  await expect(page.locator("#user-menu-button")).toBeVisible();
});

test("create-event cria evento com campos publicos e redireciona para meus eventos", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const eventName = `Evento Smoke ${uniqueSuffix()}`;
  const invitationMessage = "Estamos felizes em celebrar com voce no nosso grande dia.";
  const foodInfo = "Jantar completo, mesa de doces e bebidas sem alcool.";
  const scheduleInfo = "Cerimonia as 17h, jantar as 19h e pista de danca as 21h.";
  const galleryUrl = "https://cdn.example.com/galeria/foto-1.jpg";

  await seedAuthSession(page, session.login);
  await page.goto("/create-event.html");

  await page.getByLabel("Nome do evento").fill(eventName);
  await page.getByLabel("Nomes do casal").fill("Ana e Bruno");
  await page.getByLabel("Data e hora").fill(futureDateTimeInputValue());
  await page.getByLabel("Fuso do evento").selectOption("America/Sao_Paulo");
  await page.getByLabel("Nome do local").fill("Espaco Smoke");
  await page.getByLabel("Endere\u00e7o do local").fill("Rua Smoke, 123 - Sao Paulo, SP");
  await page.getByLabel("Link do Google Maps").fill("https://maps.google.com/?q=Espaco+Smoke");
  await page.getByLabel("Informa\u00e7\u00f5es da cerim\u00f4nia").fill("Cerimonia e recepcao no mesmo local.");
  await page.getByLabel("Traje").fill("Esporte fino");
  await page.getByLabel("Mensagem do convite").fill(invitationMessage);
  await page.getByLabel("Comida e bebida").fill(foodInfo);
  await page.getByLabel("Programação do evento").fill(scheduleInfo);
  await page.getByLabel("Galeria de fotos").fill(galleryUrl);
  await expect(page.getByLabel("URL da imagem de capa")).not.toHaveAttribute("required", "");
  await page.getByRole("button", { name: "Criar evento" }).click();

  await page.waitForURL(/my-events\.html\?focusEventId=\d+/);
  await expect(page.locator(".event-title", { hasText: eventName })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: invitationMessage })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: foodInfo })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: scheduleInfo })).toBeVisible();
  await expect(page.locator(".my-event-details", { hasText: galleryUrl })).toBeVisible();

  await page.getByRole("button", { name: "Editar evento" }).click();
  await expect(page.getByLabel("Mensagem do convite")).toHaveValue(invitationMessage);
  await expect(page.getByLabel("Comida e bebida")).toHaveValue(foodInfo);
  await expect(page.getByLabel("Programação do evento")).toHaveValue(scheduleInfo);
  await expect(page.getByLabel("Galeria de fotos")).toHaveValue(galleryUrl);
});

test("my-events carrega eventos do usuario e mantem acoes principais funcionais", async ({ page }) => {
  const session = await createAuthenticatedSession();
  const eventName = `Evento Listagem ${uniqueSuffix()}`;
  const eventData = await createEvent(session.token, { name: eventName });
  const acceptedGuest = await createGuest(session.token, eventData.id, {
    name: "Convidado Confirmado",
    maxExtraGuests: 2
  });
  const declinedGuest = await createGuest(session.token, eventData.id, { name: "Convidado Recusado" });
  await createGuest(session.token, eventData.id, { name: "Convidado Pendente" });
  const reservedGift = await createGift(session.token, eventData.id, {
    name: `Presente Reservado ${uniqueSuffix()}`,
    quantity: 1
  });
  const partialGift = await createGift(session.token, eventData.id, {
    name: `Presente Parcial ${uniqueSuffix()}`,
    quantity: 2
  });

  await updateRsvp(eventData.slug, acceptedGuest.cpf, "accepted", {
    companions: [
      { name: "Acompanhante Um", birthDate: "2018-01-10", cpf: null },
      { name: "Acompanhante Dois", birthDate: "2019-02-20", cpf: null }
    ]
  });
  await updateRsvp(eventData.slug, declinedGuest.cpf, "declined");
  await reserveGift(reservedGift.id, acceptedGuest.cpf);
  await reserveGift(partialGift.id, declinedGuest.cpf);

  await seedAuthSession(page, session.login);
  await page.goto("/my-events.html");

  const eventCard = page.locator(".my-event-card", { hasText: eventName });
  await expect(eventCard.locator(".event-title", { hasText: eventName })).toBeVisible();
  const statusSummary = eventCard.locator(".my-event-status-summary");
  await expect(statusSummary).toContainText("3 convidados");
  await expect(statusSummary).toContainText("2 acompanhantes");
  await expect(statusSummary).toContainText("1 confirmados");
  await expect(statusSummary).toContainText("1 recusados");
  await expect(statusSummary).toContainText("1 pendentes");
  await expect(statusSummary).toContainText("2 presentes reservados");
  await expect(statusSummary).toContainText(/1 presentes dispon.ve(is|Ã­veis)/);
  await expect(eventCard).not.toContainText("NaN");
  await expect(eventCard).not.toContainText("undefined");
  await expect(eventCard.locator(".my-event-meta")).toHaveText(new RegExp(`Slug:\\s*${eventData.slug}$`));
  await expect(page.getByRole("button", { name: "Convidados" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Presentes" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Hist.rico de reservas/ })).toBeVisible();

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desktopOverflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 800 });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(mobileOverflow).toBeLessThanOrEqual(1);

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
    coverImageUrl: `https://cdn.example.com/capas/${longUrlTail}foto.jpg`,
    foodInfo: "Jantar com menu completo e opcoes sem lactose.",
    scheduleInfo: "Cerimonia, jantar, brinde e pista de danca.",
    galleryImageUrls: [`https://cdn.example.com/fotos/${longUrlTail}foto-1.jpg`]
  });

  await seedAuthSession(page, session.login);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/my-event.html?eventId=${eventData.id}`);

  const summary = page.locator("#selected-event-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Evento selecionado");
  await expect(summary).toContainText("Comida e bebida");
  await expect(summary).toContainText("Programação");
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
  expect(desktopMetrics.summaryHeight).toBeLessThanOrEqual(250);
  expect(desktopMetrics.dashboardTop).toBeLessThanOrEqual(600);
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
  await page.getByRole("button", { name: /Salvar altera/ }).click();

  await expect(guestCard).toContainText("Acompanhantes: 1");
  await expect.poll(async () => {
    const guests = await getGuests(session.token, eventData.id);
    return guests.find((guest) => guest.cpf === guestCpf)?.maxExtraGuests;
  }).toBe(1);
});

test("evento publico mostra hub antes do CPF e permite presentear em pagina separada", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const galleryUrl = "https://cdn.example.com/galeria/casal-1.jpg";
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Publico ${uniqueSuffix()}`,
    foodInfo: "Jantar completo e mesa de doces.",
    scheduleInfo: "Cerimonia as 17h e recepcao as 19h.",
    galleryImageUrls: [galleryUrl]
  });
  const guest = await createGuest(owner.token, eventData.id);
  const gift = await createGift(owner.token, eventData.id, {
    name: `Presente Publico ${uniqueSuffix()}`,
    price: 150,
    quantity: 1
  });
  const secondGift = await createGift(owner.token, eventData.id, {
    name: `Outro Presente ${uniqueSuffix()}`,
    description: "Item para validar busca e ordenacao.",
    price: 450,
    quantity: 2
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/event.html?slug=${eventData.slug}`);

  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await expect(page.locator("#event-hosts")).toContainText("Ana e Bruno");
  await expect(page.locator("#event-details")).toContainText("Espaço Smoke");
  await expect(page.locator("#event-details")).not.toContainText("Fuso");
  await expect(page.locator("#event-details")).not.toContainText("UTC-03");
  await expect(page.locator("#event-food-section")).toContainText("Jantar completo");
  await expect(page.locator("#event-schedule-section")).toContainText("Cerimonia as 17h");
  await expect(page.locator("#event-gallery img")).toHaveAttribute("src", galleryUrl);
  await expect(page.locator("#invitation-flow-root")).toBeHidden();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#open-rsvp-button .btn-icon")).toBeVisible();
  await expect(page.locator("#open-gifts-button .btn-icon")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByLabel("CPF do convidado").press("Enter");
  await expect(page.locator("#rsvp-panel")).toContainText("Confirmação pendente");
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#rsvp-panel")).toBeHidden();
  await expect(page.locator(".rsvp-result-message")).toContainText("Obrigado por confirmar presença.");

  await page.locator("#open-gifts-button").click();
  await expect(page).toHaveURL(new RegExp(`gifts\\.html\\?slug=${eventData.slug}$`));
  await expect(page.locator("#gift-search-input")).toBeVisible();
  await expect(page.locator("#gift-cart-panel")).not.toContainText("Voltar ao convite");

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
  const removeButtonState = await giftCard.getByRole("button", { name: "Retirar escolha" }).evaluate((button) => ({
    cursor: getComputedStyle(button).cursor,
    disabled: button.disabled
  }));
  expect(removeButtonState.disabled).toBe(true);
  expect(removeButtonState.cursor).not.toBe("wait");
  await giftCard.getByRole("button", { name: "Presentear com este item" }).click();

  await expect(page.locator("#public-gifts-status")).toContainText("Presente escolhido.");
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);
  await page.locator("[data-gift-filter='reserved']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("0 disponíveis | 1 escolhido");

  await giftCard.getByRole("button", { name: "Retirar escolha" }).click();

  await expect(page.locator("#public-gifts-status")).toContainText("Presente retirado.");
  await expect(page.locator("#gift-cart-panel")).toContainText("Nenhum presente escolhido ainda");
  await page.locator("[data-gift-filter='available']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("1 disponível | 0 escolhidos");

  await giftCard.getByRole("button", { name: "Presentear com este item" }).click();
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);
  await page.locator("#gift-checkout-button").click();
  await expect(page.locator("#gift-order-success")).toContainText("Presentes registrados com sucesso");

  await page.evaluate(() => sessionStorage.removeItem("wg_public_gift_context"));
  await page.goto(`/gifts.html?slug=${eventData.slug}`);
  await expect(page.locator("#gift-guest-identification")).toBeVisible();
  await expect(page.locator("#gift-identify-back-link")).toHaveAttribute("href", `./event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByLabel("CPF do convidado").press("Enter");
  await expect(page.locator("#gift-search-input")).toBeVisible();
});

test("lista de presentes usa selecao mobile em gaveta", async ({ page }) => {
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

  await giftCard.getByRole("button", { name: "Presentear com este item" }).click();
  await expect(page.locator("#public-gifts-status")).toContainText("Presente escolhido.");

  const mobileBar = page.locator("#gift-cart-mobile-bar");
  await expect(mobileBar).toBeVisible();
  await expect(mobileBar).toContainText("1 presente");
  await mobileBar.click();
  await expect(page.locator("#gift-cart-mobile-overlay")).toBeVisible();
  await expect(page.locator("#gift-cart-panel")).toHaveClass(/is-open/);
  await expect(page.locator("#gift-cart-panel")).toContainText(gift.name);

  await page.locator("#gift-cart-panel [data-cart-remove-gift-id]").click();
  await expect(page.locator("#public-gifts-status")).toContainText("Presente retirado.");
  await expect(mobileBar).toBeHidden();
  await expect(page.locator("#gift-cart-panel")).not.toHaveClass(/is-open/);

  await giftCard.getByRole("button", { name: "Presentear com este item" }).click();
  await expect(mobileBar).toBeVisible();
  await mobileBar.click();
  await page.locator("#gift-checkout-button").click();
  await expect(page.locator("#gift-order-success")).toContainText("Presentes registrados com sucesso");
});

test("convite publico permite confirmar presenca com acompanhante e voltar ao presente", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Sem Presente ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id, {
    maxExtraGuests: 1
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await expect(page.locator("#event-details")).toContainText("Espaço Smoke");
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("#rsvp-panel")).toContainText("Confirmação pendente");
  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Clara Smoke");
  await page.locator("#companion-0-birth-date").fill("2018-01-01");
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#rsvp-panel")).toBeHidden();
  await expect(page.locator(".rsvp-result-message")).toContainText("Obrigado por confirmar presença.");
  await expect(page.locator("#gift-search-input")).toHaveCount(0);

  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.name ?? ""}`;
  }).toBe("accepted:1:Clara Smoke");

  await page.locator("#open-gifts-button").click();
  await expect(page).toHaveURL(new RegExp(`gifts\\.html\\?slug=${eventData.slug}$`));
  await expect(page.locator("#gift-grid")).toContainText("Nenhum presente");

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("#companion-0-name")).toHaveValue("Clara Smoke");
  await expect(page.locator("#companion-0-birth-date")).toHaveValue("2018-01-01");
});

test("convite publico abre por slug e identifica convidado por CPF", async ({ page }) => {
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
  await expect(page.locator("#public-event-root")).toHaveAttribute("data-state", "missing-slug");
  await expect(page.locator("#invitation-flow-status")).toContainText("Abra o convite pelo link enviado");
  await expect(page.locator("#slug-input")).toHaveCount(0);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await expect(page.locator("#event-hosts")).toContainText("Ana e Bruno");
  await expect(page.locator("#invitation-flow-root")).toBeHidden();

  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(page.locator("#invitation-guest-cpf-input")).toBeVisible();
  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-guest-cpf-input")).toHaveClass(/input-invalid/);
  await expect(page.locator("#invitation-guest-cpf-input")).toBeFocused();

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(notInvitedCpf));
  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-identify-fields .field-error")).toContainText("Não foi possível consultar");
  await expect(page.locator("#invitation-guest-cpf-input")).toBeFocused();
  await expect(page.locator("#invitation-step-panel")).not.toContainText("Maria Souza");
  const identifyMetrics = await page.evaluate(() => {
    const input = document.querySelector("#invitation-guest-cpf-input").getBoundingClientRect();
    const button = document.querySelector("#invitation-next-button").getBoundingClientRect();

    return {
      buttonInputTopOffset: Math.abs(button.top - input.top),
      inputWidth: input.width
    };
  });
  expect(identifyMetrics.inputWidth).toBeLessThanOrEqual(270);
  expect(identifyMetrics.buttonInputTopOffset).toBeLessThanOrEqual(8);

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(guest.cpf));
  await page.locator("#invitation-guest-cpf-input").press("Enter");
  await expect(page.locator("#rsvp-panel")).toContainText("Maria Souza");
  await expect(page.locator("#invitation-identify-fields")).toBeHidden();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
});

test("evento publico permite consultar e atualizar RSVP", async ({ page }) => {
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
  await expect(page.locator("#event-hosts")).toContainText("Ana e Bruno");
  await expect(page.locator("#event-date")).toContainText("19:00");
  await expect(page.locator("#event-details")).toContainText("Espaço Smoke");

  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.locator("#invitation-identify-fields")).toBeHidden();
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await expect(page.locator("#invitation-step-panel")).toContainText("confirme sua resposta");
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
  await expect(page.locator("#rsvp-panel")).toBeHidden();
  await expect(page.locator(".rsvp-result-message")).toContainText("Obrigado por confirmar presença.");
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
  await expect(page.locator("#gift-search-input")).toHaveCount(0);
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.cpf ?? ""}`;
  }).toBe(`accepted:1:${adultCompanionCpf}`);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("#rsvp-panel")).toContainText(/Presen.a confirmada/);

  await page.getByLabel("Não poderei comparecer").check();
  await expect(page.locator("#rsvp-accepted-fields")).toBeHidden();
  await page.locator("#rsvp-submit-button").click();
  await expect(page.locator("#rsvp-panel")).toBeHidden();
  await expect(page.locator(".rsvp-result-message")).toContainText("Sentiremos sua falta.");
  await expect(page.locator("#invitation-flow-status")).toBeHidden();
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
