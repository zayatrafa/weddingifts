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
if (!session) throw new Error("Authentication required.");

const token = session.token;
const refreshEventsButton = document.getElementById("refresh-events-button");
const eventsList = document.getElementById("events-list");
const status = document.getElementById("status");

const state = { events: [] };

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

    setStatus(
      status,
      state.events.length ? "status-success" : "status-info",
      state.events.length ? "Eventos carregados com sucesso." : "Você ainda não possui eventos."
    );
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
    item.className = "event-item";
    const giftCount = Array.isArray(eventData.gifts) ? eventData.gifts.length : 0;

    item.innerHTML = `
      <button class="icon-button danger event-delete" type="button" title="Excluir evento" aria-label="Excluir evento" data-action="delete">&#128465;</button>
      <div class="event-head">
        <div>
          <h3 class="event-title">${escapeHtml(eventData.name)}</h3>
          <p class="meta">Data: ${formatDate(eventData.eventDate)} | Slug: ${escapeHtml(eventData.slug)} | ${giftCount} presente(s)</p>
        </div>
        <span class="tag tag-ok">Publicado</span>
      </div>

      <form class="event-edit-form" data-edit-form hidden>
        <div class="field field-flat">
          <label>Nome do evento</label>
          <input class="input" type="text" name="name" value="${escapeAttribute(eventData.name)}" required />
        </div>
        <div class="field field-flat">
          <label>Data</label>
          <input class="input" type="date" name="eventDate" value="${toInputDate(eventData.eventDate)}" required />
        </div>
        <div class="row row-tight fit-content">
          <button class="btn btn-primary" type="submit">Salvar alterações</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>

      <div class="row row-tight top-gap-sm">
        <button class="btn btn-ghost" data-action="copy">Copiar link público</button>
        <button class="btn btn-secondary" data-action="edit">Editar evento</button>
        <button class="btn btn-ghost" data-action="manage-guests">Gerenciar convidados</button>
        <button class="btn btn-primary" data-action="manage">Gerenciar presentes</button>
      </div>
    `;

    const editForm = item.querySelector("[data-edit-form]");
    const editButton = item.querySelector('[data-action="edit"]');

    item.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      try {
        const link = buildPublicEventLink(eventData.slug);
        await copyToClipboard(link);
        setStatus(status, "status-success", `Link público copiado: ${link}`);
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

    editButton.addEventListener("click", () => {
      const nextStateHidden = !editForm.hidden;
      editForm.hidden = nextStateHidden;
      editButton.textContent = nextStateHidden ? "Editar evento" : "Ocultar edição";
    });

    item.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => {
      editForm.hidden = true;
      editButton.textContent = "Editar evento";
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
        setStatus(status, "status-error", `Falha ao atualizar evento: ${error.message}`);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar alterações";
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

        setStatus(status, "status-success", "Evento excluído com sucesso.");
        await loadMyEvents();
      } catch (error) {
        setStatus(status, "status-error", `Falha ao excluir evento: ${error.message}`);
      }
    });

    eventsList.appendChild(item);
  });
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
