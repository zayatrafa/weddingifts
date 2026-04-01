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
const createEventForm = document.getElementById("create-event-form");
const status = document.getElementById("status");
const eventDateInput = document.getElementById("event-date-input");
const EVENT_BUTTON_DEFAULT = `${calendarPlusIcon()}Criar evento`;
const EVENT_BUTTON_LOADING = `${spinnerIcon()}Criando...`;

eventDateInput.min = tomorrowDateIso();

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

createEventForm.addEventListener("submit", createEvent);

async function createEvent(event) {
  event.preventDefault();

  const name = document.getElementById("event-name-input").value.trim();
  const eventDate = eventDateInput.value;
  const submitButton = document.getElementById("event-submit-button");

  if (!name || !eventDate) {
    setStatus(status, "status-error", "Informe nome e data do evento.");
    return;
  }

  if (!isFutureDate(eventDate)) {
    setStatus(status, "status-error", "A data do evento deve ser futura.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = EVENT_BUTTON_LOADING;
    setStatus(status, "status-loading", "Criando evento...");

    const apiBase = getApiBase();
    const createdEvent = await requestJson(`${apiBase}/api/events`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, eventDate })
    });

    const focusEventId = encodeURIComponent(String(createdEvent.id));
    window.location.href = `./my-events.html?focusEventId=${focusEventId}`;
  } catch (error) {
    setStatus(status, "status-error", `Falha ao criar evento: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = EVENT_BUTTON_DEFAULT;
  }
}

function tomorrowDateIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isFutureDate(dateValue) {
  const selectedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate > today;
}

function calendarPlusIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm11 8H6v10h12V10zm-8 2h2v2h2v2h-2v2h-2v-2H8v-2h2v-2z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}
