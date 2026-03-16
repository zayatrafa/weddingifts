import {
  authHeaders,
  clearAuthSession,
  formatCurrency,
  getApiBase,
  initUserDropdown,
  requestJson,
  requireAuth,
  setStatus
} from "./common.js";

const MIN_GIFT_PRICE = 0;
const MAX_GIFT_PRICE_EXCLUSIVE = 1_000_000;
const MIN_GIFT_QUANTITY = 1;
const MAX_GIFT_QUANTITY = 100_000;

const session = requireAuth();
if (!session) throw new Error("Authentication required.");

const token = session.token;
const refreshEventsButton = document.getElementById("refresh-events-button");
const createGiftForm = document.getElementById("create-gift-form");
const eventSelect = document.getElementById("event-select");
const giftsList = document.getElementById("gifts-list");
const status = document.getElementById("status");
const giftPriceInput = document.getElementById("gift-price-input");

const state = { events: [], selectedEventId: null, gifts: [] };

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

refreshEventsButton.addEventListener("click", loadMyEvents);
createGiftForm.addEventListener("submit", createGift);
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  await loadSelectedEventGifts();
});

giftPriceInput.addEventListener("input", () => {
  giftPriceInput.value = formatCurrencyInput(giftPriceInput.value);
});

giftPriceInput.addEventListener("blur", () => {
  giftPriceInput.value = formatCurrencyInput(giftPriceInput.value);
});

loadMyEvents();

async function loadMyEvents() {
  const query = new URLSearchParams(window.location.search);
  const queryEventId = Number(query.get("eventId"));

  try {
    refreshEventsButton.disabled = true;
    setStatus(status, "status-loading", "Carregando seus eventos...");

    const apiBase = getApiBase();
    state.events = await requestJson(`${apiBase}/api/events/mine`, { headers: authHeaders(token) });

    if (!state.events.length) {
      state.selectedEventId = null;
      state.gifts = [];
      renderGiftSelect();
      renderGifts();
      setStatus(status, "status-info", "Você ainda não possui eventos. Crie um evento primeiro.");
      return;
    }

    const canUseQueryEvent = Number.isInteger(queryEventId) && state.events.some((event) => event.id === queryEventId);
    state.selectedEventId = canUseQueryEvent
      ? queryEventId
      : (state.events.some((event) => event.id === state.selectedEventId) ? state.selectedEventId : state.events[0].id);

    renderGiftSelect();
    await loadSelectedEventGifts();
    setStatus(status, "status-success", "Eventos carregados com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao carregar eventos: ${error.message}`);
  } finally {
    refreshEventsButton.disabled = false;
  }
}

async function createGift(event) {
  event.preventDefault();

  const submitButton = document.getElementById("gift-submit-button");
  const eventId = Number(eventSelect.value);
  const name = document.getElementById("gift-name-input").value.trim();
  const description = document.getElementById("gift-description-input").value.trim();
  const price = parseCurrencyToNumber(giftPriceInput.value);
  const quantity = Number(document.getElementById("gift-quantity-input").value);

  if (!eventId) return setStatus(status, "status-error", "Selecione um evento para adicionar o presente.");
  if (!name) return setStatus(status, "status-error", "Informe o nome do presente.");

  if (!Number.isFinite(price) || price <= MIN_GIFT_PRICE) {
    return setStatus(status, "status-error", "O preço deve ser maior que R$ 0,00.");
  }

  if (price >= MAX_GIFT_PRICE_EXCLUSIVE) {
    return setStatus(status, "status-error", "O preço deve ser menor que R$ 1.000.000,00.");
  }

  if (!Number.isInteger(quantity) || quantity < MIN_GIFT_QUANTITY) {
    return setStatus(status, "status-error", "A quantidade mínima é 1.");
  }

  if (quantity > MAX_GIFT_QUANTITY) {
    return setStatus(status, "status-error", "A quantidade máxima é 100.000.");
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setStatus(status, "status-loading", "Criando presente...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${eventId}/gifts`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, description, price, quantity })
    });

    createGiftForm.reset();
    giftPriceInput.value = "R$ 0,00";
    document.getElementById("gift-quantity-input").value = "1";
    await loadSelectedEventGifts();
    await loadMyEvents();
    setStatus(status, "status-success", "Presente adicionado com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao criar presente: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Adicionar presente";
  }
}

async function loadSelectedEventGifts() {
  if (!state.selectedEventId) {
    state.gifts = [];
    renderGifts();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.gifts = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts`);
    renderGifts();
  } catch (error) {
    state.gifts = [];
    renderGifts();
    setStatus(status, "status-error", `Falha ao carregar presentes: ${error.message}`);
  }
}

function renderGiftSelect() {
  const options = ['<option value="">Selecione um evento</option>'];

  state.events.forEach((event) => {
    const selected = event.id === state.selectedEventId ? " selected" : "";
    options.push(`<option value="${event.id}"${selected}>${escapeHtml(event.name)}</option>`);
  });

  eventSelect.innerHTML = options.join("");
}

function renderGifts() {
  if (!state.selectedEventId) {
    giftsList.innerHTML = '<div class="center-empty">Selecione um evento para visualizar os presentes.</div>';
    return;
  }

  if (!state.gifts.length) {
    giftsList.innerHTML = '<div class="center-empty">Nenhum presente cadastrado para este evento.</div>';
    return;
  }

  giftsList.innerHTML = "";

  state.gifts.forEach((gift) => {
    const item = document.createElement("article");
    item.className = "gift-item";

    const available = typeof gift.availableQuantity === "number"
      ? gift.availableQuantity
      : Math.max(0, gift.quantity - (gift.reservedQuantity || 0));

    const badgeClass = available === 0 ? "tag-muted" : available === 1 ? "tag-warning" : "tag-ok";
    const badgeText = available === 0 ? "Reservado" : available === 1 ? "Última unidade" : "Disponível";

    item.innerHTML = `
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(gift.name)}</h3>
          <p class="meta">${escapeHtml(gift.description || "Sem descrição")}</p>
        </div>
        <span class="tag ${badgeClass}">${badgeText}</span>
      </div>
      <p class="meta">${formatCurrency(gift.price)} | ${available} disponíveis | ${gift.reservedQuantity || 0} reservados</p>
    `;

    giftsList.appendChild(item);
  });
}

function parseCurrencyToNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatCurrencyInput(value) {
  const amount = parseCurrencyToNumber(value);
  return formatCurrency(amount);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
