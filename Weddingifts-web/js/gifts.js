import {
  formatCurrency,
  getApiBase,
  getAuthSession,
  getUserMenuMarkup,
  initUserDropdown,
  logoutAndRedirectToLogin,
  requestJson,
  setStatus,
  UI_TEXT
} from "./common.js";
import {
  formatEventDateTime
} from "./event-contract.js";

const PUBLIC_GIFT_CONTEXT_KEY = "wg_public_gift_context";
const MAX_SLUG_LENGTH = 24;
const ICON_GIFT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_UNDO = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 0 1 6.5 4.4H16v2h6V5h-2v2.1A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7z" fill="currentColor"/></svg></span>';
const ICON_TRASH = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 6h2v10h1V9h2v10h1V9h2v10.5A1.5 1.5 0 0 1 14.5 21h-5A1.5 1.5 0 0 1 8 19.5V9z" fill="currentColor"/></svg></span>';

const state = {
  event: null,
  rsvp: null,
  gifts: [],
  filter: "all",
  giftCart: {},
  giftQuery: "",
  giftSort: "availability",
  guestCpf: "",
  actionGiftId: null,
  loading: false,
  cartDrawerOpen: false,
  slug: ""
};

const root = document.getElementById("public-gifts-root");
const title = document.getElementById("public-gifts-title");
const subtitle = document.getElementById("public-gifts-subtitle");
const date = document.getElementById("public-gifts-date");
const guestIdentification = document.getElementById("gift-guest-identification");
const guestCpfInput = document.getElementById("gift-guest-cpf-input");
const identifyButton = document.getElementById("gift-identify-button");
const identifyBackLink = document.getElementById("gift-identify-back-link");
const status = document.getElementById("public-gifts-status");
const experience = document.getElementById("public-gifts-experience");
const giftSearchInput = document.getElementById("gift-search-input");
const giftSortSelect = document.getElementById("gift-sort-select");
const giftGrid = document.getElementById("gift-grid");
const giftTemplate = document.getElementById("gift-template");
const giftCartPanel = document.getElementById("gift-cart-panel");
const giftCartMobileBar = document.getElementById("gift-cart-mobile-bar");
const giftCartMobileOverlay = document.getElementById("gift-cart-mobile-overlay");
const filters = document.querySelectorAll(".filter-button");
const orderSuccess = document.getElementById("gift-order-success");
const backToInvitationLink = document.getElementById("gift-back-to-invitation-link");

const session = getAuthSession();
enhanceHeaderForLoggedUser(session);

const query = new URLSearchParams(window.location.search);
const querySlug = String(query.get("slug") || "").trim();

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
  clearFieldError(guestCpfInput);
});
guestCpfInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  if (identifyButton.disabled) return;
  acceptGuestCpf(digitsOnly(guestCpfInput.value));
});

identifyButton.addEventListener("click", () => acceptGuestCpf(digitsOnly(guestCpfInput.value)));

filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.giftFilter || button.dataset.filter;
    filters.forEach((item) => {
      item.classList.remove("btn-primary");
      item.classList.add("btn-secondary");
    });
    button.classList.remove("btn-secondary");
    button.classList.add("btn-primary");
    renderGiftList();
  });
});

giftSearchInput.addEventListener("input", () => {
  state.giftQuery = giftSearchInput.value.trim().toLowerCase();
  renderGiftList();
});

giftSortSelect.addEventListener("change", () => {
  state.giftSort = giftSortSelect.value;
  renderGiftList();
});

giftCartMobileBar?.addEventListener("click", openGiftCartDrawer);
giftCartMobileOverlay?.addEventListener("click", closeGiftCartDrawer);
giftCartPanel?.addEventListener("click", handleGiftCartPanelClick);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.cartDrawerOpen) {
    closeGiftCartDrawer();
  }
});

if (querySlug) {
  loadGiftPage(querySlug);
} else {
  renderMissingSlug();
}

function enhanceHeaderForLoggedUser(sessionData) {
  if (!sessionData?.token) return;

  const navRight = document.querySelector(".shell-nav-right");
  if (!navRight) return;

  navRight.innerHTML = `
    <div class="shell-links">
      <a href="./event.html">Evento público</a>
    </div>
    ${getUserMenuMarkup()}
  `;

  initUserDropdown({
    session: sessionData,
    onLogout: () => {
      logoutAndRedirectToLogin();
    }
  });
}

