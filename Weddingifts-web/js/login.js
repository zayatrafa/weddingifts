import {
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

const session = getAuthSession();
if (session?.token) {
  window.location.replace("./create-event.html");
}

const params = new URLSearchParams(window.location.search);
const prefilledEmail = params.get("email");
if (prefilledEmail) {
  emailInput.value = prefilledEmail;
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
    submitButton.textContent = "Entrando...";
    setStatus(status, "status-loading", "Validando suas credenciais...");

    const login = await requestJson(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    saveAuthSession(login);
    setStatus(status, "status-success", "Login realizado com sucesso. Redirecionando...");

    window.setTimeout(() => {
      window.location.href = "./create-event.html";
    }, 420);
  } catch (error) {
    setStatus(status, "status-error", `N\u00e3o foi poss\u00edvel entrar: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
