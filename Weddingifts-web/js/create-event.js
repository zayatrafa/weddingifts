import {
  authHeaders,
  getApiBase,
  initUserDropdown,
  logoutAndRedirectToLogin,
  requestJson,
  requireAuth,
  setStatus,
  UI_TEXT
} from "./common.js";
import {
  MAX_EVENT_DATE_TIME_LOCAL,
  buildEnrichedEventPayload,
  defaultEventDateTimeLocalValue,
  getEnrichedEventValidationError,
  isFutureEventDateTime,
  minFutureEventDateTimeLocalValue,
  readEnrichedEventFormValues,
  renderTimeZoneOptions
} from "./event-contract.js";

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const createEventForm = document.getElementById("create-event-form");
const status = document.getElementById("status");
const eventDateTimeInput = document.getElementById("event-date-time-input");
const timeZoneInput = document.getElementById("time-zone-input");
const EVENT_BUTTON_DEFAULT = `${calendarPlusIcon()}Criar evento`;
const EVENT_BUTTON_LOADING = `${spinnerIcon()}Criando...`;

timeZoneInput.innerHTML = renderTimeZoneOptions();
eventDateTimeInput.max = MAX_EVENT_DATE_TIME_LOCAL;
eventDateTimeInput.value = defaultEventDateTimeLocalValue(timeZoneInput.value);
syncEventDateTimeBounds();

timeZoneInput.addEventListener("change", () => {
  syncEventDateTimeBounds();
  validateEventDateTimeField();
});

eventDateTimeInput.addEventListener("input", () => {
  validateEventDateTimeField();
});

initUserDropdown({
  session,
  onLogout: () => {
    logoutAndRedirectToLogin();
  }
});

createEventForm.addEventListener("submit", createEvent);

async function createEvent(event) {
  event.preventDefault();

  const values = readEnrichedEventFormValues(createEventForm.elements);
  const submitButton = document.getElementById("event-submit-button");
  const validationError = getEnrichedEventValidationError(values);

  if (validationError) {
    validateEventDateTimeField();
    setStatus(status, "status-error", validationError);
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = EVENT_BUTTON_LOADING;
    setStatus(status, "status-loading", UI_TEXT.events.createLoading);

    const apiBase = getApiBase();
    const createdEvent = await requestJson(`${apiBase}/api/events`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify(buildEnrichedEventPayload(values))
    });

    setStatus(status, "status-success", "Evento criado com sucesso. Redirecionando...");
    const focusEventId = encodeURIComponent(String(createdEvent.id));

    window.setTimeout(() => {
      window.location.href = `./my-events.html?focusEventId=${focusEventId}`;
    }, 320);
  } catch (error) {
    setStatus(status, "status-error", String(error.message || UI_TEXT.events.createError));
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = EVENT_BUTTON_DEFAULT;
  }
}

function calendarPlusIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm11 8H6v10h12V10zm-8 2h2v2h2v2h-2v2h-2v-2H8v-2h2v-2z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}

function syncEventDateTimeBounds() {
  eventDateTimeInput.min = minFutureEventDateTimeLocalValue(timeZoneInput.value);
}

function validateEventDateTimeField() {
  const value = eventDateTimeInput.value;
  if (!value) {
    eventDateTimeInput.setCustomValidity("");
    return;
  }

  if (!isFutureEventDateTime(value, timeZoneInput.value)) {
    eventDateTimeInput.setCustomValidity("Informe uma data e hora futuras para o evento.");
    return;
  }

  eventDateTimeInput.setCustomValidity("");
}
