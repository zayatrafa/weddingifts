import { test, expect } from "@playwright/test";
import {
  createAuthenticatedSession,
  createEvent,
  createGift,
  createGuest,
  createUser,
  formatCpf,
  futureDateInputValue,
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

  await seedAuthSession(page, session.login);
  await page.goto("/create-event.html");

  await page.getByLabel("Nome do evento").fill(eventName);
  await page.getByLabel("Data").fill(futureDateInputValue());
  await page.getByRole("button", { name: "Criar evento" }).click();

  await page.waitForURL(/my-events\.html\?focusEventId=\d+/);
  await expect(page.locator(".event-title", { hasText: eventName })).toBeVisible();
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

test("evento público permite reservar e cancelar reserva sem quebra do fluxo", async ({ page }) => {
  const owner = await createAuthenticatedSession();
  const eventData = await createEvent(owner.token, {
    name: `Evento Público ${uniqueSuffix()}`
  });
  const guest = await createGuest(owner.token, eventData.id);
  const gift = await createGift(owner.token, eventData.id, {
    name: `Presente Público ${uniqueSuffix()}`,
    quantity: 1
  });

  await page.goto(`/event.html?slug=${eventData.slug}`);

  await expect(page.locator("#event-title")).toHaveText(eventData.name);
  await page.getByLabel("CPF do convidado").fill(formatCpf(guest.cpf));

  const giftCard = page.locator("article.card.card-pad").filter({
    has: page.locator(".gift-name", { hasText: gift.name })
  }).first();

  await expect(giftCard).toBeVisible();
  await giftCard.getByRole("button", { name: "Reservar" }).click();

  await expect(page.locator("#status")).toContainText("Reserva realizada com sucesso.");
  await expect(giftCard.locator(".gift-meta")).toContainText("0 disponíveis | 1 reservados");

  await giftCard.getByRole("button", { name: "Cancelar reserva" }).click();

  await expect(page.locator("#status")).toContainText("Reserva cancelada com sucesso.");
  await expect(giftCard.locator(".gift-meta")).toContainText("1 disponíveis | 0 reservados");
});

async function seedAuthSession(page, loginPayload) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("wg_auth_session", JSON.stringify(session));
  }, loginPayload);
}
