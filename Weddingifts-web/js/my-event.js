import {
  authHeaders,
  clearAuthSession,
  formatCurrency,
  formatDateTime,
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
const MAX_GIFT_DESCRIPTION_LENGTH = 120;

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const createGiftForm = document.getElementById("create-gift-form");
const eventSelect = document.getElementById("event-select");
const giftsList = document.getElementById("gifts-list");
const reservationsList = document.getElementById("reservations-list");
const status = document.getElementById("status");
const giftNameInput = document.getElementById("gift-name-input");
const giftDescriptionInput = document.getElementById("gift-description-input");
const giftPriceInput = document.getElementById("gift-price-input");
const giftFormStatus = ensureGiftFormStatusElement();
const giftFormTitle = document.getElementById("gift-form-title");
const giftSubmitButton = document.getElementById("gift-submit-button");
const giftCancelEditButton = document.getElementById("gift-cancel-edit-button");
const ICON_GIFT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';
const ICON_SAVE = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5V4zm2 2v12h10V8.2L15.2 6H7zm2 6h6v6H9v-6z" fill="currentColor"/></svg></span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_EDIT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.05-9.06.92.92-9.05 9.06zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.49 1.5 3.75 3.75 1.49-1.5z" fill="currentColor"/></svg></span>';

createGiftForm.noValidate = true;

const state = { events: [], selectedEventId: null, gifts: [], reservations: [], guests: [], editingGiftId: null };

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
  await reloadSelectedEventData();
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

syncGiftEditUi();
setGiftSubmitButtonLabel(state.editingGiftId !== null ? "Salvar alterações" : "Adicionar presente", state.editingGiftId !== null ? ICON_SAVE : ICON_GIFT);
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
      state.reservations = [];
      state.guests = [];
      renderGiftSelect();
      renderGifts();
      renderReservations();
      setStatus(status, "status-info", "Você ainda não possui eventos. Crie um evento primeiro.");
      return;
    }

    const canUseQueryEvent = Number.isInteger(queryEventId) && state.events.some((event) => event.id === queryEventId);
    state.selectedEventId = canUseQueryEvent
      ? queryEventId
      : (state.events.some((event) => event.id === state.selectedEventId) ? state.selectedEventId : state.events[0].id);

    renderGiftSelect();
    await reloadSelectedEventData();
    setStatus(status, "status-success", "Eventos carregados com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Não foi possível carregar seus eventos: ${error.message}`);
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
  if (description.length > MAX_GIFT_DESCRIPTION_LENGTH) return setGiftFormError("A descrição do presente deve ter no máximo 120 caracteres.");
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
    setGiftSubmitButtonLabel("Salvando...", ICON_SPINNER);

    const apiBase = getApiBase();

    if (editing) {
      setGiftFormStatus("status-loading", "Atualizando presente...");
      await requestJson(`${apiBase}/api/events/${eventId}/gifts/${state.editingGiftId}`, {
        method: "PUT",
        headers: authHeaders(token, true),
        body: JSON.stringify({ name, description, price, quantity })
      });
      await reloadSelectedEventData();
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
    await reloadSelectedEventData();
    await loadMyEvents();
    setGiftFormStatus("status-success", "Presente adicionado com sucesso.");
  } catch (error) {
    setGiftFormError(`Não foi possível salvar o presente: ${error.message}`);
  } finally {
    giftSubmitButton.disabled = false;
    setGiftSubmitButtonLabel(
      state.editingGiftId !== null ? "Salvar alterações" : "Adicionar presente",
      state.editingGiftId !== null ? ICON_SAVE : ICON_GIFT
    );
  }
}

function startGiftEditMode(gift) {
  if (!state.selectedEventId) return;

  state.editingGiftId = gift.id;
  document.getElementById("gift-name-input").value = gift.name || "";
  document.getElementById("gift-description-input").value = gift.description || "";
  giftPriceInput.value = formatCurrency(Number(gift.price) || 0);
  document.getElementById("gift-quantity-input").value = String(gift.quantity || 1);
  setGiftSubmitButtonLabel("Salvar alterações", ICON_SAVE);
  syncGiftEditUi();
  giftFormTitle.textContent = `Você está editando o presente "${gift.name}".`;
  document.getElementById("gift-name-input").focus();
}

function resetGiftFormMode(options = {}) {
  const { silent = false } = options;

  state.editingGiftId = null;
  createGiftForm.reset();
  giftPriceInput.value = "R$ 0,00";
  document.getElementById("gift-quantity-input").value = "1";
  eventSelect.value = String(state.selectedEventId || "");
  setGiftSubmitButtonLabel("Adicionar presente", ICON_GIFT);
  syncGiftEditUi();
  giftFormTitle.textContent = "Adicionar presente";
}