async function loadGiftPage(slug) {
  const safeSlug = String(slug || "").trim();

  if (!safeSlug) {
    renderMissingSlug();
    return;
  }

  if (safeSlug.length > MAX_SLUG_LENGTH) {
    renderLoadError("O slug deve ter no máximo 24 caracteres.");
    return;
  }

  try {
    state.loading = true;
    state.slug = safeSlug;
    root.dataset.state = "loading";
    setStatus(status, "status-loading", "Carregando lista de presentes...");

    const apiBase = getApiBase();
    state.event = await requestJson(`${apiBase}/api/events/${encodeURIComponent(safeSlug)}`);
    renderEventSummary();

    const context = readPublicGiftContext();
    if (context?.slug === state.event.slug && isValidCpf(context.guestCpf)) {
      guestCpfInput.value = formatCpfInput(context.guestCpf);
      await acceptGuestCpf(context.guestCpf, { fromContext: true });
      return;
    }

    renderCpfGate();
  } catch (error) {
    renderLoadError(`${UI_TEXT.publicEvent.loadError}: ${error.message}`);
  } finally {
    state.loading = false;
  }
}

function renderEventSummary() {
  title.textContent = state.event?.name || "Lista de presentes";
  subtitle.textContent = state.event?.hostNames
    ? `Escolha um presente para ${state.event.hostNames}.`
    : "Escolha um presente para os noivos.";
  date.textContent = formatEventDateTime(state.event);
  backToInvitationLink.href = `./event.html?slug=${encodeURIComponent(state.event.slug)}`;
  if (identifyBackLink) {
    identifyBackLink.href = `./event.html?slug=${encodeURIComponent(state.event.slug)}`;
  }
}

function renderMissingSlug() {
  root.dataset.state = "missing-slug";
  guestIdentification.hidden = true;
  experience.hidden = true;
  orderSuccess.hidden = true;
  title.textContent = "Lista não encontrada";
  subtitle.textContent = "Abra a lista pelo link enviado pelo casal.";
  date.textContent = "";
  setStatus(status, "status-error", "Link de presentes incompleto.");
}

function renderLoadError(message) {
  root.dataset.state = "error";
  guestIdentification.hidden = true;
  experience.hidden = true;
  orderSuccess.hidden = true;
  title.textContent = "Presentes indisponíveis";
  subtitle.textContent = "Não foi possível abrir esta lista.";
  date.textContent = "";
  setStatus(status, "status-error", message);
}

function renderCpfGate() {
  root.dataset.state = "identify";
  guestIdentification.hidden = false;
  experience.hidden = true;
  orderSuccess.hidden = true;
  identifyButton.disabled = false;
  setStatus(status, "status-info", "Informe seu CPF para ver a lista e escolher seu presente.");
}

