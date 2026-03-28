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
  const response = await fetch(url, options);

  if (!response.ok) {
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

    return { token, user, expiresAt };
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function requireAuth() {
  const session = getAuthSession();
  if (!session) {
    window.location.href = "./login.html";
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
  menuButton.textContent = displayName;

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
  if (!element) return;

  element.textContent = message;
  element.classList.remove(...STATUS_CLASSES);
  element.classList.add(type);
}

export function buildPublicEventLink(slug) {
  const base = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}`;
  return `${base}event.html?slug=${encodeURIComponent(slug)}`;
}