function syncGiftEditUi() {
  const isEditing = state.editingGiftId !== null;
  giftCancelEditButton.hidden = !isEditing;
  giftCancelEditButton.style.display = isEditing ? "" : "none";
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

    await reloadSelectedEventData();
    setGiftFormStatus("status-success", "Presente excluído com sucesso.");
  } catch (error) {
    setGiftFormError(`Não foi possível excluir o presente: ${error.message}`);
  }
}

async function loadSelectedEventGifts() {
  if (!state.selectedEventId) {
    state.gifts = [];
    renderGifts();
    state.reservations = [];
    state.guests = [];
    renderReservations();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.gifts = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts`);
    renderGifts();
  } catch (error) {
    state.gifts = [];
    renderGifts();
    setStatus(status, "status-error", `Não foi possível carregar os presentes: ${error.message}`);
  }
}

async function loadSelectedEventReservations() {
  if (!state.selectedEventId) {
    state.reservations = [];
    renderReservations();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.reservations = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts/reservations`, {
      headers: authHeaders(token)
    });
    renderReservations();
  } catch (error) {
    state.reservations = [];
    renderReservations();
    setStatus(status, "status-error", `Não foi possível carregar o histórico de reservas: ${error.message}`);
  }
}

async function loadSelectedEventGuests() {
  if (!state.selectedEventId) {
    state.guests = [];
    renderReservations();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.guests = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests`, {
      headers: authHeaders(token)
    });
    renderReservations();
  } catch (error) {
    state.guests = [];
    setStatus(status, "status-error", `Não foi possível carregar os convidados para enriquecer o histórico: ${error.message}`);
  }
}

async function reloadSelectedEventData() {
  await loadSelectedEventGifts();
  await loadSelectedEventReservations();
  await loadSelectedEventGuests();
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
        <button class="btn btn-secondary with-icon gift-edit" type="button">${ICON_EDIT}Editar presente</button>
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

function renderReservations() {
  if (!state.selectedEventId) {
    reservationsList.innerHTML = '<div class="center-empty">Selecione um evento para visualizar as reservas.</div>';
    return;
  }

  if (!state.reservations.length) {
    reservationsList.innerHTML = '<div class="center-empty">Nenhuma reserva registrada para este evento.</div>';
    return;
  }

  reservationsList.innerHTML = "";

  state.reservations.forEach((reservation) => {
    const item = document.createElement("article");
    item.className = "gift-item";
    const guestName = findGuestNameByCpf(reservation.guestCpf);

    const activeQuantity = Number(reservation.activeQuantity ?? 0);
    const badgeClass = activeQuantity > 0 ? "tag-ok" : "tag-muted";
    const badgeText = activeQuantity > 0 ? "Reserva ativa" : "Reserva encerrada";

    item.innerHTML = `
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(reservation.giftName || "Presente")}</h3>
          <p class="meta">Convidado: ${escapeHtml(guestName)} | CPF: ${escapeHtml(formatCpfInput(reservation.guestCpf || ""))}</p>
        </div>
        <span class="tag ${badgeClass}">${badgeText}</span>
      </div>
      <p class="meta">Ativas: ${activeQuantity} | Reservadas: ${Number(reservation.reservedQuantity ?? 0)} | Canceladas: ${Number(reservation.unreservedQuantity ?? 0)}</p>
      <p class="meta">Primeiro registro: ${formatDateTime(reservation.reservedAt)} | Última reserva: ${formatDateTime(reservation.lastReservedAt || reservation.reservedAt)} | Último cancelamento: ${formatDateTime(reservation.lastUnreservedAt)}</p>
    `;

    reservationsList.appendChild(item);
  });
}

function findGuestNameByCpf(cpf) {
  const normalizedReservationCpf = normalizeCpf(cpf);
  if (!normalizedReservationCpf || !Array.isArray(state.guests)) {
    return "Convidado não identificado";
  }

  const matchedGuest = state.guests.find((guest) => normalizeCpf(guest?.cpf) === normalizedReservationCpf);
  return matchedGuest?.name || "Convidado não identificado";
}

function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
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

function formatCpfInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function setGiftFormError(message) {
  setGiftFormStatus("status-error", message);
  setStatus(status, "status-error", message);
}

function setGiftFormStatus(type, message) {
  if (giftFormStatus) {
    giftFormStatus.hidden = false;
    setStatus(giftFormStatus, type, message);
  }
}

function ensureGiftFormStatusElement() {
  const existing = document.getElementById("gift-form-status");
  if (existing) return existing;

  const fallback = document.createElement("p");
  fallback.id = "gift-form-status";
  fallback.hidden = true;
  fallback.className = "status status-info";

  const targetForm = document.getElementById("create-gift-form");
  if (targetForm) {
    targetForm.appendChild(fallback);
  }

  return fallback;
}

function setGiftSubmitButtonLabel(label, icon) {
  giftSubmitButton.innerHTML = `${icon}${label}`;
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
      <path d="M4 7h16" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M10 3h4" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    </svg>
  `;
}





