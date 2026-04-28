import {
  authHeaders,
  formatCurrency,
  logoutAndRedirectToLogin,
  getApiBase,
  initUserDropdown,
  requestJson,
  requireAuth,
  setStatus,
  UI_TEXT
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const MAX_GUEST_NAME_LENGTH = 120;
const MAX_GUEST_EMAIL_LENGTH = 120;

const token = session.token;
const createGuestForm = document.getElementById("create-guest-form");
const eventSelect = document.getElementById("event-select");
const guestsList = document.getElementById("guests-list");
const status = ensureStatusElement();
const guestCpfInput = document.getElementById("guest-cpf-input");
const guestNameInput = document.getElementById("guest-name-input");
const guestEmailInput = document.getElementById("guest-email-input");
const guestPhoneInput = document.getElementById("guest-phone-input");
const guestMaxExtraGuestsInput = document.getElementById("guest-max-extra-guests-input");
const guestFormError = document.getElementById("guest-form-error");
const guestSubmitButton = document.getElementById("guest-submit-button");
const guestCancelEditButton = document.getElementById("guest-cancel-edit-button");
const guestFormTitle = document.getElementById("guest-form-title");
const ICON_USER_PLUS = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 12a5 5 0 1 0-6 0 7 7 0 0 0-5 6.7V21h16v-2.3A7 7 0 0 0 15 12zm-3-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 14a5 5 0 0 1 10 0H6zm14-8h-2V9h-2V7h2V5h2v2h2v2h-2v2z" fill="currentColor"/></svg></span>';
const ICON_SAVE = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5V4zm2 2v12h10V8.2L15.2 6H7zm2 6h6v6H9v-6z" fill="currentColor"/></svg></span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_EDIT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.05-9.06.92.92-9.05 9.06zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.49 1.5 3.75 3.75 1.49-1.5z" fill="currentColor"/></svg></span>';
const ICON_RESERVATION = '<span class="guest-reservation-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';

const state = { events: [], selectedEventId: null, guests: [], reservations: [], editingGuestId: null };

initUserDropdown({
  session,
  onLogout: () => {
    logoutAndRedirectToLogin();
  }
});

createGuestForm.addEventListener("submit", submitGuestForm);
guestCancelEditButton.addEventListener("click", () => {
  resetGuestFormMode();
  setStatus(status, "status-info", `${UI_TEXT.common.editCancelled} Você pode adicionar um novo convidado.`);
});
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  resetGuestFormMode({ silent: true });
  await reloadSelectedEventData();
});

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
  clearFieldError(guestCpfInput);
});

guestPhoneInput.addEventListener("input", () => {
  guestPhoneInput.value = formatPhoneInput(guestPhoneInput.value);
  clearFieldError(guestPhoneInput);
});

guestNameInput.addEventListener("input", () => {
  clearFieldError(guestNameInput);
});

guestEmailInput.addEventListener("input", () => {
  clearFieldError(guestEmailInput);
});

guestMaxExtraGuestsInput.addEventListener("input", () => {
  clearFieldError(guestMaxExtraGuestsInput);
});

eventSelect.addEventListener("input", () => {
  clearFieldError(eventSelect);
});

guestCpfInput.addEventListener("blur", autoFillGuestByCpf);

syncGuestEditUi();
setGuestSubmitButtonLabel(state.editingGuestId !== null ? UI_TEXT.common.save : "Adicionar convidado", state.editingGuestId !== null ? ICON_SAVE : ICON_USER_PLUS);
loadMyEvents();

async function loadMyEvents() {
  const query = new URLSearchParams(window.location.search);
  const queryEventId = Number(query.get("eventId"));

  try {
    setStatus(status, "status-loading", UI_TEXT.guests.loading);

    const apiBase = getApiBase();
    state.events = await requestJson(`${apiBase}/api/events/mine`, { headers: authHeaders(token) });

    if (!state.events.length) {
      state.selectedEventId = null;
      state.guests = [];
      state.reservations = [];
      renderEventSelect();
      renderGuests();
      setStatus(status, "status-info", UI_TEXT.events.emptyWithAction);
      return;
    }

    const canUseQueryEvent = Number.isInteger(queryEventId) && state.events.some((event) => event.id === queryEventId);
    state.selectedEventId = canUseQueryEvent
      ? queryEventId
      : (state.events.some((event) => event.id === state.selectedEventId) ? state.selectedEventId : state.events[0].id);

    renderEventSelect();
    await reloadSelectedEventData();
    setStatus(status, "status-success", UI_TEXT.guests.loaded);
  } catch (error) {
    setStatus(status, "status-error", `Não foi possível carregar seus eventos: ${error.message}`);
  }
}

