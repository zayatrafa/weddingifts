import {
  authHeaders,
  buildPublicEventLink,
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
  formatEventDateTime,
  getEnrichedEventValidationError,
  getEventTimeZoneId,
  getTimeZoneLabel,
  isFutureEventDateTime,
  minFutureEventDateTimeLocalValue,
  readEnrichedEventFormValues,
  renderTimeZoneOptions,
  toEventDateTimeInputValue
} from "./event-contract.js";

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const token = session.token;
const refreshEventsButton = document.getElementById("refresh-events-button");
const eventsList = document.getElementById("events-list");
const status = document.getElementById("status");

const query = new URLSearchParams(window.location.search);
const focusEventIdFromQuery = Number(query.get("focusEventId"));
let shouldFocusFromQuery = Number.isInteger(focusEventIdFromQuery) && focusEventIdFromQuery > 0;

const state = { events: [] };
const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.05-9.06.92.92-9.05 9.06zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.49 1.5 3.75 3.75 1.49-1.5z" fill="currentColor"/></svg>';
const ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 13.41a1 1 0 0 1 0-1.41l2.83-2.83a3 3 0 0 1 4.24 4.24l-1.42 1.42a3 3 0 0 1-4.24 0 1 1 0 1 0-1.41 1.41 5 5 0 0 0 7.07 0l1.42-1.42a5 5 0 0 0-7.07-7.07l-2.83 2.83a1 1 0 0 1-1.41 0z" fill="currentColor"/><path d="M13.41 10.59a1 1 0 0 1 0 1.41l-2.83 2.83a3 3 0 0 1-4.24-4.24l1.42-1.42a3 3 0 0 1 4.24 0 1 1 0 1 0 1.41-1.41 5 5 0 0 0-7.07 0L4.93 9.17a5 5 0 1 0 7.07 7.07l2.83-2.83a1 1 0 0 1 1.41 0z" fill="currentColor"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 3h4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const ICON_GUESTS = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-6 2.2-6 5v1h12v-1c0-2.8-2.7-5-6-5zm8-2a3 3 0 1 0-2.2-5 6 6 0 0 1 .4 2c0 1.2-.3 2.3-.9 3.2.8.5 1.7.8 2.7.8zm1 2c-.8 0-1.6.1-2.3.4 1.4 1.1 2.3 2.8 2.3 4.6v1h4v-1c0-2.8-1.8-5-4-5z" fill="currentColor"/></svg></span>';
const ICON_GIFT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';
const ICON_HISTORY = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 1 0 8.9 10.5h-2.1A7 7 0 1 1 13 5v3l4-4-4-4v3zm-1 5h2v6h-5v-2h3V8z" fill="currentColor"/></svg></span>';

initUserDropdown({
  session,
  onLogout: () => {
    logoutAndRedirectToLogin();
  }
});

refreshEventsButton.addEventListener("click", loadMyEvents);
loadMyEvents();

async function loadMyEvents() {
  try {
    refreshEventsButton.disabled = true;
    setEventsStatus("status-loading", UI_TEXT.events.loading);

    const apiBase = getApiBase();
    state.events = await requestJson(`${apiBase}/api/events/mine`, {
      headers: authHeaders(token)
    });

    renderEvents();

    if (applyFocusFromQueryIfNeeded()) {
      setEventsStatus("status-success", UI_TEXT.events.createdFocus);
    } else {
      setEventsStatus(
        state.events.length ? "status-info" : "status-info",
        state.events.length ? UI_TEXT.events.loaded : UI_TEXT.events.empty,
        { subtle: state.events.length }
      );
    }
  } catch (error) {
    setEventsStatus("status-error", `Não foi possível carregar seus eventos: ${error.message}`);
  } finally {
    refreshEventsButton.disabled = false;
  }
}

