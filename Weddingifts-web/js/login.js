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
    const backendMessage = String(error.message || "");
    setStatus(status, "status-error", backendMessage || "Não foi possível entrar. Tente novamente.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
