export const DEFAULT_API_BASE = inferApiBase();
const AUTH_KEY = "wg_auth_session";
const MOBILE_NAV_TOGGLE_ID = "mobile-nav-toggle";
const MOBILE_NAV_OVERLAY_ID = "mobile-nav-overlay";
const MOBILE_NAV_DRAWER_ID = "mobile-nav-drawer";
const MOBILE_NAV_TITLE = "Navegação principal";

const STATUS_CLASSES = Object.freeze(["status-info", "status-success", "status-error", "status-loading"]);
const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
let mobileHeaderController = null;

// Shared product copy used across multiple pages.
export const UI_TEXT = {
  common: {
    retry: "Não foi possível concluir a operação. Tente novamente.",
    loading: "Carregando...",
    empty: "Nenhum dado disponível.",
    noDescription: "Sem descrição.",
    save: "Salvar alterações",
    cancel: "Cancelar",
    editCancelled: "Edição cancelada.",
    loggedOut: "Você saiu da sua conta com sucesso.",
    sessionExpired: "Sua sessão expirou. Faça login novamente para continuar."
  },
  auth: {
    loginInitial: "Informe e-mail e senha para continuar.",
    loginLoading: "Validando suas credenciais...",
    loginSuccess: "Login realizado com sucesso. Redirecionando...",
    loginError: "Não foi possível entrar. Tente novamente.",
    invalidCredentials: "E-mail ou senha inválidos.",
    registerInitial: "Preencha os dados para criar sua conta.",
    registerSuccess: "Cadastro concluído. Faça login para continuar.",
    registerError: "Não foi possível concluir seu cadastro.",
    logoutDone: "Você saiu da sua conta com sucesso.",
    passwordChangeLoading: "Atualizando sua senha...",
    passwordChangeSuccess: "Senha atualizada com sucesso.",
    passwordChangeError: "Não foi possível atualizar sua senha."
  },
  events: {
    loading: "Carregando seus eventos...",
    empty: "Você ainda não possui eventos.",
    emptyWithAction: "Você ainda não possui eventos. Crie um evento primeiro.",
    loaded: "Eventos carregados com sucesso.",
    createdFocus: "Evento criado e destacado com sucesso.",
    createLoading: "Criando evento...",
    createError: "Não foi possível concluir a criação do evento.",
    updated: "Evento atualizado com sucesso.",
    updating: "Atualizando evento...",
    updateError: "Não foi possível salvar as alterações do evento.",
    deleted: "Evento excluído com sucesso.",
    deleting: "Excluindo evento...",
    deleteError: "Não foi possível excluir o evento.",
    copySuccess: "Link público copiado com sucesso.",
    copyError: "Não foi possível copiar o link público."
  },
  gifts: {
    initial: "Selecione um evento para começar.",
    loading: "Carregando seus eventos...",
    loadingList: "Carregando os presentes do evento...",
    loadingReservations: "Carregando o histórico de reservas...",
    createLoading: "Criando presente...",
    createSuccess: "Presente adicionado com sucesso.",
    createError: "Não foi possível salvar o presente.",
    updateLoading: "Atualizando presente...",
    updateSuccess: "Presente atualizado com sucesso.",
    deleteLoading: "Excluindo presente...",
    deleteSuccess: "Presente excluído com sucesso.",
    deleteError: "Não foi possível excluir o presente.",
    empty: "Nenhum presente cadastrado para este evento.",
    emptyReservations: "Nenhuma reserva registrada para este evento."
  },
  guests: {
    initial: "Selecione um evento para começar.",
    loading: "Carregando seus eventos...",
    loaded: "Eventos carregados com sucesso.",
    loadingList: "Carregando os convidados do evento...",
    createLoading: "Adicionando convidado...",
    createSuccess: "Convidado adicionado com sucesso.",
    updateLoading: "Atualizando convidado...",
    updateSuccess: "Convidado atualizado com sucesso.",
    deleteLoading: "Excluindo convidado...",
    deleteSuccess: "Convidado excluído com sucesso.",
    deleteError: "Não foi possível excluir o convidado.",
    empty: "Nenhum convidado cadastrado para este evento.",
    reservationNone: "Sem reserva ativa",
    reservationActive: "Reserva ativa"
  },
  publicEvent: {
    initial: "Informe o slug para carregar o evento público.",
    loading: "Carregando evento e presentes...",
    loadError: "Não foi possível carregar o evento.",
    reserveLoading: "Reservando presente...",
    reserveSuccess: "Reserva realizada com sucesso.",
    reserveError: "Não foi possível reservar o presente.",
    unreserveLoading: "Cancelando reserva...",
    unreserveSuccess: "Reserva cancelada com sucesso.",
    unreserveError: "Não foi possível cancelar a reserva.",
    emptyEvent: "Nenhum evento carregado.",
    emptyFilter: "Nenhum presente encontrado para este filtro."
  },
  confirms: {
    deleteEvent: (name) => `Tem certeza que deseja excluir o evento "${name}"?`,
    deleteGift: (name) => `Tem certeza que deseja excluir o presente "${name}"?`,
    deleteGuest: (name) => `Tem certeza que deseja excluir o convidado "${name}"?`
  }
};