function renderEvents() {
  if (!state.events.length) {
    eventsList.innerHTML = '<div class="center-empty">Nenhum evento cadastrado no momento.</div>';
    return;
  }

  eventsList.innerHTML = "";

  state.events.forEach((eventData) => {
    const item = document.createElement("article");
    item.className = "event-item my-event-card";
    item.dataset.eventId = String(eventData.id);

    const giftCount = Array.isArray(eventData.gifts) ? eventData.gifts.length : 0;
    const guestCount = Number.isInteger(eventData.guestCount)
      ? eventData.guestCount
      : (Array.isArray(eventData.guests) ? eventData.guests.length : 0);
    const editFieldPrefix = `event-${eventData.id}-edit`;

    item.innerHTML = `
      <div class="my-event-top">
        <div class="my-event-main">
          <h3 class="event-title">${escapeHtml(eventData.name)}</h3>
          <span class="tag tag-ok my-event-status">Publicado</span>
        </div>
        <div class="my-event-quick-actions" aria-label="Ações rápidas do evento">
          <button class="icon-button icon-button-text" type="button" title="Editar evento" aria-label="Editar evento" data-action="edit"><span class="icon-button-glyph">${ICON_EDIT}</span><span class="icon-button-label">Editar</span></button>
          <button class="icon-button icon-button-text" type="button" title="Copiar link público" aria-label="Copiar link público" data-action="copy"><span class="icon-button-glyph">${ICON_SHARE}</span><span class="icon-button-label">Copiar link</span></button>
          <button class="icon-button icon-button-text danger event-delete" type="button" title="Excluir evento" aria-label="Excluir evento" data-action="delete"><span class="icon-button-glyph">${ICON_TRASH}</span><span class="icon-button-label">Excluir</span></button>
        </div>
      </div>

      <p class="my-event-date">Data e hora: <strong>${escapeHtml(formatEventDateTime(eventData))}</strong></p>
      ${renderEventDetails(eventData)}
      <p class="my-event-meta">Slug: <span>${escapeHtml(eventData.slug)}</span> · ${giftCount} presente(s) · ${guestCount} convidado(s)</p>

      <div class="my-event-primary-actions" aria-label="Ações principais do evento">
          <button class="btn btn-main-action btn-main-action-secondary with-icon" type="button" data-action="manage-guests">${ICON_GUESTS}Convidados</button>
          <button class="btn btn-main-action btn-main-action-primary with-icon" type="button" data-action="manage">${ICON_GIFT}Presentes</button>
          <button class="btn btn-main-action btn-main-action-secondary with-icon" type="button" data-action="manage-reservations">${ICON_HISTORY}Histórico de reservas</button>
      </div>

      <form class="event-edit-form my-event-edit-form" data-edit-form hidden>
        <div class="field field-flat">
          <label>Nome do evento</label>
          <input class="input" type="text" name="name" maxlength="120" value="${escapeAttribute(eventData.name)}" required />
        </div>
        <div class="field field-flat">
          <label>Nomes do casal</label>
          <input class="input" type="text" name="hostNames" maxlength="160" value="${escapeAttribute(eventData.hostNames)}" required />
        </div>
        <div class="row row-tight">
          <div class="field field-flat">
            <label>Data e hora</label>
            <input class="input" type="datetime-local" name="eventDateTime" max="${MAX_EVENT_DATE_TIME_LOCAL}" value="${escapeAttribute(toEventDateTimeInputValue(eventData))}" required />
          </div>
          <div class="field field-flat">
            <label>Fuso do evento</label>
            <select class="select" name="timeZoneId" required>${renderTimeZoneOptions(getEventTimeZoneId(eventData))}</select>
          </div>
        </div>
        <div class="field field-flat">
          <label>Nome do local</label>
          <input class="input" type="text" name="locationName" maxlength="160" value="${escapeAttribute(eventData.locationName)}" required />
        </div>
        <div class="field field-flat">
          <label>Endereço do local</label>
          <input class="input" type="text" name="locationAddress" maxlength="255" value="${escapeAttribute(eventData.locationAddress)}" required />
        </div>
        <div class="field field-flat">
          <label>Link do Google Maps</label>
          <input class="input" type="url" name="locationMapsUrl" maxlength="500" value="${escapeAttribute(eventData.locationMapsUrl)}" required />
        </div>
        <div class="field field-flat">
          <label>Informações da cerimônia</label>
          <textarea class="textarea" name="ceremonyInfo" maxlength="500" required>${escapeHtml(eventData.ceremonyInfo)}</textarea>
        </div>
        <div class="field field-flat">
          <label>Traje</label>
          <input class="input" type="text" name="dressCode" maxlength="160" value="${escapeAttribute(eventData.dressCode)}" required />
        </div>
        <div class="field field-flat">
          <label for="${editFieldPrefix}-invitation-message">Mensagem do convite</label>
          <textarea class="textarea" id="${editFieldPrefix}-invitation-message" name="invitationMessage" maxlength="500">${escapeHtml(eventData.invitationMessage)}</textarea>
        </div>
        <div class="field field-flat">
          <label for="${editFieldPrefix}-cover-image-url">URL da imagem de capa</label>
          <input class="input" id="${editFieldPrefix}-cover-image-url" type="url" name="coverImageUrl" maxlength="500" value="${escapeAttribute(eventData.coverImageUrl)}" />
        </div>
        <div class="row row-tight fit-content">
          <button class="btn btn-primary" type="submit">${UI_TEXT.common.save}</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-edit">${UI_TEXT.common.cancel}</button>
        </div>
      </form>
    `;

    const editForm = item.querySelector("[data-edit-form]");
    const editButton = item.querySelector('[data-action="edit"]');
    syncEditDateTimeBounds(editForm);

    item.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      try {
        const link = buildPublicEventLink(eventData.slug);
        await copyToClipboard(link);
        setEventsStatus("status-success", `${UI_TEXT.events.copySuccess} ${link}`);
      } catch (error) {
        setEventsStatus("status-error", `${UI_TEXT.events.copyError}: ${error.message}`);
      }
    });

    item.querySelector('[data-action="manage-guests"]').addEventListener("click", () => {
      window.location.href = `./my-guests.html?eventId=${encodeURIComponent(String(eventData.id))}`;
    });

    item.querySelector('[data-action="manage"]').addEventListener("click", () => {
      window.location.href = `./my-event.html?eventId=${encodeURIComponent(String(eventData.id))}`;
    });

    item.querySelector('[data-action="manage-reservations"]').addEventListener("click", () => {
      window.location.href = `./my-event.html?eventId=${encodeURIComponent(String(eventData.id))}#reservations-section`;
    });

    editButton.addEventListener("click", () => {
      const nextStateHidden = !editForm.hidden;
      editForm.hidden = nextStateHidden;
      editButton.classList.toggle("is-active", !nextStateHidden);
      editButton.setAttribute("aria-pressed", String(!nextStateHidden));
      editButton.setAttribute("aria-label", nextStateHidden ? "Editar evento" : "Fechar edição");
      editButton.setAttribute("title", nextStateHidden ? "Editar evento" : "Fechar edição");
    });

    editForm.elements.timeZoneId.addEventListener("change", () => {
      syncEditDateTimeBounds(editForm);
      validateEditDateTimeField(editForm);
    });

    editForm.elements.eventDateTime.addEventListener("input", () => {
      validateEditDateTimeField(editForm);
    });

    item.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => {
      editForm.hidden = true;
      editButton.classList.remove("is-active");
      editButton.setAttribute("aria-pressed", "false");
      editButton.setAttribute("aria-label", "Editar evento");
      editButton.setAttribute("title", "Editar evento");
      fillEventEditForm(editForm, eventData);
      setEventsStatus("status-info", `${UI_TEXT.common.editCancelled} Você pode retomar quando quiser.`);
    });

    editForm.addEventListener("submit", async (submitEvent) => {
      submitEvent.preventDefault();

      const submitButton = editForm.querySelector('button[type="submit"]');
      const values = readEnrichedEventFormValues(editForm.elements);
      const validationError = getEnrichedEventValidationError(values);

      if (validationError) {
        validateEditDateTimeField(editForm);
        setEventsStatus("status-error", validationError);
        return;
      }

      try {
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";
        setEventsStatus("status-loading", UI_TEXT.events.updating);

        const apiBase = getApiBase();
        await requestJson(`${apiBase}/api/events/${eventData.id}`, {
          method: "PUT",
          headers: authHeaders(token, true),
          body: JSON.stringify(buildEnrichedEventPayload(values))
        });

        setEventsStatus("status-success", UI_TEXT.events.updated);
        await loadMyEvents();
      } catch (error) {
        setEventsStatus("status-error", String(error.message || UI_TEXT.events.updateError));
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = UI_TEXT.common.save;
      }
    });

    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmation = window.confirm(UI_TEXT.confirms.deleteEvent(eventData.name));
      if (!confirmation) return;

      try {
        setEventsStatus("status-loading", UI_TEXT.events.deleting);
        const apiBase = getApiBase();

        await requestJson(`${apiBase}/api/events/${eventData.id}`, {
          method: "DELETE",
          headers: authHeaders(token)
        });

        setEventsStatus("status-success", UI_TEXT.events.deleted);
        await loadMyEvents();
      } catch (error) {
        setEventsStatus("status-error", String(error.message || UI_TEXT.events.deleteError));
      }
    });

    eventsList.appendChild(item);
  });
}

