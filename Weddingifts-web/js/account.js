import {
  clearAuthSession,
  formatDateTime,
  initUserDropdown,
  requireAuth,
  setStatus
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autentica\\u00E7\\u00E3o obrigat\\u00F3ria.");

const accountData = document.getElementById("account-data");
const form = document.getElementById("change-password-form");
const status = document.getElementById("status");

initUserDropdown({
  session,
  onLogout: () => {
    clearAuthSession();
    window.location.href = "./login.html";
  }
});

renderAccount();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword.length < 6) {
    setStatus(status, "status-error", "A nova senha precisa ter ao menos 6 caracteres.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(status, "status-error", "A confirma\\u00E7\\u00E3o de senha n\\u00E3o confere.");
    return;
  }

  setStatus(status, "status-info", "Altera\\u00E7\\u00E3o de senha ainda n\\u00E3o est\\u00E1 dispon\\u00EDvel no backend. A interface j\\u00E1 est\\u00E1 preparada.");
});

function renderAccount() {
  const user = session.user || {};

  accountData.innerHTML = `
    <p class="meta"><strong>Nome:</strong> ${escapeHtml(user.name || "--")}</p>
    <p class="meta"><strong>Email:</strong> ${escapeHtml(user.email || "--")}</p>
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