async function submitGuestForm(event) {
  event.preventDefault();

  const eventId = Number(eventSelect.value);
  const cpf = digitsOnly(guestCpfInput.value);
  const name = guestNameInput.value.trim();
  const email = guestEmailInput.value.trim();
  const phoneDigits = digitsOnly(guestPhoneInput.value);
  const maxExtraGuests = parseMaxExtraGuests(guestMaxExtraGuestsInput.value);
  const editing = state.editingGuestId !== null;

  clearAllFieldErrors();
  if (!eventId) return showFieldError(eventSelect, "Selecione um evento para continuar.");
  if (!editing && !isValidCpf(cpf)) return showFieldError(guestCpfInput, "Informe um CPF válido.");
  if (!name) return showFieldError(guestNameInput, "Informe o nome do convidado.");
  if (name.length > MAX_GUEST_NAME_LENGTH) return showFieldError(guestNameInput, "O nome do convidado deve ter no máximo 120 caracteres.");
  if (!isValidPersonName(name)) return showFieldError(guestNameInput, "Informe um nome válido usando apenas letras.");
  if (!email) return showFieldError(guestEmailInput, "Informe o e-mail do convidado.");
  if (email.length > MAX_GUEST_EMAIL_LENGTH) return showFieldError(guestEmailInput, "O e-mail do convidado deve ter no máximo 120 caracteres.");
  if (!isValidEmail(email)) return showFieldError(guestEmailInput, "Informe um e-mail válido para o convidado.");
  if (!isValidPhone(phoneDigits)) return showFieldError(guestPhoneInput, "Informe um celular válido com 10 ou 11 dígitos.");
  if (maxExtraGuests === null) return showFieldError(guestMaxExtraGuestsInput, "Informe uma quantidade válida de acompanhantes.");

  try {
    guestSubmitButton.disabled = true;
    setGuestSubmitButtonLabel("Salvando...", ICON_SPINNER);

    const apiBase = getApiBase();

    if (editing) {
      setStatus(status, "status-loading", UI_TEXT.guests.updateLoading);
      await requestJson(`${apiBase}/api/events/${eventId}/guests/${state.editingGuestId}`, {
        method: "PUT",
        headers: authHeaders(token, true),
        body: JSON.stringify({ name, email, phoneNumber: phoneDigits, maxExtraGuests })
      });
      await reloadSelectedEventData();
      resetGuestFormMode({ silent: true });
      setStatus(status, "status-success", UI_TEXT.guests.updateSuccess);
      return;
    }

    setStatus(status, "status-loading", UI_TEXT.guests.createLoading);
    await requestJson(`${apiBase}/api/events/${eventId}/guests`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ cpf, name, email, phoneNumber: phoneDigits, maxExtraGuests })
    });

    createGuestForm.reset();
    guestMaxExtraGuestsInput.value = "0";
    eventSelect.value = String(state.selectedEventId || "");
    await reloadSelectedEventData();
    setStatus(status, "status-success", UI_TEXT.guests.createSuccess);
  } catch (error) {
    const lowerMessage = String(error?.message || "").toLowerCase();

    if (lowerMessage.includes("cpf")) {
      showFieldError(guestCpfInput, error.message);
    } else if (lowerMessage.includes("e-mail") || lowerMessage.includes("email")) {
      showFieldError(guestEmailInput, error.message);
    } else if (lowerMessage.includes("nome")) {
      showFieldError(guestNameInput, error.message);
    } else if (lowerMessage.includes("telefone") || lowerMessage.includes("celular")) {
      showFieldError(guestPhoneInput, error.message);
    } else if (lowerMessage.includes("acompanhante")) {
      showFieldError(guestMaxExtraGuestsInput, error.message);
    } else {
      showFieldError(guestSubmitButton, `Não foi possível salvar o convidado: ${error.message}`);
    }
  } finally {
    guestSubmitButton.disabled = false;
    setGuestSubmitButtonLabel(
      state.editingGuestId !== null ? UI_TEXT.common.save : "Adicionar convidado",
      state.editingGuestId !== null ? ICON_SAVE : ICON_USER_PLUS
    );
  }
}

