export const DEFAULT_API_BASE = "http://localhost:5298";
const API_BASE_KEY = "wg_api_base";
const AUTH_KEY = "wg_auth_session";

const STATUS_CLASSES = ["status-info", "status-success", "status-error", "status-loading"];

export function normalizeApiBase(raw) {
  return String(raw || "").trim().replace(/\/+$/, "");
}

export function getApiBase() {
  const stored = localStorage.getItem(API_BASE_KEY);
  return normalizeApiBase(stored) || DEFAULT_API_BASE;
}

export function setApiBase(raw) {
  const normalized = normalizeApiBase(raw);
  if (!normalized) {
    localStorage.removeItem(API_BASE_KEY);
    return "";
  }

  localStorage.setItem(API_BASE_KEY, normalized);
  return normalized;
}

export function attachApiBaseInput(inputElement) {
  if (!inputElement) return;

  inputElement.value = getApiBase();

  const persist = () => {
    const value = setApiBase(inputElement.value);
    if (!value) {
      inputElement.value = DEFAULT_API_BASE;
      setApiBase(inputElement.value);
    }
  };

  inputElement.addEventListener("change", persist);
  inputElement.addEventListener("blur", persist);
}

export function extractErrorMessage(raw) {
  if (!raw) return "Erro inesperado.";

  try {
    const payload = JSON.parse(raw);
    if (payload?.detail) return payload.detail;
    if (payload?.title) return payload.title;
  } catch {
    // ignore parse failures
  }

  return String(raw);
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(extractErrorMessage(payload) || `Erro HTTP ${response.status}`);
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
    if (!parsed?.token) return null;
    return parsed;
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

export function formatDate(dateString) {
  if (!dateString) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(dateString));
}

export function formatDateTime(dateString) {
  if (!dateString) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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
