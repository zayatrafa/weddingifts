import {
  authHeaders,
  clearAuthSession,
  getApiBase,
  initUserDropdown,
  requestJson,
  requireAuth,
  setStatus
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autentica\\u00E7\\u00E3o obrigat\\u00F3ria.");

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
const guestFormError = document.getElementById("guest-form-error");
const guestSubmitButton = document.getElementById("guest-submit-button");
const guestCancelEditButton = document.getElementById("guest-cancel-edit-button");
const guestFormTitle = document.getElementById("guest-form-title");
const ICON_USER_PLUS = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 12a5 5 0 1 0-6 0 7 7 0 0 0-5 6.7V21h16v-2.3A7 7 0 0 0 15 12zm-3-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 14a5 5 0 0 1 10 0H6zm14-8h-2V9h-2V7h2V5h2v2h2v2h-2v2z" fill="currentColor"/></svg></span>';
const ICON_SAVE = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5V4zm2 2v12h10V8.2L15.2 6H7zm2 6h6v6H9v-6z" fill="currentColor"/></svg></span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_EDIT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.05-9.06.92.92-9.05 9.06zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.49 1.5 3.75 3.75 1.49-1.5z" fill="currentColor"/></svg></span>';

const state = { events: [], selectedEventId: null, guests: [], editingGuestId: null };

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

createGuestForm.addEventListener("submit", submitGuestForm);
guestCancelEditButton.addEventListener("click", () => {
  resetGuestFormMode();
  setStatus(status, "status-info", "Edi\\u00E7\\u00E3o cancelada. Voc\\u00EA pode adicionar um novo convidado.");
});
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  resetGuestFormMode({ silent: true });
  await loadSelectedEventGuests();
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

eventSelect.addEventListener("input", () => {
  clearFieldError(eventSelect);
});

guestCpfInput.addEventListener("blur", autoFillGuestByCpf);

syncGuestEditUi();
setGuestSubmitButtonLabel(state.editingGuestId !== null ? "Salvar altera\\u00E7\\u00F5es" : "Adicionar convidado", state.editingGuestId !== null ? ICON_SAVE : ICON_USER_PLUS);
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
      state.guests = [];
      renderEventSelect();
      renderGuests();
      setStatus(status, "status-info", "Voc\\u00EA ainda n\\u00E3o possui eventos. Crie um evento primeiro.");
      return;
    }

    const canUseQueryEvent = Number.isInteger(queryEventId) && state.events.some((event) => event.id === queryEventId);
    state.selectedEventId = canUseQueryEvent
      ? queryEventId
      : (state.events.some((event) => event.id === state.selectedEventId) ? state.selectedEventId : state.events[0].id);

    renderEventSelect();
    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Eventos carregados com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao carregar eventos: ${error.message}`);
  }
}

async function submitGuestForm(event) {
  event.preventDefault();

  const eventId = Number(eventSelect.value);
  const cpf = digitsOnly(guestCpfInput.value);
  const name = guestNameInput.value.trim();
  const email = guestEmailInput.value.trim();
  const phoneDigits = digitsOnly(guestPhoneInput.value);
  const editing = state.editingGuestId !== null;

  clearAllFieldErrors();
  if (!eventId) return showFieldError(eventSelect, "Selecione um evento para continuar.");
  if (!editing && !isValidCpf(cpf)) return showFieldError(guestCpfInput, "Informe um CPF v\\u00E1lido.");
  if (!name) return showFieldError(guestNameInput, "Informe o nome do convidado.");
  if (name.length > MAX_GUEST_NAME_LENGTH) return showFieldError(guestNameInput, "O nome do convidado deve ter no m\\u00E1ximo 120 caracteres.");
  if (!isValidPersonName(name)) return showFieldError(guestNameInput, "O nome do convidado deve conter apenas letras.");
  if (!email) return showFieldError(guestEmailInput, "Informe o e-mail do convidado.");
  if (email.length > MAX_GUEST_EMAIL_LENGTH) return showFieldError(guestEmailInput, "O e-mail do convidado deve ter no m\\u00E1ximo 120 caracteres.");
  if (!isValidEmail(email)) return showFieldError(guestEmailInput, "Informe um e-mail de convidado v\\u00E1lido.");
  if (!isValidPhone(phoneDigits)) return showFieldError(guestPhoneInput, "Informe um celular v\\u00E1lido com 10 ou 11 d\\u00EDgitos.");

  try {
    guestSubmitButton.disabled = true;
    setGuestSubmitButtonLabel("Salvando...", ICON_SPINNER);

    const apiBase = getApiBase();

    if (editing) {
      setStatus(status, "status-loading", "Atualizando convidado...");
      await requestJson(`${apiBase}/api/events/${eventId}/guests/${state.editingGuestId}`, {
        method: "PUT",
        headers: authHeaders(token, true),
        body: JSON.stringify({ name, email, phoneNumber: phoneDigits })
      });
      await loadSelectedEventGuests();
      resetGuestFormMode({ silent: true });
      setStatus(status, "status-success", "Convidado atualizado com sucesso.");
      return;
    }

    setStatus(status, "status-loading", "Adicionando convidado...");
    await requestJson(`${apiBase}/api/events/${eventId}/guests`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ cpf, name, email, phoneNumber: phoneDigits })
    });

    createGuestForm.reset();
    eventSelect.value = String(state.selectedEventId || "");
    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Convidado adicionado com sucesso.");
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
    } else {
      showFieldError(guestSubmitButton, `Falha ao salvar convidado: ${error.message}`);
    }
  } finally {
    guestSubmitButton.disabled = false;
    setGuestSubmitButtonLabel(
      state.editingGuestId !== null ? "Salvar altera\\u00E7\\u00F5es" : "Adicionar convidado",
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
  setGuestSubmitButtonLabel("Salvar altera\\u00E7\\u00F5es", ICON_SAVE);
  syncGuestEditUi();
  guestFormTitle.textContent = `Voc\\u00EA est\\u00E1 editando o convidado "${guest.name}".`;
  guestNameInput.focus();
}

function resetGuestFormMode(options = {}) {
  const { silent = false } = options;

  state.editingGuestId = null;
  createGuestForm.reset();
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

  const confirmed = window.confirm(`Tem certeza que deseja excluir o convidado "${guest.name}"?`);
  if (!confirmed) return;

  try {
    setStatus(status, "status-loading", "Excluindo convidado...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests/${guest.id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    });

    if (state.editingGuestId === guest.id) {
      resetGuestFormMode({ silent: true });
    }

    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Convidado exclu\\u00EDdo com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao excluir convidado: ${error.message}`);
  }
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
    setStatus(status, "status-error", `Falha ao carregar convidados: ${error.message}`);
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
    // N\\u00E3o exibe erro em lookup de preenchimento autom\\u00E1tico.
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
    guestsList.innerHTML = '<div class="center-empty">Nenhum convidado cadastrado para este evento.</div>';
    return;
  }

  guestsList.innerHTML = "";

  state.guests.forEach((guest) => {
    const item = document.createElement("article");
    item.className = "gift-item";

    item.innerHTML = `
      <button class="icon-button danger guest-delete" type="button" title="Excluir convidado" aria-label="Excluir convidado">${trashIconSvg()}</button>
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(guest.name)}</h3>
          <p class="meta">CPF: ${escapeHtml(formatCpfInput(guest.cpf))}</p>
        </div>
        <span class="tag tag-ok">Convidado</span>
      </div>
      <p class="meta">Email: ${escapeHtml(guest.email)} | Celular: ${escapeHtml(formatPhoneInput(guest.phoneNumber))}</p>
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
  if (digits[9] !== firstVerifier) return false;

  const secondVerifier = calculateVerifier(digits, 10, 11);
  return digits[10] === secondVerifier;
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

function isValidPhone(digits) {
  return digits.length >= 10 && digits.length <= 11;
}

function isValidPersonName(name) {
  return /^[\p{L}'-]+(?:\s+[\p{L}'-]+)*$/u.test(String(name || "").trim());
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setGuestSubmitButtonLabel(label, icon) {
  guestSubmitButton.innerHTML = `${icon}${label}`;
}

function ensureStatusElement() {
  const existing = document.getElementById("status");
  if (existing) return existing;

  const fallback = document.createElement("p");
  fallback.id = "status";
  fallback.hidden = true;
  fallback.className = "status status-info";
  document.body.appendChild(fallback);
  return fallback;
}

function showFieldError(element, message) {
  if (!element) return;

  clearAllFieldErrors();

  if ("classList" in element) {
    element.classList.add("input-invalid");
  }

  if ("focus" in element && typeof element.focus === "function") {
    element.focus();
  }

  if (guestFormError) {
    guestFormError.textContent = message;
    guestFormError.hidden = false;
  }
}

function clearFieldError(element) {
  if (!element || !("classList" in element)) return;
  element.classList.remove("input-invalid");
}

function clearAllFieldErrors() {
  clearFieldError(eventSelect);
  clearFieldError(guestCpfInput);
  clearFieldError(guestNameInput);
  clearFieldError(guestEmailInput);
  clearFieldError(guestPhoneInput);

  if (guestFormError) {
    guestFormError.hidden = true;
    guestFormError.textContent = "";
  }
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


