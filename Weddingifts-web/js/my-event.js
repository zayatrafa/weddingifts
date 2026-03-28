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
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const createGiftForm = document.getElementById("create-gift-form");
const eventSelect = document.getElementById("event-select");
const giftsList = document.getElementById("gifts-list");
const status = document.getElementById("status");
const giftPriceInput = document.getElementById("gift-price-input");
const giftFormStatus = document.getElementById("gift-form-status");

createGiftForm.noValidate = true;

const state = { events: [], selectedEventId: null, gifts: [] };

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

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
  }
}

async function createGift(event) {
  event.preventDefault();

  const submitButton = document.getElementById("gift-submit-button");
  const eventId = Number(eventSelect.value);
  const name = document.getElementById("gift-name-input").value.trim();
  const description = document.getElementById("gift-description-input").value.trim();
  const rawPrice = giftPriceInput.value.trim();
  const price = parseCurrencyToNumber(rawPrice);
  const quantity = Number(document.getElementById("gift-quantity-input").value);

  if (!eventId) return setGiftFormError("Selecione um evento para adicionar o presente.");
  if (!name) return setGiftFormError("Informe o nome do presente.");
  if (!rawPrice) return setGiftFormError("Informe o preço do presente.");

  if (!Number.isFinite(price) || price <= MIN_GIFT_PRICE) {
    return setGiftFormError("O preço deve ser maior que R$ 0,00.");
  }

  if (price >= MAX_GIFT_PRICE_EXCLUSIVE) {
    return setGiftFormError("O preço deve ser menor que R$ 1.000.000,00.");
  }

  if (!Number.isInteger(quantity) || quantity < MIN_GIFT_QUANTITY) {
    return setGiftFormError("A quantidade mínima é 1.");
  }

  if (quantity > MAX_GIFT_QUANTITY) {
    return setGiftFormError("A quantidade máxima é 100.000.");
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setGiftFormStatus("status-loading", "Criando presente...");

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
    setGiftFormStatus("status-success", "Presente adicionado com sucesso.");
  } catch (error) {
    setGiftFormError(`Falha ao criar presente: ${error.message}`);
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

async function editGift(gift) {
  if (!state.selectedEventId) return;

  const name = window.prompt("Nome do presente:", gift.name);
  if (name === null) return;

  const trimmedName = name.trim();
  if (!trimmedName) return setGiftFormError("Informe o nome do presente.");

  const description = window.prompt("Descrição do presente:", gift.description || "");
  if (description === null) return;

  const currentPrice = Number(gift.price) || 0;
  const pricePrompt = window.prompt("Preço (R$):", currentPrice.toFixed(2).replace(".", ","));
  if (pricePrompt === null) return;

  const price = parsePricePromptToNumber(pricePrompt);
  if (!Number.isFinite(price) || price <= MIN_GIFT_PRICE) {
    return setGiftFormError("O preço deve ser maior que R$ 0,00.");
  }

  if (price >= MAX_GIFT_PRICE_EXCLUSIVE) {
    return setGiftFormError("O preço deve ser menor que R$ 1.000.000,00.");
  }

  const quantityPrompt = window.prompt("Quantidade:", String(gift.quantity ?? 1));
  if (quantityPrompt === null) return;

  const quantity = Number(quantityPrompt);
  if (!Number.isInteger(quantity) || quantity < MIN_GIFT_QUANTITY) {
    return setGiftFormError("A quantidade mínima é 1.");
  }

  if (quantity > MAX_GIFT_QUANTITY) {
    return setGiftFormError("A quantidade máxima é 100.000.");
  }

  try {
    setGiftFormStatus("status-loading", "Atualizando presente...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts/${gift.id}`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify({
        name: trimmedName,
        description: description.trim(),
        price,
        quantity
      })
    });

    await loadSelectedEventGifts();
    setGiftFormStatus("status-success", "Presente atualizado com sucesso.");
  } catch (error) {
    setGiftFormError(`Falha ao atualizar presente: ${error.message}`);
  }
}

async function deleteGift(gift) {
  if (!state.selectedEventId) return;

  const confirmed = window.confirm(`Tem certeza que deseja excluir o presente "${gift.name}"?`);
  if (!confirmed) return;

  try {
    setGiftFormStatus("status-loading", "Excluindo presente...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts/${gift.id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    });

    await loadSelectedEventGifts();
    setGiftFormStatus("status-success", "Presente excluído com sucesso.");
  } catch (error) {
    setGiftFormError(`Falha ao excluir presente: ${error.message}`);
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
      <button class="icon-button danger gift-delete" type="button" title="Excluir presente" aria-label="Excluir presente">${trashIconSvg()}</button>
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(gift.name)}</h3>
          <p class="meta">${escapeHtml(gift.description || "Sem descrição")}</p>
        </div>
        <span class="tag ${badgeClass}">${badgeText}</span>
      </div>
      <p class="meta">${formatCurrency(gift.price)} | ${available} disponíveis | ${gift.reservedQuantity || 0} reservados</p>
      <div class="row row-tight top-gap-sm">
        <button class="btn btn-secondary gift-edit" type="button">Editar presente</button>
      </div>
    `;

    item.querySelector(".gift-edit")?.addEventListener("click", () => {
      editGift(gift);
    });

    item.querySelector(".gift-delete")?.addEventListener("click", () => {
      deleteGift(gift);
    });

    giftsList.appendChild(item);
  });
}

function parseCurrencyToNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

function parsePricePromptToNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const normalized = raw
    .replaceAll("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return parseCurrencyToNumber(raw);
}

function formatCurrencyInput(value) {
  const amount = parseCurrencyToNumber(value);
  return formatCurrency(amount);
}

function setGiftFormError(message) {
  setGiftFormStatus("status-error", message);
}

function setGiftFormStatus(type, message) {
  if (giftFormStatus) {
    giftFormStatus.hidden = false;
    setStatus(giftFormStatus, type, message);
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function trashIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M10 3h4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `;
}

