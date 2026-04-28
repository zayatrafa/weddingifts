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
  const invitationMessage = "Estamos felizes em celebrar com voce no nosso grande dia.";

  await seedAuthSession(page, session.login);
  await page.goto("/create-event.html");

  await page.getByLabel("Nome do evento").fill(eventName);
  await page.getByLabel("Nomes do casal").fill("Ana e Bruno");
  await page.getByLabel("Data e hora").fill(futureDateTimeInputValue());
  await page.getByLabel("Fuso do evento").selectOption("America/Sao_Paulo");
  await page.getByLabel("Nome do local").fill("Espaco Smoke");
  await page.getByLabel("Endereço do local").fill("Rua Smoke, 123 - Sao Paulo, SP");
  await page.getByLabel("Link do Google Maps").fill("https://maps.google.com/?q=Espaco+Smoke");
  await page.getByLabel("Informações da cerimônia").fill("Cerimonia e recepcao no mesmo local.");
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
  const eventData = await createEvent(owner.token, {
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
    description: "Item para validar busca e ordenacao.",
    price: 450,
    quantity: 2
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);

  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "Consultar RSVP" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await page.getByRole("button", { name: "Continuar para presentes" }).click();

  await expect(page.locator("#gift-search-input")).toBeVisible();
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
  await giftCard.getByRole("button", { name: "Reservar" }).click();

  await expect(page.locator("#invitation-flow-status")).toContainText("Reserva realizada com sucesso.");
  await page.locator("[data-gift-filter='reserved']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("0 disponíveis | 1 reservados");

  await giftCard.getByRole("button", { name: "Cancelar reserva" }).click();

  await expect(page.locator("#invitation-flow-status")).toContainText("Reserva cancelada com sucesso.");
  await page.locator("[data-gift-filter='available']").click();
  await expect(giftCard.locator(".gift-meta")).toContainText("1 disponíveis | 0 reservados");

  await page.getByRole("button", { name: "Continuar sem presente" }).click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Esperamos voce la");
  await page.getByRole("button", { name: "Concluir convite" }).click();
  await expect(page.locator("#invitation-flow-status")).toContainText("Convite concluido");

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "Consultar RSVP" }).click();
  await expect(page.locator("#invitation-return-menu")).toBeVisible();
  await page.getByRole("button", { name: "Presentear casal" }).click();
  await expect(page.locator("#gift-search-input")).toBeVisible();
  const directGiftCard = page.locator("article.card.card-pad").filter({
    has: page.locator(".gift-name", { hasText: gift.name })
  }).first();
  await directGiftCard.getByRole("button", { name: "Reservar" }).click();
  await expect(page.locator("#invitation-flow-status")).toContainText("Reserva realizada com sucesso.");
});

