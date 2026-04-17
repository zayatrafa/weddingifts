import {
  formatDateTime,
  initUserDropdown,
  logoutAndRedirectToLogin,
  requireAuth,
  setStatus,
  UI_TEXT
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const accountData = document.getElementById("account-data");
const form = document.getElementById("change-password-form");
const status = document.getElementById("status");

initUserDropdown({
  session,
  onLogout: () => {
    logoutAndRedirectToLogin();
  }
});

renderAccount();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword.length < 8) {
    setStatus(status, "status-error", "A nova senha deve ter pelo menos 8 caracteres.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(status, "status-error", "A confirmação de senha não confere.");
    return;
  }

  setStatus(status, "status-info", UI_TEXT.auth.passwordPending);
});

function renderAccount() {
  const user = session.user || {};

  accountData.innerHTML = `
    <p class="meta"><strong>Nome:</strong> ${escapeHtml(user.name || "--")}</p>
    <p class="meta"><strong>E-mail:</strong> ${escapeHtml(user.email || "--")}</p>
    <p class="meta"><strong>ID:</strong> ${typeof user.id === "number" ? user.id : "--"}</p>
    <p class="meta"><strong>Criado em:</strong> ${formatDateTime(user.createdAt)}</p>
  `;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
