import {
  getApiBase,
  requestJson,
  setStatus
} from "./common.js";

const form = document.getElementById("register-form");
const status = ensureStatusElement();
const submitButton = document.getElementById("submit-button");
const cpfInput = document.getElementById("cpf-input");
const birthDateInput = document.getElementById("birth-date-input");
const REGISTER_BUTTON_DEFAULT = `${accountPlusIcon()}Criar conta`;
const REGISTER_BUTTON_LOADING = `${spinnerIcon()}Cadastrando...`;
const MAX_NAME_LENGTH = 120;

birthDateInput.max = todayDateIso();

cpfInput.addEventListener("input", () => {
  cpfInput.value = formatCpfInput(cpfInput.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name-input").value.trim();
  const email = document.getElementById("email-input").value.trim();
  const cpf = digitsOnly(cpfInput.value);
  const birthDate = birthDateInput.value;
  const password = document.getElementById("password-input").value;
  const confirmPassword = document.getElementById("confirm-password-input").value;
  const apiBase = getApiBase();

  if (!name || !email || !cpf || !birthDate || !password || !confirmPassword) {
    setStatus(status, "status-error", "Preencha todos os campos obrigat\\u00F3rios.");
    return;
  }

  if (!isValidPersonName(name)) {
    setStatus(status, "status-error", "O nome deve conter apenas letras.");
    return;
  }

  if (name.length > MAX_NAME_LENGTH) {
    setStatus(status, "status-error", "O nome deve ter no m\\u00E1ximo 120 caracteres.");
    return;
  }

  if (!isValidEmail(email)) {
    setStatus(status, "status-error", "Informe um e-mail v\\u00E1lido.");
    return;
  }

  if (!isValidCpf(cpf)) {
    setStatus(status, "status-error", "Informe um CPF v\\u00E1lido.");
    return;
  }

  if (password.length < 8) {
    setStatus(status, "status-error", "A senha deve ter pelo menos 8 caracteres.");
    return;
  }

  if (!isStrongPassword(password)) {
    setStatus(status, "status-error", "A senha deve conter letra, n\\u00FAmero e caractere especial.");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(status, "status-error", "A confirma\\u00E7\\u00E3o de senha n\\u00E3o confere.");
    return;
  }

  if (!isValidBirthDate(birthDate)) {
    setStatus(status, "status-error", "Informe uma data de nascimento v\\u00E1lida no formato AAAA-MM-DD.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = REGISTER_BUTTON_LOADING;

    await requestJson(`${apiBase}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, cpf, birthDate, password })
    });

    window.location.href = `./login.html?email=${encodeURIComponent(email)}&registered=1`;
  } catch (error) {
    setStatus(status, "status-error", String(error.message || "N\\u00E3o foi poss\\u00EDvel concluir seu cadastro."));
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = REGISTER_BUTTON_DEFAULT;
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

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/i.test(email);
}

function isValidPersonName(name) {
  return /^[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF'-]+(?:\s+[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF'-]+)*$/u.test(String(name || "").trim());
}

function isStrongPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(password || ""));
}

function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (
    parsedDate.getFullYear() !== year
    || parsedDate.getMonth() + 1 !== month
    || parsedDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsedDate <= today;
}

function todayDateIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toLocalDateIso(today);
}

function toLocalDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function accountPlusIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 12a5 5 0 1 0-6 0 7 7 0 0 0-5 6.7V21h16v-2.3A7 7 0 0 0 15 12zm-3-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 14a5 5 0 0 1 10 0H6zm14-8h-2V9h-2V7h2V5h2v2h2v2h-2v2z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}

function ensureStatusElement() {
  const existing = document.getElementById("status");
  if (existing) return existing;

  const fallback = document.createElement("p");
  fallback.id = "status";
  fallback.className = "status status-info";
  fallback.textContent = "Preencha os dados para criar sua conta.";
  form?.appendChild(fallback);
  return fallback;
}
