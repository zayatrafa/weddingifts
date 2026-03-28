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
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const createGuestForm = document.getElementById("create-guest-form");
const eventSelect = document.getElementById("event-select");
const guestsList = document.getElementById("guests-list");
const status = document.getElementById("status");
const guestCpfInput = document.getElementById("guest-cpf-input");
const guestNameInput = document.getElementById("guest-name-input");
const guestEmailInput = document.getElementById("guest-email-input");
const guestPhoneInput = document.getElementById("guest-phone-input");

const state = { events: [], selectedEventId: null, guests: [] };

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

createGuestForm.addEventListener("submit", createGuest);
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  await loadSelectedEventGuests();
});

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
});

guestPhoneInput.addEventListener("input", () => {
  guestPhoneInput.value = formatPhoneInput(guestPhoneInput.value);
});

guestCpfInput.addEventListener("blur", autoFillGuestByCpf);

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
      setStatus(status, "status-info", "Você ainda não possui eventos. Crie um evento primeiro.");
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

async function createGuest(event) {
  event.preventDefault();

  const submitButton = document.getElementById("guest-submit-button");
  const eventId = Number(eventSelect.value);
  const cpf = digitsOnly(guestCpfInput.value);
  const name = guestNameInput.value.trim();
  const email = guestEmailInput.value.trim();
  const phoneDigits = digitsOnly(guestPhoneInput.value);

  if (!eventId) return setStatus(status, "status-error", "Selecione um evento para adicionar o convidado.");
  if (!isValidCpf(cpf)) return setStatus(status, "status-error", "Informe um CPF válido.");
  if (!name) return setStatus(status, "status-error", "Informe o nome do convidado.");
  if (!isValidPersonName(name)) return setStatus(status, "status-error", "O nome do convidado deve conter apenas letras.");
  if (!email) return setStatus(status, "status-error", "Informe o e-mail do convidado.");
  if (!isValidEmail(email)) return setStatus(status, "status-error", "Informe um e-mail de convidado válido.");
  if (!isValidPhone(phoneDigits)) return setStatus(status, "status-error", "Informe um celular válido com 10 ou 11 dígitos.");

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setStatus(status, "status-loading", "Adicionando convidado...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${eventId}/guests`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ cpf, name, email, phoneNumber: phoneDigits })
    });

    createGuestForm.reset();
    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Convidado adicionado com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao adicionar convidado: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Adicionar convidado";
  }
}

async function editGuest(guest) {
  if (!state.selectedEventId) return;

  const name = window.prompt("Nome do convidado:", guest.name);
  if (name === null) return;

  const trimmedName = name.trim();
  if (!trimmedName) return setStatus(status, "status-error", "Informe o nome do convidado.");
  if (!isValidPersonName(trimmedName)) return setStatus(status, "status-error", "O nome do convidado deve conter apenas letras.");

  const email = window.prompt("E-mail do convidado:", guest.email);
  if (email === null) return;

  const trimmedEmail = email.trim();
  if (!trimmedEmail) return setStatus(status, "status-error", "Informe o e-mail do convidado.");
  if (!isValidEmail(trimmedEmail)) return setStatus(status, "status-error", "Informe um e-mail de convidado válido.");

  const phone = window.prompt("Celular do convidado:", formatPhoneInput(guest.phoneNumber));
  if (phone === null) return;

  const phoneDigits = digitsOnly(phone);
  if (!isValidPhone(phoneDigits)) return setStatus(status, "status-error", "Informe um celular válido com 10 ou 11 dígitos.");

  try {
    setStatus(status, "status-loading", "Atualizando convidado...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests/${guest.id}`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name: trimmedName, email: trimmedEmail, phoneNumber: phoneDigits })
    });

    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Convidado atualizado com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao atualizar convidado: ${error.message}`);
  }
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

    await loadSelectedEventGuests();
    setStatus(status, "status-success", "Convidado excluído com sucesso.");
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
  if (!state.selectedEventId) return;

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
    // Não exibe erro em lookup de preenchimento automático.
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
        <button class="btn btn-secondary guest-edit" type="button">Editar convidado</button>
      </div>
    `;

    item.querySelector(".guest-edit")?.addEventListener("click", () => {
      editGuest(guest);
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
  return /^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$/u.test(String(name || "").trim());
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