const MOBILE_NAV_AUTH_LINKS = deepFreeze([
  { href: "./my-events.html", label: "Meus eventos", activePages: ["my-events.html"] },
  { href: "./create-event.html", label: "Criar evento", activePages: ["create-event.html"] },
  { href: "./my-event.html", label: "Gerenciar presentes", activePages: ["my-event.html"] },
  { href: "./my-guests.html", label: "Gerenciar convidados", activePages: ["my-guests.html"] },
  { href: "./account.html", label: "Minha conta", activePages: ["account.html"] },
  { href: "./event.html", label: "Ver lista pública", activePages: ["event.html"] },
  { kind: "button", label: "Sair", buttonClass: "js-mobile-nav-logout", activePages: [] }
]);

const MOBILE_NAV_PUBLIC_LINKS = deepFreeze([
  { href: "./login.html", label: "Entrar", activePages: ["login.html"] },
  { href: "./register.html", label: "Criar conta", activePages: ["register.html"] },
  { href: "./event.html", label: "Ver lista pública", activePages: ["event.html"] }
]);

deepFreeze(UI_TEXT);

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
  const hadStoredSession = hasStoredSession();
  const hasAuthHeader = hasAuthorizationHeader(fetchOptions.headers);
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    if (!skipAuthRedirect && (response.status === 401 || response.status === 403) && (hasAuthHeader || hadStoredSession)) {
      clearAuthSession();
      redirectToLoginPage({ sessionExpired: true });
      throw new Error(UI_TEXT.common.sessionExpired);
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

    if (isSessionExpired({ expiresAt, token })) {
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
  const hadPreviousSession = hasStoredSession();
  const session = getAuthSession();
  if (!session) {
    redirectToLoginPage({ sessionExpired: hadPreviousSession });
    return null;
  }

  installSessionWatch();
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

export function getCurrentAppPath() {
  return `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
}

export function resolveSafeReturnTo(value) {
  if (!value || typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("login.html")) return null;
  return value;
}

export async function resolvePostLoginPath(apiBase, token, returnTo) {
  const safeReturnTo = resolveSafeReturnTo(returnTo);
  if (safeReturnTo) return safeReturnTo;

  if (!token) return "./create-event.html";

  try {
    const events = await requestJson(`${apiBase}/api/events/mine`, {
      headers: authHeaders(token)
    });

    return Array.isArray(events) && events.length > 0
      ? "./my-events.html"
      : "./create-event.html";
  } catch {
    return "./create-event.html";
  }
}

export function redirectToLoginPage({ sessionExpired = false, loggedOut = false, returnTo } = {}) {
  const currentPath = returnTo || getCurrentAppPath();
  if (isLoginPage(currentPath)) return;

  const params = new URLSearchParams();
  if (sessionExpired) {
    params.set("sessionExpired", "1");
  }
  if (loggedOut) {
    params.set("loggedOut", "1");
  }

  const safeReturnTo = resolveSafeReturnTo(currentPath);
  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  const query = params.toString();
  window.location.href = query ? `./login.html?${query}` : "./login.html";
}

export function logoutAndRedirectToLogin() {
  clearAuthSession();
  redirectToLoginPage({ loggedOut: true });
}

export function initGlobalMobileHeader() {
  if (typeof document === "undefined") return null;

  const nav = document.querySelector(".shell-nav");
  if (!nav) return null;

  if (mobileHeaderController?.nav !== nav) {
    mobileHeaderController = createMobileHeaderController(nav);
  }

  mobileHeaderController.render();
  mobileHeaderController.syncScrollState();
  return mobileHeaderController;
}

export function refreshMobileHeader() {
  initGlobalMobileHeader();
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.getTime() <= Date.now();
}

function isTokenExpired(token) {
  const claims = decodeJwtClaims(token);
  if (!claims || typeof claims.exp !== "number") return false;

  const expiresAtMs = claims.exp * 1000;
  if (!Number.isFinite(expiresAtMs)) return false;

  return expiresAtMs <= Date.now();
}

function isSessionExpired({ expiresAt, token }) {
  if (isExpired(expiresAt)) return true;
  return isTokenExpired(token);
}

function decodeJwtClaims(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function hasStoredSession() {
  return !!localStorage.getItem(AUTH_KEY);
}

function hasAuthorizationHeader(headers) {
  if (!headers) return false;

  if (typeof headers.get === "function") {
    return Boolean(headers.get("Authorization"));
  }

  if (Array.isArray(headers)) {
    return headers.some(([name]) => String(name).toLowerCase() === "authorization");
  }

  if (typeof headers === "object") {
    return Object.keys(headers).some((name) => String(name).toLowerCase() === "authorization");
  }

  return false;
}

function isLoginPage(pathname) {
  return String(pathname || "").includes("login.html");
}

function installSessionWatch() {
  if (window.__wgSessionWatchInstalled) return;
  window.__wgSessionWatchInstalled = true;

  const validate = () => {
    if (getAuthSession()) return;
    if (hasStoredSession()) {
      clearAuthSession();
    }
    redirectToLoginPage({ sessionExpired: true });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      validate();
    }
  });

  window.addEventListener("pageshow", validate);
  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_KEY) {
      validate();
    }
  });
}

function inferApiBase() {
  const isBrowser = typeof window !== "undefined" && !!window.location;
  if (!isBrowser) return "http://localhost:5298";

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:5298`;
}

// Global mobile header / drawer controller used by pages that render .shell-nav.
function createMobileHeaderController(nav) {
  const navInner = nav.querySelector(".shell-nav-inner");
  if (!navInner) return { nav, render() {}, syncScrollState() {} };

  const toggle = ensureMobileNavToggle(navInner);
  const overlay = ensureMobileNavOverlay();
  const drawer = ensureMobileNavDrawer();

  let lastFocusedElement = null;
  let lockedScrollY = 0;

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(", ");

  const lockBodyScroll = () => {
    lockedScrollY = window.scrollY;
    document.body.classList.add("mobile-nav-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  };

  const unlockBodyScroll = () => {
    document.body.classList.remove("mobile-nav-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    toggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    unlockBodyScroll();

    window.setTimeout(() => {
      drawer.hidden = true;
      overlay.hidden = true;
    }, 280);

    if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  };

  const openMenu = () => {
    lastFocusedElement = document.activeElement;
    lockBodyScroll();
    toggle.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      drawer.classList.add("is-open");
    });

    const firstFocusable = drawer.querySelector(focusableSelector);
    firstFocusable?.focus();
  };

  const trapFocus = (event) => {
    if (event.key !== "Tab" || drawer.hidden) return;

    const focusable = Array.from(drawer.querySelectorAll(focusableSelector))
      .filter((element) => element instanceof HTMLElement && !element.hasAttribute("hidden"));

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  toggle.addEventListener("click", () => {
    if (drawer.hidden) {
      openMenu();
      return;
    }

    closeMenu();
  });

  overlay.addEventListener("click", () => closeMenu());
  drawer.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest(".js-mobile-nav-logout")) {
      closeMenu({ restoreFocus: false });
      renderMobileDrawerContent(drawer);
      logoutAndRedirectToLogin();
      return;
    }

    if (target.closest(".js-mobile-nav-dismiss")) {
      closeMenu({ restoreFocus: !target.closest("a[href]") });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawer.hidden) {
      closeMenu();
      return;
    }

    trapFocus(event);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_KEY) {
      renderMobileDrawerContent(drawer);
    }
  });

  const syncScrollState = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 10);
  };

  syncScrollState();
  window.addEventListener("scroll", syncScrollState, { passive: true });

  const render = () => {
    renderMobileDrawerContent(drawer);
  };

  return { nav, render, syncScrollState };
}