function renderEventDetails(eventData) {
  const rows = [
    ["Casal", eventData.hostNames],
    ["Local", eventData.locationName],
    ["Endereço", eventData.locationAddress],
    ["Cerimônia", eventData.ceremonyInfo],
    ["Traje", eventData.dressCode],
    ["Mensagem do convite", eventData.invitationMessage],
    ["Fuso", getTimeZoneLabel(getEventTimeZoneId(eventData))]
  ].filter(([, value]) => String(value || "").trim());

  const linkRows = [
    ["Mapa", eventData.locationMapsUrl],
    ["Imagem de capa", eventData.coverImageUrl]
  ].filter(([, value]) => String(value || "").trim());

  if (!rows.length && !linkRows.length) return "";

  return `
    <dl class="my-event-details">
      ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      ${linkRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd><a href="${escapeAttribute(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a></dd></div>`).join("")}
    </dl>
  `;
}

function syncEditDateTimeBounds(editForm) {
  editForm.elements.eventDateTime.min = minFutureEventDateTimeLocalValue(editForm.elements.timeZoneId.value);
  editForm.elements.eventDateTime.max = MAX_EVENT_DATE_TIME_LOCAL;
}

function validateEditDateTimeField(editForm) {
  const value = editForm.elements.eventDateTime.value;
  if (!value) {
    editForm.elements.eventDateTime.setCustomValidity("");
    return;
  }

  if (!isFutureEventDateTime(value, editForm.elements.timeZoneId.value)) {
    editForm.elements.eventDateTime.setCustomValidity("Informe uma data e hora futuras para o evento.");
    return;
  }

  editForm.elements.eventDateTime.setCustomValidity("");
}

function fillEventEditForm(editForm, eventData) {
  editForm.elements.name.value = eventData.name || "";
  editForm.elements.hostNames.value = eventData.hostNames || "";
  editForm.elements.eventDateTime.value = toEventDateTimeInputValue(eventData);
  editForm.elements.timeZoneId.innerHTML = renderTimeZoneOptions(getEventTimeZoneId(eventData));
  editForm.elements.locationName.value = eventData.locationName || "";
  editForm.elements.locationAddress.value = eventData.locationAddress || "";
  editForm.elements.locationMapsUrl.value = eventData.locationMapsUrl || "";
  editForm.elements.ceremonyInfo.value = eventData.ceremonyInfo || "";
  editForm.elements.dressCode.value = eventData.dressCode || "";
  editForm.elements.invitationMessage.value = eventData.invitationMessage || "";
  editForm.elements.coverImageUrl.value = eventData.coverImageUrl || "";
  syncEditDateTimeBounds(editForm);
  validateEditDateTimeField(editForm);
}

function applyFocusFromQueryIfNeeded() {
  if (!shouldFocusFromQuery) return false;

  const targetCard = eventsList.querySelector(`[data-event-id="${focusEventIdFromQuery}"]`);
  shouldFocusFromQuery = false;

  if (!targetCard) return false;

  targetCard.classList.add("event-item-focus");
  targetCard.scrollIntoView({ behavior: "smooth", block: "center" });

  window.setTimeout(() => {
    targetCard.classList.remove("event-item-focus");
  }, 2600);

  return true;
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll("`", "&#096;");
}

function setEventsStatus(type, message, { subtle = false } = {}) {
  setStatus(status, type, message);
  status.classList.toggle("my-events-status-subtle", subtle);
}