test("convite publico permite pular presentes sem reserva", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEnrichedEvent(owner.token, {
    name: `Evento Sem Presente ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id, {
    maxExtraGuests: 1
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "Consultar RSVP" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Clara Smoke");
  await page.locator("#companion-0-birth-date").fill("2018-01-01");
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await page.getByRole("button", { name: "Continuar para presentes" }).click();

  await expect(page.locator("#gift-grid")).toContainText("Nenhum presente");
  await page.getByRole("button", { name: "Continuar sem presente" }).click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Esperamos voce la");
  await page.getByRole("button", { name: "Concluir convite" }).click();
  await expect(page.locator("#invitation-flow-status")).toContainText("Convite concluido");

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "Consultar RSVP" }).click();
  await expect(page.locator("#invitation-return-menu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Presentear casal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Informacoes do evento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar/editar convidados extras" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar/cancelar presenca" })).toBeVisible();

  await page.getByRole("button", { name: "Informacoes do evento" }).click();
  await expect(page.locator("#invitation-step-panel")).toContainText("Espaco Smoke");
  await page.getByRole("button", { name: "Voltar ao menu" }).click();

  await page.getByRole("button", { name: "Confirmar/cancelar presenca" }).click();
  await expect(page.locator("#companion-0-name")).toHaveValue("Clara Smoke");
  await expect(page.locator("#companion-0-birth-date")).toHaveValue("2018-01-01");
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect(page.locator("#rsvp-status")).toContainText(/Presen.a confirmada com sucesso\./);
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.name ?? ""}`;
  }).toBe("accepted:1:Clara Smoke");
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
  await expect(page.locator("#invitation-flow-root")).toHaveAttribute("data-state", "missing-slug");
  await expect(page.locator("#invitation-step-panel")).toContainText("Link do convite");
  await expect(page.locator("#slug-input")).toHaveCount(0);

  await page.goto(`/event.html?slug=${eventData.slug}`);
  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await expect(page.locator("#event-hosts")).toContainText("Ana e Bruno");
  await expect(page.locator("#invitation-guest-cpf-input")).toBeVisible();
  await expect(page.locator("#invitation-step-panel")).toContainText("Voc");

  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-flow-status")).toContainText("CPF valido");

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(notInvitedCpf));
  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-flow-status")).toContainText("Nao foi possivel consultar");
  await expect(page.locator("#invitation-step-panel")).not.toContainText("Maria Souza");

  await page.locator("#invitation-guest-cpf-input").fill(formatCpf(guest.cpf));
  await page.locator("#invitation-next-button").click();
  await expect(page.locator("#invitation-flow-status")).toContainText("Convite de Maria Souza carregado.");
  await expect(page.locator("#invitation-step-panel")).toContainText("Maria Souza");
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
  await expect(page.locator("#event-subtitle")).toContainText("Ana e Bruno");
  await expect(page.locator("#event-date")).toContainText("19:00");
  await expect(page.locator("#event-details")).toContainText("Espaco Smoke");

  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));
  await page.getByRole("button", { name: "Consultar RSVP" }).click();

  await expect(page.locator("#invitation-step-panel")).toContainText("Com alegria, convidamos voce para celebrar conosco.");
  await expect(page.locator("#rsvp-panel")).toBeHidden();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.locator("#rsvp-status")).toContainText("RSVP de Maria Souza carregado.");
  await expect(page.locator("#rsvp-panel")).toContainText("RSVP pendente");
  await expect(page.locator("#rsvp-panel")).toContainText("Acompanhantes permitidos: 2");

  await expect(page.getByLabel("Quantidade de acompanhantes")).toHaveAttribute("max", "2");
  await page.getByLabel("Quantidade de acompanhantes").fill("3");
  await expect(page.getByLabel("Quantidade de acompanhantes")).toHaveValue("2");
  await expect(page.locator(".rsvp-companion-card")).toHaveCount(2);
  await page.getByLabel("Quantidade de acompanhantes").fill("0");

  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect(page.locator("#rsvp-status")).toContainText(/Presen.a confirmada com sucesso\./);
  await expect(page.locator("#rsvp-panel")).toContainText(/Presen.a confirmada/);
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}`;
  }).toBe("accepted:0");

  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Pedro Souza");
  await page.locator("#companion-0-birth-date").fill("2018-01-01");
  await expect(page.locator("[data-companion-cpf-help]")).toContainText("CPF opcional");
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.cpf ?? ""}`;
  }).toBe("accepted:1:");

  await page.getByLabel("Quantidade de acompanhantes").fill("1");
  await page.locator("#companion-0-name").fill("Carlos Souza");
  await page.locator("#companion-0-birth-date").fill("1990-01-01");
  await expect(page.locator("[data-companion-cpf-help]")).toContainText("CPF obrig");
  await page.locator("#companion-0-cpf").fill("");
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect(page.locator("#rsvp-status")).toContainText("CPF do acompanhante 1");

  const adultCompanionCpf = generateUniqueCpf();
  await page.locator("#companion-0-cpf").fill(formatCpf(adultCompanionCpf));
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.cpf ?? ""}`;
  }).toBe(`accepted:1:${adultCompanionCpf}`);

  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect.poll(async () => {
    const rsvp = await getRsvp(eventData.slug, guest.cpf);
    return `${rsvp.rsvpStatus}:${rsvp.companions.length}:${rsvp.companions[0]?.cpf ?? ""}`;
  }).toBe(`accepted:1:${adultCompanionCpf}`);

  await page.getByLabel(/N.o poderei comparecer/).check();
  await expect(page.locator("#rsvp-accepted-fields")).toBeHidden();
  await page.getByRole("button", { name: "Enviar RSVP" }).click();
  await expect(page.locator("#rsvp-panel")).toContainText(/Presen.a recusada/);
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