async function acceptGuestCpf(guestCpf, options = {}) {
  if (!state.event) return;

  if (!isValidCpf(guestCpf)) {
    showFieldError(guestCpfInput, "Informe um CPF válido para acessar a lista de presentes.");
    return;
  }

  try {
    identifyButton.disabled = true;
    clearFieldError(guestCpfInput);
    setStatus(status, "status-loading", "Validando convidado...");
    const apiBase = getApiBase();
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp?guestCpf=${encodeURIComponent(guestCpf)}`);
    state.guestCpf = guestCpf;
    savePublicGiftContext();
    await renderGiftExperience();
  } catch (error) {
    state.guestCpf = "";
    if (!options.fromContext) {
      showFieldError(guestCpfInput, `Não foi possível consultar o convite: ${error.message}`);
    }
    renderCpfGate();
  } finally {
    identifyButton.disabled = false;
  }
}

async function renderGiftExperience() {
  root.dataset.state = "gifts";
  guestIdentification.hidden = true;
  experience.hidden = false;
  orderSuccess.hidden = true;
  setStatus(status, "status-loading", "Carregando presentes...");

  await refreshGifts();
  renderGiftList();
  setStatus(status, "status-success", "Presentes carregados. Escolha com carinho e registre seus presentes.");
}

function renderGiftList() {
  giftGrid.innerHTML = "";

  if (!state.event) {
    giftGrid.innerHTML = `<div class="center-empty">${UI_TEXT.publicEvent.emptyEvent}</div>`;
    renderGiftCart();
    return;
  }

  syncGiftCartFromGifts();
  const items = filteredGifts();
  if (!items.length) {
    giftGrid.innerHTML = `<div class="center-empty">${UI_TEXT.publicEvent.emptyFilter}</div>`;
    renderGiftCart();
    return;
  }

  items.forEach((gift) => {
    const fragment = giftTemplate.content.cloneNode(true);
    const giftName = fragment.querySelector(".gift-name");
    const giftPrice = fragment.querySelector(".gift-price");
    const giftDescription = fragment.querySelector(".gift-description");
    const giftBadge = fragment.querySelector(".gift-badge");
    const giftMeta = fragment.querySelector(".gift-meta");
    const reserveButton = fragment.querySelector(".reserve-button");
    const unreserveButton = fragment.querySelector(".unreserve-button");

    const available = availableUnits(gift);
    const reserved = reservedUnits(gift);
    const cartQuantity = getGiftCartQuantity(gift);
    const busy = state.actionGiftId === gift.id;
    const badge = badgeForGift(gift);

    giftName.textContent = gift.name;
    giftPrice.textContent = formatCurrency(gift.price);
    giftDescription.textContent = gift.description || UI_TEXT.common.noDescription;
    giftBadge.textContent = badge.label;
    giftBadge.classList.add("tag", badge.className);
    giftMeta.textContent = `${giftAvailabilityQuantityLabel(available)} | ${giftChoiceQuantityLabel(reserved)}${cartQuantity ? ` | Escolhidos: ${cartQuantity}` : ""}`;

    reserveButton.disabled = busy || available === 0;
    reserveButton.innerHTML = `${busy ? ICON_SPINNER : ICON_GIFT}${busy ? "Registrando..." : "Presentear com este item"}`;
    reserveButton.addEventListener("click", (event) => {
      event.preventDefault();
      reserveGift(gift.id);
    });

    unreserveButton.disabled = busy || cartQuantity === 0;
    unreserveButton.innerHTML = `${ICON_UNDO}Retirar escolha`;
    unreserveButton.addEventListener("click", (event) => {
      event.preventDefault();
      unreserveGift(gift.id);
    });

    giftGrid.appendChild(fragment);
  });

  renderGiftCart();
}

function renderGiftCart() {
  if (!giftCartPanel) return;

  syncGiftCartFromGifts();
  const summary = getGiftCartSummary();
  const { items, totalQuantity, totalValue } = summary;
  const itemMarkup = items.length
    ? items.map(({ gift, quantity }) => `
      <li class="gift-cart-item">
        <div>
          <strong>${escapeHtml(gift.name)}</strong>
          <span>${giftCartQuantityLabel(quantity)} | ${escapeHtml(formatCurrency(Number(gift.price || 0) * quantity))}</span>
        </div>
        <button class="btn btn-secondary btn-sm gift-selection-remove" type="button" data-cart-remove-gift-id="${escapeAttribute(gift.id)}" aria-label="Retirar ${escapeAttribute(gift.name)} dos presentes escolhidos" title="Retirar presente" ${state.actionGiftId === gift.id ? "disabled" : ""}>
          ${state.actionGiftId === gift.id ? ICON_SPINNER : ICON_TRASH}
          <span class="gift-selection-remove-label">${state.actionGiftId === gift.id ? "Retirando..." : "Retirar"}</span>
        </button>
      </li>
    `).join("")
    : '<li class="gift-cart-empty">Nenhum presente escolhido ainda. Escolha um presente para registrar seu carinho.</li>';

  giftCartPanel.innerHTML = `
    <div class="gift-cart-head">
      <div>
        <p class="kicker">Presentes escolhidos</p>
        <h3>Sua seleção para os noivos</h3>
      </div>
      <button class="gift-cart-close" type="button" aria-label="Fechar seleção de presentes" data-cart-close>
        <span aria-hidden="true">x</span>
      </button>
      <span class="tag tag-ok">${escapeHtml(giftCartQuantityLabel(totalQuantity))}</span>
    </div>
    <ul class="gift-cart-list">${itemMarkup}</ul>
    <div class="gift-cart-total">
      <span>Total dos presentes</span>
      <strong>${escapeHtml(formatCurrency(totalValue))}</strong>
    </div>
    <div class="gift-cart-actions">
      <button id="gift-checkout-button" class="btn btn-primary" type="button" ${items.length ? "" : "disabled"}>Registrar presentes</button>
    </div>
  `;

  renderGiftCartMobileBar(summary);
  syncGiftCartDrawerState(summary);
}

function handleGiftCartPanelClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const removeButton = target.closest("[data-cart-remove-gift-id]");
  if (removeButton && giftCartPanel.contains(removeButton)) {
    event.preventDefault();
    event.stopPropagation();

    const giftId = Number(removeButton.dataset.cartRemoveGiftId);
    if (Number.isFinite(giftId)) {
      unreserveGift(giftId);
    }
    return;
  }

  const closeButton = target.closest("[data-cart-close]");
  if (closeButton && giftCartPanel.contains(closeButton)) {
    event.preventDefault();
    closeGiftCartDrawer();
    return;
  }

  const checkoutButton = target.closest("#gift-checkout-button");
  if (checkoutButton && giftCartPanel.contains(checkoutButton)) {
    event.preventDefault();
    finalizeGiftOrder();
  }
}

async function refreshGifts() {
  if (!state.event) return;
  const apiBase = getApiBase();
  state.gifts = await requestJson(`${apiBase}/api/events/${state.event.id}/gifts`);
  syncGiftCartFromGifts();
}

async function reserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;

  if (!isValidCpf(state.guestCpf)) {
    renderCpfGate();
    return;
  }

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", UI_TEXT.publicEvent.reserveLoading);
    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf: state.guestCpf })
    });

    adjustGiftCartQuantity(giftId, 1);
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Presente escolhido.");
  } catch (error) {
    setStatus(status, "status-error", `${UI_TEXT.publicEvent.reserveError}: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
}

async function unreserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;

  if (!isValidCpf(state.guestCpf)) {
    renderCpfGate();
    return;
  }

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", UI_TEXT.publicEvent.unreserveLoading);
    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/gifts/${giftId}/unreserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf: state.guestCpf })
    });

    adjustGiftCartQuantity(giftId, -1);
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Presente retirado.");
  } catch (error) {
    setStatus(status, "status-error", `${UI_TEXT.publicEvent.unreserveError}: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
}

function finalizeGiftOrder() {
  const items = getGiftCartItems();
  if (!items.length) {
    setStatus(status, "status-error", "Escolha ao menos um presente para registrar seu carinho.");
    return;
  }

  closeGiftCartDrawer();
  root.dataset.state = "complete";
  guestIdentification.hidden = true;
  experience.hidden = true;
  orderSuccess.hidden = false;
  setStatus(status, "status-success", "Presentes registrados com sucesso.");
}

function readPublicGiftContext() {
  try {
    const raw = sessionStorage.getItem(PUBLIC_GIFT_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePublicGiftContext() {
  if (!state.event?.slug || !state.guestCpf) return;

  try {
    sessionStorage.setItem(PUBLIC_GIFT_CONTEXT_KEY, JSON.stringify({
      slug: state.event.slug,
      guestCpf: state.guestCpf,
      guestName: state.rsvp?.guestName || "",
      eventName: state.event.name || "",
      savedAt: new Date().toISOString()
    }));
  } catch {
    // If storage is unavailable, the page can ask for CPF again on reload.
  }
}

function availableUnits(gift) {
  if (typeof gift.availableQuantity === "number") return gift.availableQuantity;
  const reserved = typeof gift.reservedQuantity === "number" ? gift.reservedQuantity : 0;
  return Math.max(0, gift.quantity - reserved);
}

function reservedUnits(gift) {
  if (typeof gift.reservedQuantity === "number") return gift.reservedQuantity;
  return Math.max(0, gift.quantity - availableUnits(gift));
}

function giftCartKey(giftId) {
  return String(giftId);
}

function getGiftCartQuantity(gift) {
  if (!gift?.id) return 0;
  return toNonNegativeInteger(state.giftCart[giftCartKey(gift.id)]);
}

function setGiftCartQuantity(giftId, quantity) {
  const key = giftCartKey(giftId);
  const normalizedQuantity = toNonNegativeInteger(quantity);

  if (normalizedQuantity > 0) {
    state.giftCart[key] = normalizedQuantity;
    return;
  }

  delete state.giftCart[key];
}

function adjustGiftCartQuantity(giftId, delta) {
  const currentQuantity = toNonNegativeInteger(state.giftCart[giftCartKey(giftId)]);
  setGiftCartQuantity(giftId, currentQuantity + delta);
}

function syncGiftCartFromGifts() {
  if (!state.guestCpf) return;

  state.gifts.forEach((gift) => {
    const key = giftCartKey(gift.id);

    if (reservedUnits(gift) === 0) {
      delete state.giftCart[key];
      return;
    }

    if (String(gift.reservedBy || "") === state.guestCpf && !state.giftCart[key]) {
      state.giftCart[key] = 1;
    }
  });
}

function getGiftCartItems() {
  return state.gifts
    .map((gift) => ({ gift, quantity: getGiftCartQuantity(gift) }))
    .filter((item) => item.quantity > 0);
}

function getGiftCartSummary() {
  const items = getGiftCartItems();
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + Number(item.gift.price || 0) * item.quantity, 0)
  };
}

function renderGiftCartMobileBar(summary) {
  if (!giftCartMobileBar) return;

  if (!summary.totalQuantity) {
    giftCartMobileBar.hidden = true;
    return;
  }

  giftCartMobileBar.hidden = false;
  giftCartMobileBar.innerHTML = `
    <span class="gift-cart-mobile-summary">
      <strong>${escapeHtml(giftCartQuantityLabel(summary.totalQuantity))}</strong>
      <span>${escapeHtml(formatCurrency(summary.totalValue))}</span>
    </span>
    <span class="gift-cart-mobile-action">Ver presentes</span>
  `;
}

function openGiftCartDrawer() {
  const summary = getGiftCartSummary();
  if (!summary.totalQuantity) return;
  setGiftCartDrawerOpen(true);
}

function closeGiftCartDrawer() {
  setGiftCartDrawerOpen(false);
}

function syncGiftCartDrawerState(summary) {
  if (!summary.totalQuantity && state.cartDrawerOpen) {
    closeGiftCartDrawer();
    return;
  }

  setGiftCartDrawerOpen(state.cartDrawerOpen && summary.totalQuantity > 0);
}

function setGiftCartDrawerOpen(isOpen) {
  const shouldOpen = Boolean(isOpen);
  state.cartDrawerOpen = shouldOpen;

  giftCartPanel?.classList.toggle("is-open", shouldOpen);
  giftCartMobileOverlay?.classList.toggle("is-open", shouldOpen);
  document.body.classList.toggle("gift-cart-drawer-open", shouldOpen);

  if (giftCartMobileOverlay) {
    giftCartMobileOverlay.hidden = !shouldOpen;
  }

  if (giftCartMobileBar) {
    giftCartMobileBar.setAttribute("aria-expanded", String(shouldOpen));
  }
}

function giftCartQuantityLabel(quantity) {
  const normalizedQuantity = toNonNegativeInteger(quantity);
  return `${normalizedQuantity} ${normalizedQuantity === 1 ? "presente" : "presentes"}`;
}

function giftAvailabilityQuantityLabel(quantity) {
  const normalizedQuantity = toNonNegativeInteger(quantity);
  return `${normalizedQuantity} ${normalizedQuantity === 1 ? "disponível" : "disponíveis"}`;
}

function giftChoiceQuantityLabel(quantity) {
  const normalizedQuantity = toNonNegativeInteger(quantity);
  return `${normalizedQuantity} ${normalizedQuantity === 1 ? "escolhido" : "escolhidos"}`;
}

function badgeForGift(gift) {
  const available = availableUnits(gift);
  if (available === 0) return { label: "Escolhido", className: "tag-muted" };
  if (available === 1) return { label: "Última unidade", className: "tag-warning" };
  return { label: "Disponível", className: "tag-ok" };
}

function filteredGifts() {
  const query = state.giftQuery;
  let items = state.gifts;

  if (state.filter === "available") items = items.filter((gift) => availableUnits(gift) > 0);
  if (state.filter === "reserved") items = items.filter((gift) => reservedUnits(gift) > 0);

  if (query) {
    items = items.filter((gift) => {
      const haystack = `${gift.name || ""} ${gift.description || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  return [...items].sort(compareGifts);
}

function compareGifts(left, right) {
  switch (state.giftSort) {
    case "price-asc":
      return Number(left.price) - Number(right.price) || String(left.name || "").localeCompare(String(right.name || ""));
    case "price-desc":
      return Number(right.price) - Number(left.price) || String(left.name || "").localeCompare(String(right.name || ""));
    case "name-asc":
      return String(left.name || "").localeCompare(String(right.name || ""));
    default:
      return availableUnits(right) - availableUnits(left) || String(left.name || "").localeCompare(String(right.name || ""));
  }
}

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

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
  const digits = digitsOnly(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const numbers = digits.split("").map(Number);
  const firstVerifier = calculateCpfVerifier(numbers, 9, 10);
  const secondVerifier = calculateCpfVerifier(numbers, 10, 11);
  return numbers[9] === firstVerifier && numbers[10] === secondVerifier;
}

function calculateCpfVerifier(numbers, length, initialWeight) {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += numbers[index] * (initialWeight - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function getFieldContainer(target) {
  return target?.closest?.(".field, .row") || null;
}

function clearFieldError(target) {
  if (!target) return;

  const container = getFieldContainer(target);
  target.classList.remove("input-invalid");
  target.removeAttribute("aria-invalid");
  container?.querySelectorAll(".field-error").forEach((error) => error.remove());
}

function showFieldError(target, message) {
  if (!target) return;

  clearFieldError(target);
  target.classList.add("input-invalid");
  target.setAttribute("aria-invalid", "true");

  const container = getFieldContainer(target);
  if (container) {
    const error = document.createElement("p");
    error.className = "field-error";
    error.textContent = message;
    container.appendChild(error);
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus?.({ preventScroll: true });
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll("`", "&#096;");
}
