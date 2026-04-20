import {
  getApiBase,
  getAuthSession,
  resolvePostLoginPath,
  resolveSafeReturnTo,
  requestJson,
  saveAuthSession,
  setStatus,
  UI_TEXT
} from "./common.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const status = document.getElementById("status");
const submitButton = document.getElementById("submit-button");
const LOGIN_BUTTON_DEFAULT = `${loginIcon()}Entrar`;
const LOGIN_BUTTON_LOADING = `${spinnerIcon()}Entrando...`;

const params = new URLSearchParams(window.location.search);
const returnTo = params.get("returnTo");

const session = getAuthSession();
if (session?.token) {
  const safeReturnTo = resolveSafeReturnTo(returnTo);
  if (safeReturnTo) {
    window.location.replace(safeReturnTo);
  } else {
    window.location.replace("./create-event.html");
  }
}

const prefilledEmail = params.get("email");
const fromRegistration = params.get("registered") === "1";
const fromExpiredSession = params.get("sessionExpired") === "1";
const fromLogout = params.get("loggedOut") === "1";

if (prefilledEmail) {
  emailInput.value = prefilledEmail;
}

if (fromRegistration) {
  setStatus(status, "status-info", UI_TEXT.auth.registerSuccess);
} else if (fromExpiredSession) {
  setStatus(status, "status-info", UI_TEXT.common.sessionExpired);
} else if (fromLogout) {
  setStatus(status, "status-success", UI_TEXT.auth.logoutDone);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = document.getElementById("password-input").value;
  const apiBase = getApiBase();

  if (!email || !password) {
    setStatus(status, "status-error", UI_TEXT.auth.loginInitial);
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerHTML = LOGIN_BUTTON_LOADING;
    setStatus(status, "status-loading", UI_TEXT.auth.loginLoading);

    const login = await requestJson(`${apiBase}/api/auth/login`, {
      method: "POST",
      skipAuthRedirect: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    saveAuthSession(login);

    const redirectTarget = await resolvePostLoginPath(apiBase, login?.token || login?.Token, returnTo);
    setStatus(status, "status-success", UI_TEXT.auth.loginSuccess);

    window.setTimeout(() => {
      window.location.href = redirectTarget;
    }, 420);
  } catch (error) {
    const backendMessage = String(error.message || "");
    const invalidCredentialsMessage = UI_TEXT.auth.invalidCredentials;
    const message = backendMessage === invalidCredentialsMessage
      ? invalidCredentialsMessage
      : (backendMessage || UI_TEXT.auth.loginError);

    setStatus(status, "status-error", message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = LOGIN_BUTTON_DEFAULT;
  }
});

function loginIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z" fill="currentColor"/></svg></span>';
}

function spinnerIcon() {
  return '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
}