function startGuestEditMode(guest) {
  if (!state.selectedEventId) return;

  state.editingGuestId = guest.id;
  guestCpfInput.value = formatCpfInput(guest.cpf || "");
  guestCpfInput.disabled = true;
  guestNameInput.value = guest.name || "";
  guestEmailInput.value = guest.email || "";
  guestPhoneInput.value = formatPhoneInput(guest.phoneNumber || "");
  guestMaxExtraGuestsInput.value = String(toNonNegativeInteger(guest.maxExtraGuests));
  setGuestSubmitButtonLabel(UI_TEXT.common.save, ICON_SAVE);
  syncGuestEditUi();
  guestFormTitle.textContent = `Você está editando o convidado "${guest.name}".`;
  guestNameInput.focus();
}

function resetGuestFormMode() {
  state.editingGuestId = null;
  createGuestForm.reset();
  guestMaxExtraGuestsInput.value = "0";
  guestCpfInput.disabled = false;
  setGuestSubmitButtonLabel("Adicionar convidado", ICON_USER_PLUS);
  syncGuestEditUi();
  guestFormTitle.textContent = "Adicionar convidado";
  eventSelect.value = String(state.selectedEventId || "");
  clearAllFieldErrors();
}

function syncGuestEditUi() {
  const isEditing = state.editingGuestId !== null;
  guestCancelEditButton.hidden = !isEditing;
  guestCancelEditButton.style.display = isEditing ? "" : "none";
}

async function deleteGuest(guest) {
  if (!state.selectedEventId) return;

  const confirmed = window.confirm(UI_TEXT.confirms.deleteGuest(guest.name));
  if (!confirmed) return;

  try {
    setStatus(status, "status-loading", UI_TEXT.guests.deleteLoading);

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests/${guest.id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    });

    if (state.editingGuestId === guest.id) {
      resetGuestFormMode({ silent: true });
    }

    await reloadSelectedEventData();
    setStatus(status, "status-success", UI_TEXT.guests.deleteSuccess);
  } catch (error) {
    setStatus(status, "status-error", `${UI_TEXT.guests.deleteError}: ${error.message}`);
  }
}

async function reloadSelectedEventData() {
  await loadSelectedEventGuests();
  await loadSelectedEventReservations();
}

async function loadSelectedEventGuests() {
  if (!state.selectedEventId) {
    state.guests = [];
    renderGuests();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.guests = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests`, {
      headers: authHeaders(token)
    });
    renderGuests();
  } catch (error) {
    state.guests = [];
    renderGuests();
    setStatus(status, "status-error", `Não foi possível carregar os convidados: ${error.message}`);
  }
}

async function loadSelectedEventReservations() {
  if (!state.selectedEventId) {
    state.reservations = [];
    renderGuests();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.reservations = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts/reservations`, {
      headers: authHeaders(token)
    });
    renderGuests();
  } catch (error) {
    state.reservations = [];
    renderGuests();
    setStatus(status, "status-error", `Não foi possível carregar o resumo de reservas: ${error.message}`);
  }
}

