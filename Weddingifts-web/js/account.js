import {
  authHeaders,
  formatDateTime,
  getApiBase,
  initUserDropdown,
  logoutAndRedirectToLogin,
  requestJson,
  requireAuth,
  setStatus,
  UI_TEXT
} from "./common.js";

const session = requireAuth();
if (!session) throw new Error("Autenticação obrigatória.");

const accountData = document.getElementById("account-data");
const form = document.getElementById("change-password-form");
const status = document.getElementById("status");
const submitButton = document.getElementById("change-password-button");
const DEFAULT_BUTTON_LABEL = `${lockIcon()}Salvar nova senha`;
const LOADING_BUTTON_LABEL = `${spinnerIcon()}Salvando...`;

initUserDropdown({
  session,
  onLogout: () => {
    logoutAndRedirectToLogin();
  }
});

renderAccount();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const activeSession = requireAuth();
  if (!activeSession) {
    return;
  }

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!currentPassword) {
    setStatus(status, "status-error", "Informe sua senha atual.");
    return;
  }

  if (newPassword.length < 8) {
    setStatus(status, "status-error", "A nova senha deve ter pelo menos 8 caracteres.");
    return;
  }

  if (newPassword.length > 72) {
    setStatus(status, "status-error", "A nova senha excede o tamanho máximo permitido.");
    return;
  }

  if (!isStrongPassword(newPassword)) {
    setStatus(status, "status-error", "A nova senha deve conter letra, número e caractere especial.");
    return;
  }

  if (currentPassword === newPassword) {
    setStatus(status, "status-error", "A nova senha deve ser diferente da senha atual.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(status, "status-error", "A confirmação de senha não confere.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = LOADING_BUTTON_LABEL;
    setStatus(status, "status-loading", UI_TEXT.auth.passwordChangeLoading);

    await requestJson(`${getApiBase()}/api/users/me/password`, {
      method: "PUT",
      skipAuthRedirect: true,
      headers: authHeaders(activeSession.token, true),
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    form.reset();
    setStatus(status, "status-success", UI_TEXT.auth.passwordChangeSuccess);
  } catch (error) {
    setStatus(status, "status-error", String(error.message || UI_TEXT.auth.passwordChangeError));
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = DEFAULT_BUTTON_LABEL;
  }
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

function isStrongPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(password || ""));
}

function lockIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v10h14V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6zm2 11a2 2 0 0 1-1-3.7V11h2v2.3A2 2 0 0 1 12 17z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}
