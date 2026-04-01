import {
  authHeaders,
  getApiBase,
  getAuthSession,
  requestJson,
  saveAuthSession,
  setStatus
} from "./common.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const status = document.getElementById("status");
const submitButton = document.getElementById("submit-button");
const LOGIN_BUTTON_DEFAULT = `${loginIcon()}Entrar`;
const LOGIN_BUTTON_LOADING = `${spinnerIcon()}Entrando...`;

const session = getAuthSession();
if (session?.token) {
  window.location.replace("./create-event.html");
}

const params = new URLSearchParams(window.location.search);
const prefilledEmail = params.get("email");
const fromRegistration = params.get("registered") === "1";

if (prefilledEmail) {
  emailInput.value = prefilledEmail;
}

if (fromRegistration) {
  setStatus(
    status,
    "status-info",
    "Cadastro concluído. Você recebeu um e-mail para validar sua conta. Em breve essa validação estará ativa no sistema."
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = document.getElementById("password-input").value;
  const apiBase = getApiBase();

  if (!email || !password) {
    setStatus(status, "status-error", "Informe e-mail e senha.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = LOGIN_BUTTON_LOADING;
    setStatus(status, "status-loading", "Validando suas credenciais...");

    const login = await requestJson(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    saveAuthSession(login);

    const redirectTarget = await resolvePostLoginRedirect(apiBase, login?.token || login?.Token);

    setStatus(status, "status-success", "Login realizado com sucesso. Redirecionando...");

    window.setTimeout(() => {
      window.location.href = redirectTarget;
    }, 420);
  } catch (error) {
    const backendMessage = String(error.message || "");
    setStatus(status, "status-error", backendMessage || "Não foi possível entrar. Tente novamente.");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = LOGIN_BUTTON_DEFAULT;
  }
});

async function resolvePostLoginRedirect(apiBase, token) {
  if (!token) return "./create-event.html";

  try {
    const events = await requestJson(`${apiBase}/api/events/mine`, {
      headers: authHeaders(token)
    });

    if (Array.isArray(events) && events.length > 0) {
      return "./my-events.html";
    }

    return "./create-event.html";
  } catch {
    return "./create-event.html";
  }
}

function loginIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}