async function autoFillGuestByCpf() {
  if (!state.selectedEventId || state.editingGuestId !== null) return;

  const cpf = digitsOnly(guestCpfInput.value);
  if (!isValidCpf(cpf)) return;

  try {
    const apiBase = getApiBase();
    const guest = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests/by-cpf/${cpf}`, {
      headers: authHeaders(token)
    });

    if (!guestNameInput.value.trim()) guestNameInput.value = guest.name || "";
    if (!guestEmailInput.value.trim()) guestEmailInput.value = guest.email || "";
    if (!guestPhoneInput.value.trim()) guestPhoneInput.value = formatPhoneInput(guest.phoneNumber || "");
  } catch {
    // Lookup opcional, sem feedback visual.
  }
}

function renderEventSelect() {
  const options = ['<option value="">Selecione um evento</option>'];

  state.events.forEach((event) => {
    const selected = event.id === state.selectedEventId ? " selected" : "";
    options.push(`<option value="${event.id}"${selected}>${escapeHtml(event.name)}</option>`);
  });

  eventSelect.innerHTML = options.join("");
}

function renderGuests() {
  if (!state.selectedEventId) {
    guestsList.innerHTML = '<div class="center-empty">Selecione um evento para visualizar os convidados.</div>';
    return;
  }

  if (!state.guests.length) {
    guestsList.innerHTML = `<div class="center-empty">${UI_TEXT.guests.empty}</div>`;
    return;
  }

  guestsList.innerHTML = "";

  state.guests.forEach((guest) => {
    const item = document.createElement("article");
    item.className = "gift-item guest-card";
    const reservationSummary = buildGuestReservationSummary(guest.cpf);

    item.innerHTML = `
      <div class="gift-head gift-head-actions">
        <div>
          <h3 class="gift-name">${escapeHtml(guest.name)}</h3>
          <p class="meta">CPF: ${escapeHtml(formatCpfInput(guest.cpf))}</p>
        </div>
        <div class="gift-card-side-actions">
          <span class="tag tag-ok">Convidado</span>
          <button class="icon-button danger guest-delete" type="button" title="Excluir convidado" aria-label="Excluir convidado">${trashIconSvg()}</button>
        </div>
      </div>
      <p class="meta">E-mail: ${escapeHtml(guest.email)} | Celular: ${escapeHtml(formatPhoneInput(guest.phoneNumber))} | Acompanhantes: ${toNonNegativeInteger(guest.maxExtraGuests)}</p>
      <div class="guest-reservation-summary ${reservationSummary.active ? "is-active" : ""}">
        ${ICON_RESERVATION}
        <span class="guest-reservation-label">${escapeHtml(reservationSummary.label)}</span>
        ${reservationSummary.active ? `<strong class="guest-reservation-value">${formatCurrency(reservationSummary.total)}</strong>` : ""}
      </div>
      <div class="row row-tight top-gap-sm">
        <button class="btn btn-secondary with-icon guest-edit" type="button">${ICON_EDIT}Editar convidado</button>
      </div>
    `;

    item.querySelector(".guest-edit")?.addEventListener("click", () => {
      startGuestEditMode(guest);
    });

    item.querySelector(".guest-delete")?.addEventListener("click", () => {
      deleteGuest(guest);
    });

    guestsList.appendChild(item);
  });
}

function buildGuestReservationSummary(cpf) {
  const normalizedCpf = digitsOnly(cpf);
  const matchingReservations = state.reservations.filter((reservation) => digitsOnly(reservation.guestCpf) === normalizedCpf);
  const total = matchingReservations.reduce((sum, reservation) => {
    const activeQuantity = Number(reservation.activeQuantity ?? 0);
    const giftPrice = Number(reservation.giftPrice ?? 0);
    return sum + (activeQuantity > 0 ? activeQuantity * giftPrice : 0);
  }, 0);

  if (total > 0) {
    return {
      active: true,
      total,
      label: UI_TEXT.guests.reservationActive
    };
  }

  return {
    active: false,
    total: 0,
    label: UI_TEXT.guests.reservationNone
  };
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfInput(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidCpf(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const firstVerifier = calculateVerifier(digits, 9, 10);
  const secondVerifier = calculateVerifier(digits, 10, 11);
  return digits[9] === firstVerifier && digits[10] === secondVerifier;
}

function calculateVerifier(digits, length, initialWeight) {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += digits[index] * (initialWeight - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/i.test(email);
}

function isValidPersonName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$/u.test(String(name || "").trim());
}

function isValidPhone(phoneDigits) {
  return /^\d{10,11}$/.test(String(phoneDigits || ""));
}

function parseMaxExtraGuests(value) {
  if (String(value || "").trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function showFieldError(target, message) {
  const field = target?.closest?.(".field");
  if (field) {
    field.classList.add("field-has-error");
  }

  if (guestFormError) {
    guestFormError.hidden = false;
    guestFormError.textContent = message;
  }

  target?.focus?.();
}

function clearFieldError(target) {
  const field = target?.closest?.(".field");
  if (field) {
    field.classList.remove("field-has-error");
  }

  if (guestFormError) {
    guestFormError.hidden = true;
    guestFormError.textContent = "";
  }
}

function clearAllFieldErrors() {
  [eventSelect, guestCpfInput, guestNameInput, guestEmailInput, guestPhoneInput, guestMaxExtraGuestsInput].forEach(clearFieldError);
}

function setGuestSubmitButtonLabel(label, icon) {
  guestSubmitButton.innerHTML = `${icon}${label}`;
}

function ensureStatusElement() {
  const existing = document.getElementById("status");
  if (existing) return existing;

  const fallback = document.createElement("p");
  fallback.id = "status";
  fallback.className = "status status-info";
  fallback.textContent = UI_TEXT.guests.initial;
  createGuestForm?.before(fallback);
  return fallback;
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
