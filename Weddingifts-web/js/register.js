import {
  attachApiBaseInput,
  formatDateTime,
  getApiBase,
  requestJson,
  setStatus
} from "./common.js";

const form = document.getElementById("register-form");
const apiBaseInput = document.getElementById("api-base-input");
const status = document.getElementById("status");
const submitButton = document.getElementById("submit-button");

attachApiBaseInput(apiBaseInput);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name-input").value.trim();
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value;
  const apiBase = getApiBase();

  if (!name || !email || !password) {
    setStatus(status, "status-error", "Preencha nome, email e senha.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Cadastrando...";
    setStatus(status, "status-loading", "Enviando cadastro para o backend...");

    const createdUser = await requestJson(`${apiBase}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    document.getElementById("password-input").value = "";
    setStatus(
      status,
      "status-success",
      `Usuario criado com sucesso: ID ${createdUser.id} | ${createdUser.name} | ${createdUser.email} | ${formatDateTime(createdUser.createdAt)}.`
    );

    const loginLink = document.getElementById("login-link");
    loginLink.href = `./login.html?email=${encodeURIComponent(createdUser.email)}`;
  } catch (error) {
    setStatus(status, "status-error", `Falha ao cadastrar usuario: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar conta";
  }
});
