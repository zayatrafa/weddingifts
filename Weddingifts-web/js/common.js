export const DEFAULT_API_BASE = "http://localhost:5298";
const AUTH_KEY = "wg_auth_session";

const STATUS_CLASSES = ["status-info", "status-success", "status-error", "status-loading"];
const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

export function getApiBase() {
  return DEFAULT_API_BASE;
}

export function extractErrorMessage(raw) {
  if (!raw) return GENERIC_ERROR_MESSAGE;

  try {
    const payload = JSON.parse(raw);

    if (typeof payload?.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }

    if (payload?.errors && typeof payload.errors === "object") {
      const first = Object.values(payload.errors)
        .flat()
        .find((item) => typeof item === "string" && item.trim());

      if (first) return first;
    }

    if (typeof payload?.title === "string" && payload.title.trim()) {
      return payload.title;
    }
  } catch {
    // ignore parse failures
  }

  return GENERIC_ERROR_MESSAGE;
}

export async function requestJson(url, options = {}) {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    if (!skipAuthRedirect && (response.status === 401 || response.status === 403) && getAuthSession()) {
      clearAuthSession();

      const currentPath = `${window.location.pathname}${window.location.search || ""}`;
      const returnTo = encodeURIComponent(currentPath);
      window.location.href = `./login.html?sessionExpired=1&returnTo=${returnTo}`;
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    const payload = await response.text();
    throw new Error(extractErrorMessage(payload));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function authHeaders(token, includeJson = false) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function getAuthSession() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const token = parsed?.token || parsed?.Token;
    const user = parsed?.user || parsed?.User;
    const expiresAt = parsed?.expiresAt || parsed?.ExpiresAt;

    if (!token) return null;

    if (isExpired(expiresAt)) {
      clearAuthSession();
      return null;
    }

    return { token, user, expiresAt };
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function requireAuth() {
  const hadPreviousSession = !!localStorage.getItem(AUTH_KEY);
  const session = getAuthSession();
  if (!session) {
    const currentPath = `${window.location.pathname}${window.location.search || ""}`;
    const returnTo = encodeURIComponent(currentPath);
    const sessionFlag = hadPreviousSession ? "sessionExpired=1&" : "";
    window.location.href = `./login.html?${sessionFlag}returnTo=${returnTo}`;
    return null;
  }

  return session;
}

export function initUserDropdown({ session, onLogout }) {
  const menuButton = document.getElementById("user-menu-button");
  const menu = document.getElementById("user-menu");
  const logoutButton = document.getElementById("logout-action");

  if (!menuButton || !menu) return;

  const displayName = session?.user?.name || session?.user?.email || "Minha conta";
  const nameSlot = menuButton.querySelector(".user-chip-name");
  if (nameSlot) {
    nameSlot.textContent = displayName;
  } else {
    menuButton.textContent = displayName;
  }

  const closeMenu = () => {
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
  };

  menuButton.addEventListener("click", () => {
    if (menu.hidden) openMenu(); else closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      closeMenu();
      onLogout?.();
    });
  }
}

export function getUserMenuMarkup() {
  return `
    <div class="user-menu-wrap">
      <button id="user-menu-button" class="user-chip" type="button" aria-expanded="false" aria-haspopup="menu">
        <span class="user-chip-name">Minha conta</span>
        <span class="user-chip-caret" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
        </span>
      </button>
      <div id="user-menu" class="user-menu" hidden>
        <div class="user-menu-header">
          <span class="user-menu-avatar" aria-hidden="true">♡</span>
          <div class="user-menu-header-copy">
            <strong>Sua conta</strong>
            <span>Acesso rápido</span>
          </div>
        </div>
        <a class="menu-item menu-item-primary" href="./create-event.html">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z" fill="currentColor"/></svg></span>
          <span>Novo evento</span>
        </a>
        <div class="menu-divider"></div>
        <span class="menu-group">Gerenciamento</span>
        <a class="menu-item" href="./my-events.html">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v3H5V4zm0 6h14v3H5v-3zm0 6h14v3H5v-3z" fill="currentColor"/></svg></span>
          <span>Meus eventos</span>
        </a>
        <a class="menu-item" href="./my-guests.html">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-6 2.2-6 5v1h12v-1c0-2.8-2.7-5-6-5zm8-2a3 3 0 1 0-2.2-5 6 6 0 0 1 .4 2c0 1.2-.3 2.3-.9 3.2.8.5 1.7.8 2.7.8zm1 2c-.8 0-1.6.1-2.3.4 1.4 1.1 2.3 2.8 2.3 4.6v1h4v-1c0-2.8-1.8-5-4-5z" fill="currentColor"/></svg></span>
          <span>Convidados</span>
        </a>
        <a class="menu-item" href="./my-event.html">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>
          <span>Presentes</span>
        </a>
        <a class="menu-item" href="./account.html">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z" fill="currentColor"/></svg></span>
          <span>Minha conta</span>
        </a>
        <button id="logout-action" class="menu-item menu-item-danger" type="button">
          <span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z" fill="currentColor"/></svg></span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  `;
}

export function formatDate(dateString) {
  if (!dateString) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(dateString));
}

export function formatDateTime(dateString) {
  if (!dateString) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(dateString));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

export function setStatus(element, type, message) {
  let target = element || document.getElementById("status");

  if (!target) {
    target = document.createElement("p");
    target.id = "status";
    target.className = "status status-info";

    const main = document.querySelector("main");
    const preferredContainer =
      document.querySelector("main .card.card-pad")
      || document.querySelector("main .card")
      || main
      || document.body;

    preferredContainer.appendChild(target);
  }

  target.hidden = false;
  target.textContent = message;
  target.classList.remove(...STATUS_CLASSES);
  target.classList.add(type);
}

export function buildPublicEventLink(slug) {
  const base = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}`;
  return `${base}event.html?slug=${encodeURIComponent(slug)}`;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.getTime() <= Date.now();
}
