import {
  authHeaders,
  buildPublicEventLink,
  clearAuthSession,
  formatDate,
  getApiBase,
  initUserDropdown,
  requestJson,
  requireAuth,
  setStatus
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autentica\\u00E7\\u00E3o obrigat\\u00F3ria.");

const token = session.token;
const refreshEventsButton = document.getElementById("refresh-events-button");
const eventsList = document.getElementById("events-list");
const status = document.getElementById("status");

const query = new URLSearchParams(window.location.search);
const focusEventIdFromQuery = Number(query.get("focusEventId"));
let shouldFocusFromQuery = Number.isInteger(focusEventIdFromQuery) && focusEventIdFromQuery > 0;
const minEventDate = tomorrowDateIso();

const state = { events: [] };
const MAX_EVENT_NAME_LENGTH = 120;
const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.05-9.06.92.92-9.05 9.06zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.49 1.5 3.75 3.75 1.49-1.5z" fill="currentColor"/></svg>';
const ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 0-1 1v8.59L8.7 10.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l4-4a1 1 0 1 0-1.4-1.4L13 12.59V4a1 1 0 0 0-1-1z" fill="currentColor"/><path d="M5 13a1 1 0 0 0-1 1v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 1 0-2 0v5H6v-5a1 1 0 0 0-1-1z" fill="currentColor"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 3h4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const ICON_GUESTS = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-6 2.2-6 5v1h12v-1c0-2.8-2.7-5-6-5zm8-2a3 3 0 1 0-2.2-5 6 6 0 0 1 .4 2c0 1.2-.3 2.3-.9 3.2.8.5 1.7.8 2.7.8zm1 2c-.8 0-1.6.1-2.3.4 1.4 1.1 2.3 2.8 2.3 4.6v1h4v-1c0-2.8-1.8-5-4-5z" fill="currentColor"/></svg></span>';
const ICON_GIFT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';
const ICON_HISTORY = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 1 0 8.9 10.5h-2.1A7 7 0 1 1 13 5v3l4-4-4-4v3zm-1 5h2v6h-5v-2h3V8z" fill="currentColor"/></svg></span>';

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

refreshEventsButton.addEventListener("click", loadMyEvents);
loadMyEvents();

async function loadMyEvents() {
  try {
    refreshEventsButton.disabled = true;
    setStatus(status, "status-loading", "Carregando seus eventos...");

    const apiBase = getApiBase();
    state.events = await requestJson(`${apiBase}/api/events/mine`, {
      headers: authHeaders(token)
    });

    renderEvents();

    if (applyFocusFromQueryIfNeeded()) {
      setStatus(status, "status-success", "Evento criado e destacado com sucesso.");
    } else {
      setStatus(
        status,
        state.events.length ? "status-success" : "status-info",
        state.events.length ? "Eventos carregados com sucesso." : "Voc\\u00EA ainda n\\u00E3o possui eventos."
      );
    }
  } catch (error) {
    setStatus(status, "status-error", `Falha ao carregar eventos: ${error.message}`);
  } finally {
    refreshEventsButton.disabled = false;
  }
}

function renderEvents() {
  if (!state.events.length) {
    eventsList.innerHTML = '<div class="center-empty">Nenhum evento cadastrado ainda.</div>';
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

    item.innerHTML = `
      <div class="my-event-top">
        <div class="my-event-main">
          <h3 class="event-title">${escapeHtml(eventData.name)}</h3>
          <span class="tag tag-ok my-event-status">Publicado</span>
        </div>
        <div class="my-event-quick-actions" aria-label="A\\u00E7\\u00F5es r\\u00E1pidas do evento">
          <button class="icon-button" type="button" title="Editar evento" aria-label="Editar evento" data-action="edit">${ICON_EDIT}</button>
          <button class="icon-button" type="button" title="Copiar link p\\u00FAblico" aria-label="Copiar link p\\u00FAblico" data-action="copy">${ICON_SHARE}</button>
          <button class="icon-button danger event-delete" type="button" title="Excluir evento" aria-label="Excluir evento" data-action="delete">${ICON_TRASH}</button>
        </div>
      </div>

      <p class="my-event-date">Data do evento: <strong>${formatDate(eventData.eventDate)}</strong></p>
      <p class="my-event-meta">Slug: <span>${escapeHtml(eventData.slug)}</span> \\u00B7 ${giftCount} presente(s) \\u00B7 ${guestCount} convidado(s)</p>

      <div class="my-event-primary-actions" aria-label="A\\u00E7\\u00F5es principais do evento">
        <button class="btn btn-secondary btn-main-action with-icon" type="button" data-action="manage-guests">${ICON_GUESTS}Convidados</button>
        <button class="btn btn-primary btn-main-action with-icon" type="button" data-action="manage">${ICON_GIFT}Presentes</button>
        <button class="btn btn-secondary btn-main-action with-icon" type="button" data-action="manage-reservations">${ICON_HISTORY}Hist\\u00F3rico de reservas</button>
      </div>

      <form class="event-edit-form my-event-edit-form" data-edit-form hidden>
        <div class="field field-flat">
          <label>Nome do evento</label>
          <input class="input" type="text" name="name" maxlength="120" value="${escapeAttribute(eventData.name)}" required />
        </div>
        <div class="field field-flat">
          <label>Data</label>
          <input class="input" type="date" name="eventDate" min="${minEventDate}" value="${toInputDate(eventData.eventDate)}" required />
        </div>
        <div class="row row-tight fit-content">
          <button class="btn btn-primary" type="submit">Salvar altera\\u00E7\\u00F5es</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    `;

    const editForm = item.querySelector("[data-edit-form]");
    const editButton = item.querySelector('[data-action="edit"]');

    item.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      try {
        const link = buildPublicEventLink(eventData.slug);
        await copyToClipboard(link);
        setStatus(status, "status-success", `Link p\\u00FAblico copiado: ${link}`);
      } catch (error) {
        setStatus(status, "status-error", `Falha ao copiar link: ${error.message}`);
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
      editButton.setAttribute("aria-label", nextStateHidden ? "Editar evento" : "Fechar edi\\u00E7\\u00E3o");
      editButton.setAttribute("title", nextStateHidden ? "Editar evento" : "Fechar edi\\u00E7\\u00E3o");
    });

    item.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => {
      editForm.hidden = true;
      editButton.classList.remove("is-active");
      editButton.setAttribute("aria-pressed", "false");
      editButton.setAttribute("aria-label", "Editar evento");
      editButton.setAttribute("title", "Editar evento");
      editForm.reset();
      editForm.elements.name.value = eventData.name;
      editForm.elements.eventDate.value = toInputDate(eventData.eventDate);
    });

    editForm.addEventListener("submit", async (submitEvent) => {
      submitEvent.preventDefault();

      const submitButton = editForm.querySelector('button[type="submit"]');
      const name = editForm.elements.name.value.trim();
      const eventDate = editForm.elements.eventDate.value;

      if (!name || !eventDate) {
        setStatus(status, "status-error", "Informe nome e data para atualizar o evento.");
        return;
      }

      if (name.length > MAX_EVENT_NAME_LENGTH) {
        setStatus(status, "status-error", "O nome do evento deve ter no m\\u00E1ximo 120 caracteres.");
        return;
      }

      if (!isFutureDate(eventDate)) {
        setStatus(status, "status-error", "A data do evento deve ser futura.");
        return;
      }

      try {
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";
        setStatus(status, "status-loading", "Atualizando evento...");

        const apiBase = getApiBase();
        await requestJson(`${apiBase}/api/events/${eventData.id}`, {
          method: "PUT",
          headers: authHeaders(token, true),
          body: JSON.stringify({ name, eventDate })
        });

        setStatus(status, "status-success", "Evento atualizado com sucesso.");
        await loadMyEvents();
      } catch (error) {
        setStatus(status, "status-error", String(error.message || "N\\u00E3o foi poss\\u00EDvel atualizar o evento."));
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar altera\\u00E7\\u00F5es";
      }
    });

    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmation = window.confirm(`Tem certeza que deseja excluir o evento \"${eventData.name}\"?`);
      if (!confirmation) return;

      try {
        setStatus(status, "status-loading", "Excluindo evento...");
        const apiBase = getApiBase();

        await requestJson(`${apiBase}/api/events/${eventData.id}`, {
          method: "DELETE",
          headers: authHeaders(token)
        });

        setStatus(status, "status-success", "Evento exclu\\u00EDdo com sucesso.");
        await loadMyEvents();
      } catch (error) {
        setStatus(status, "status-error", String(error.message || "N\\u00E3o foi poss\\u00EDvel excluir o evento."));
      }
    });

    eventsList.appendChild(item);
  });
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

function toInputDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isFutureDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;

  const selectedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) return false;

  const [year, month, day] = dateValue.split("-").map(Number);
  if (
    selectedDate.getFullYear() !== year
    || selectedDate.getMonth() + 1 !== month
    || selectedDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate > today;
}

function tomorrowDateIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return toLocalDateIso(date);
}

function toLocalDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
