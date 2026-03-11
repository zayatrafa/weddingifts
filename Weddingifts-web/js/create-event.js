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
const createEventForm = document.getElementById("create-event-form");
const status = document.getElementById("status");

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
  const eventDate = document.getElementById("event-date-input").value;
  const submitButton = document.getElementById("event-submit-button");

  if (!name || !eventDate) {
    setStatus(status, "status-error", "Informe nome e data do evento.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Criando...";
    setStatus(status, "status-loading", "Criando evento...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, eventDate })
    });

    createEventForm.reset();
    setStatus(status, "status-success", "Evento criado com sucesso. Agora vá em 'Gerenciar meus eventos'.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao criar evento: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar evento";
  }
}