function ensureMobileNavToggle(navInner) {
  let toggle = document.getElementById(MOBILE_NAV_TOGGLE_ID);
  if (toggle) return toggle;

  toggle = document.createElement("button");
  toggle.id = MOBILE_NAV_TOGGLE_ID;
  toggle.className = "mobile-nav-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Abrir menu principal");
  toggle.setAttribute("aria-controls", MOBILE_NAV_DRAWER_ID);
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `
    <span class="mobile-nav-toggle-icon" aria-hidden="true">
      <span class="mobile-nav-toggle-line"></span>
      <span class="mobile-nav-toggle-line"></span>
      <span class="mobile-nav-toggle-line"></span>
    </span>
  `;

  navInner.appendChild(toggle);
  return toggle;
}

function ensureMobileNavOverlay() {
  let overlay = document.getElementById(MOBILE_NAV_OVERLAY_ID);
  if (overlay) {
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = MOBILE_NAV_OVERLAY_ID;
  overlay.className = "mobile-nav-overlay";
  overlay.hidden = true;
  document.body.appendChild(overlay);
  return overlay;
}

function ensureMobileNavDrawer() {
  let drawer = document.getElementById(MOBILE_NAV_DRAWER_ID);
  if (drawer) {
    if (drawer.parentElement !== document.body) {
      document.body.appendChild(drawer);
    }
    return drawer;
  }

  drawer = document.createElement("aside");
  drawer.id = MOBILE_NAV_DRAWER_ID;
  drawer.className = "mobile-nav-drawer";
  drawer.hidden = true;
  drawer.tabIndex = -1;
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-label", MOBILE_NAV_TITLE);
  document.body.appendChild(drawer);
  return drawer;
}

function renderMobileDrawerContent(drawer) {
  const session = getAuthSession();
  const currentPage = getCurrentPageName();
  const config = getMobileNavConfig({ session, currentPage });

  drawer.innerHTML = `
    <div class="mobile-nav-drawer-inner">
      <div class="mobile-nav-drawer-head">
        <a class="mobile-nav-brand js-mobile-nav-dismiss" href="./index.html">
          <span class="shell-dot"></span>
          <span>Weddingifts</span>
        </a>
        <button class="mobile-nav-close js-mobile-nav-dismiss" type="button" aria-label="Fechar menu">
          <span></span>
          <span></span>
        </button>
      </div>
      ${config.eyebrow ? `<p class="mobile-nav-eyebrow">${escapeHtml(config.eyebrow)}</p>` : ""}
      <div class="mobile-nav-links">
        ${config.links.map((link) => buildMobileNavLink(link, currentPage)).join("")}
      </div>
      <div class="mobile-nav-divider"></div>
      <a class="mobile-nav-cta js-mobile-nav-dismiss" href="${config.cta.href}">${escapeHtml(config.cta.label)}</a>
      <p class="mobile-nav-copy">${escapeHtml(config.copy)}</p>
    </div>
  `;
}

function buildMobileNavLink(link, currentPage) {
  const classes = ["mobile-nav-link"];
  const isActive = link.activePages?.includes(currentPage);

  if (link.dismiss !== false) {
    classes.push("js-mobile-nav-dismiss");
  }

  if (isActive) {
    classes.push("is-active");
  }

  if (link.kind === "button") {
    classes.push("mobile-nav-link-button");
    if (link.buttonClass) {
      classes.push(link.buttonClass);
    }

    return `<button class="${classes.join(" ")}" type="button">${escapeHtml(link.label)}</button>`;
  }

  return `<a class="${classes.join(" ")}" href="${link.href}">${escapeHtml(link.label)}</a>`;
}

function getMobileNavConfig({ session, currentPage }) {
  if (session?.token) {
    const displayName = session.user?.name?.trim() || session.user?.email?.trim() || "Sua conta";

    return {
      eyebrow: displayName,
      links: MOBILE_NAV_AUTH_LINKS,
      cta: {
        href: "./create-event.html",
        label: currentPage === "create-event.html" ? "Continuar edição" : "Criar minha lista"
      },
      copy: "Celebrar o amor com organização, clareza e um painel discreto."
    };
  }

  return {
    eyebrow: "Navegação",
    links: MOBILE_NAV_PUBLIC_LINKS,
    cta: {
      href: "./register.html",
      label: "Criar minha lista"
    },
    copy: "Celebrar o amor em cada detalhe."
  };
}

function getCurrentPageName() {
  const path = window.location.pathname || "";
  const filename = path.split("/").pop();
  return filename || "index.html";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return value;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalMobileHeader, { once: true });
  } else {
    initGlobalMobileHeader();
  }
}

