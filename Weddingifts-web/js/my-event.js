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
const MAX_GIFT_NAME_LENGTH = 255;
const MAX_GIFT_DESCRIPTION_LENGTH = 255;

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const createGiftForm = document.getElementById("create-gift-form");
const eventSelect = document.getElementById("event-select");
const giftsList = document.getElementById("gifts-list");
const status = document.getElementById("status");
const giftNameInput = document.getElementById("gift-name-input");
const giftDescriptionInput = document.getElementById("gift-description-input");
const giftPriceInput = document.getElementById("gift-price-input");
const giftFormStatus = document.getElementById("gift-form-status");
const giftFormMode = document.getElementById("gift-form-mode");
const giftSubmitButton = document.getElementById("gift-submit-button");
const giftCancelEditButton = document.getElementById("gift-cancel-edit-button");

createGiftForm.noValidate = true;

const state = { events: [], selectedEventId: null, gifts: [], editingGiftId: null };

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

createGiftForm.addEventListener("submit", submitGiftForm);
giftCancelEditButton.addEventListener("click", () => {
  resetGiftFormMode();
  setStatus(status, "status-info", "Edição cancelada. Você pode adicionar um novo presente.");
});
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  resetGiftFormMode({ silent: true });
  await loadSelectedEventGifts();
});

giftPriceInput.addEventListener("input", () => {
  giftPriceInput.value = formatCurrencyInput(giftPriceInput.value);
});

giftNameInput.addEventListener("input", () => {
  if (giftNameInput.value.length > MAX_GIFT_NAME_LENGTH) {
    giftNameInput.value = giftNameInput.value.slice(0, MAX_GIFT_NAME_LENGTH);
  }
});

giftDescriptionInput.addEventListener("input", () => {
  if (giftDescriptionInput.value.length > MAX_GIFT_DESCRIPTION_LENGTH) {
    giftDescriptionInput.value = giftDescriptionInput.value.slice(0, MAX_GIFT_DESCRIPTION_LENGTH);
  }
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

async function submitGiftForm(event) {
  event.preventDefault();

  const eventId = Number(eventSelect.value);
  const name = document.getElementById("gift-name-input").value.trim();
  const description = document.getElementById("gift-description-input").value.trim();
  const rawPrice = giftPriceInput.value.trim();
  const price = parseCurrencyToNumber(rawPrice);
  const quantity = Number(document.getElementById("gift-quantity-input").value);
  const editing = state.editingGiftId !== null;

  if (!eventId) return setGiftFormError("Selecione um evento para continuar.");
  if (!name) return setGiftFormError("Informe o nome do presente.");
  if (name.length > MAX_GIFT_NAME_LENGTH) return setGiftFormError("O nome do presente deve ter no máximo 255 caracteres.");
  if (description.length > MAX_GIFT_DESCRIPTION_LENGTH) return setGiftFormError("A descrição do presente deve ter no máximo 255 caracteres.");
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
    giftSubmitButton.disabled = true;
    giftSubmitButton.textContent = "Salvando...";

    const apiBase = getApiBase();

    if (editing) {
      setGiftFormStatus("status-loading", "Atualizando presente...");
      await requestJson(`${apiBase}/api/events/${eventId}/gifts/${state.editingGiftId}`, {
        method: "PUT",
        headers: authHeaders(token, true),
        body: JSON.stringify({ name, description, price, quantity })
      });
      await loadSelectedEventGifts();
      resetGiftFormMode({ silent: true });
      setGiftFormStatus("status-success", "Presente atualizado com sucesso.");
      return;
    }

    setGiftFormStatus("status-loading", "Criando presente...");
    await requestJson(`${apiBase}/api/events/${eventId}/gifts`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, description, price, quantity })
    });

    createGiftForm.reset();
    giftPriceInput.value = "R$ 0,00";
    document.getElementById("gift-quantity-input").value = "1";
    eventSelect.value = String(state.selectedEventId || "");
    await loadSelectedEventGifts();
    await loadMyEvents();
    setGiftFormStatus("status-success", "Presente adicionado com sucesso.");
  } catch (error) {
    setGiftFormError(`Falha ao salvar presente: ${error.message}`);
  } finally {
    giftSubmitButton.disabled = false;
    giftSubmitButton.textContent = state.editingGiftId !== null ? "Salvar alterações" : "Adicionar presente";
  }
}

function startGiftEditMode(gift) {
  if (!state.selectedEventId) return;

  state.editingGiftId = gift.id;
  document.getElementById("gift-name-input").value = gift.name || "";
  document.getElementById("gift-description-input").value = gift.description || "";
  giftPriceInput.value = formatCurrency(Number(gift.price) || 0);
  document.getElementById("gift-quantity-input").value = String(gift.quantity || 1);
  giftSubmitButton.textContent = "Salvar alterações";
  giftCancelEditButton.hidden = false;
  showGiftFormMode(`Você está editando o presente "${gift.name}".`);
  setGiftFormStatus("status-info", "Modo de edição ativo. Salve para confirmar as alterações.");
  document.getElementById("gift-name-input").focus();
}

function resetGiftFormMode(options = {}) {
  const { silent = false } = options;

  state.editingGiftId = null;
  createGiftForm.reset();
  giftPriceInput.value = "R$ 0,00";
  document.getElementById("gift-quantity-input").value = "1";
  eventSelect.value = String(state.selectedEventId || "");
  giftSubmitButton.textContent = "Adicionar presente";
  giftCancelEditButton.hidden = true;
  hideGiftFormMode();

  if (!silent) {
    setGiftFormStatus("status-info", "Modo de criação ativo.");
  }
}

function showGiftFormMode(message) {
  if (!giftFormMode) return;
  giftFormMode.hidden = false;
  setStatus(giftFormMode, "status-info", message);
}

function hideGiftFormMode() {
  if (!giftFormMode) return;
  giftFormMode.hidden = true;
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

    if (state.editingGiftId === gift.id) {
      resetGiftFormMode({ silent: true });
    }

    await loadSelectedEventGifts();
    setGiftFormStatus("status-success", "Presente excluído com sucesso.");
  } catch (error) {
    setGiftFormError(`Falha ao excluir presente: ${error.message}`);
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
      startGiftEditMode(gift);
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
