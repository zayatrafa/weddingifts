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
    status.hidden = false;
    setStatus(status, "status-error", "Informe nome e data do evento.");
    return;
  }

  if (!isFutureDate(eventDate)) {
    status.hidden = false;
    setStatus(status, "status-error", "A data do evento deve ser futura.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Criando...";
    status.hidden = false;
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
    status.hidden = false;
    setStatus(status, "status-error", `Falha ao criar evento: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar evento";
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
