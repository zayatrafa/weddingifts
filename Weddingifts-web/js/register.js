import {
  getApiBase,
  requestJson,
  setStatus
} from "./common.js";

const form = document.getElementById("register-form");
const status = document.getElementById("status");
const submitButton = document.getElementById("submit-button");
const cpfInput = document.getElementById("cpf-input");

cpfInput.addEventListener("input", () => {
  cpfInput.value = formatCpfInput(cpfInput.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name-input").value.trim();
  const email = document.getElementById("email-input").value.trim();
  const cpf = digitsOnly(cpfInput.value);
  const birthDate = document.getElementById("birth-date-input").value;
  const password = document.getElementById("password-input").value;
  const confirmPassword = document.getElementById("confirm-password-input").value;
  const apiBase = getApiBase();

  if (!name || !email || !cpf || !birthDate || !password || !confirmPassword) {
    setStatus(status, "status-error", "Preencha todos os campos obrigatórios.");
    return;
  }

  if (!isValidCpf(cpf)) {
    setStatus(status, "status-error", "Informe um CPF válido.");
    return;
  }

  if (password.length < 6) {
    setStatus(status, "status-error", "A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(status, "status-error", "A confirmação de senha não confere.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Cadastrando...";

    await requestJson(`${apiBase}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, cpf, birthDate, password })
    });

    window.location.href = `./login.html?email=${encodeURIComponent(email)}&registered=1`;
  } catch (error) {
    setStatus(status, "status-error", `Falha ao cadastrar usuário: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar conta";
  }
});

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfInput(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const firstVerifier = calculateVerifier(digits, 9, 10);
  if (digits[9] !== firstVerifier) return false;

  const secondVerifier = calculateVerifier(digits, 10, 11);
  return digits[10] === secondVerifier;
}

function calculateVerifier(digits, length, initialWeight) {
  let sum = 0;

  for (let index = 0; index < length; index += 1) {
    sum += digits[index] * (initialWeight - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
