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
if (!session) throw new Error("Authentication required.");

const token = session.token;
const refreshEventsButton = document.getElementById("refresh-events-button");
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

refreshEventsButton.addEventListener("click", loadMyEvents);
createGuestForm.addEventListener("submit", createGuest);
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  await loadSelectedEventGuests();
});

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
});

guestCpfInput.addEventListener("blur", autoFillGuestByCpf);

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
  } finally {
    refreshEventsButton.disabled = false;
  }
}

async function createGuest(event) {
  event.preventDefault();

  const submitButton = document.getElementById("guest-submit-button");
  const eventId = Number(eventSelect.value);
  const cpf = digitsOnly(guestCpfInput.value);
  const name = guestNameInput.value.trim();
  const email = guestEmailInput.value.trim();
  const phoneNumber = guestPhoneInput.value.trim();

  if (!eventId) return setStatus(status, "status-error", "Selecione um evento para adicionar o convidado.");
  if (cpf.length !== 11) return setStatus(status, "status-error", "Informe um CPF válido com 11 dígitos.");
  if (!name) return setStatus(status, "status-error", "Informe o nome do convidado.");
  if (!email) return setStatus(status, "status-error", "Informe o email do convidado.");
  if (!phoneNumber) return setStatus(status, "status-error", "Informe o número de celular do convidado.");

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setStatus(status, "status-loading", "Adicionando convidado...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${eventId}/guests`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ cpf, name, email, phoneNumber })
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
  if (cpf.length !== 11) return;

  try {
    const apiBase = getApiBase();
    const guest = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/guests/by-cpf/${cpf}`, {
      headers: authHeaders(token)
    });

    if (!guestNameInput.value.trim()) guestNameInput.value = guest.name || "";
    if (!guestEmailInput.value.trim()) guestEmailInput.value = guest.email || "";
    if (!guestPhoneInput.value.trim()) guestPhoneInput.value = guest.phoneNumber || "";
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
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(guest.name)}</h3>
          <p class="meta">CPF: ${escapeHtml(formatCpfInput(guest.cpf))}</p>
        </div>
        <span class="tag tag-ok">Convidado</span>
      </div>
      <p class="meta">Email: ${escapeHtml(guest.email)} | Celular: ${escapeHtml(guest.phoneNumber)}</p>
    `;

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

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
