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
const ICON_GIFT = '<span class="btn-icon btn-icon-plus" aria-hidden="true">+</span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_UNDO = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 0 1 6.5 4.4H16v2h6V5h-2v2.1A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7z" fill="currentColor"/></svg></span>';
const ICON_TRASH = '<span class="btn-icon trash-icon" aria-hidden="true"><img src="./assets/images/trash-icon.svg" alt="" draggable="false" /></span>';

const state = {
  event: null,
  rsvp: null,
  gifts: [],
  giftCart: {},
  giftSort: "price-asc",
  guestCpf: "",
  identifyingGuest: false,
  actionGiftId: null,
  loading: false,
  cartDrawerOpen: false,
  slug: ""
};

const root = document.getElementById("public-gifts-root");
const hero = document.getElementById("public-gifts-hero");
const title = document.getElementById("public-gifts-title");
const subtitle = document.getElementById("public-gifts-subtitle");
const date = document.getElementById("public-gifts-date");
const notFound = document.getElementById("public-event-not-found");
const notFoundTitle = document.getElementById("public-event-not-found-title");
const notFoundMessage = document.getElementById("public-event-not-found-message");
const guestIdentification = document.getElementById("gift-guest-identification");
const guestCpfInput = document.getElementById("gift-guest-cpf-input");
const identifyButton = document.getElementById("gift-identify-button");
const identifyBackLink = document.getElementById("gift-identify-back-link");
const status = document.getElementById("public-gifts-status");
const experience = document.getElementById("public-gifts-experience");
const giftSortSelect = document.getElementById("gift-sort-select");
const giftGrid = document.getElementById("gift-grid");
const giftCount = document.getElementById("public-gifts-count");
const giftTemplate = document.getElementById("gift-template");
const giftCartPanel = document.getElementById("gift-cart-panel");
const giftCartMobileBar = document.getElementById("gift-cart-mobile-bar");
const giftCartMobileOverlay = document.getElementById("gift-cart-mobile-overlay");
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

  navRight.innerHTML = getUserMenuMarkup();

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
    renderLinkProblem({
      stateName: "invalid-slug",
      titleText: "Este link parece estar incompleto",
      messageText: "Confira se o endereço foi copiado por inteiro ou peça para o casal enviar o convite novamente."
    });
    return;
  }

  try {
    state.loading = true;
    state.slug = safeSlug;
    root.dataset.state = "loading";
    setStatus(status, "status-loading", UI_TEXT.publicEvent.giftsLoading);

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
    renderLinkProblem({
      stateName: "error",
      titleText: "Não encontramos este evento",
      messageText: "O link pode ter sido alterado, removido ou copiado com algum caractere faltando. Peça para o casal reenviar o convite."
    });
  } finally {
    state.loading = false;
  }
}

function renderEventSummary() {
  hero.hidden = false;
  notFound.hidden = true;
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
  renderLinkProblem({
    stateName: "missing-slug",
    titleText: "Esta lista não abriu um evento",
    messageText: "Abra a lista pelo link enviado pelo casal. Se você recebeu o endereço por mensagem, confira se ele foi copiado por completo."
  });
}

function renderLinkProblem({ stateName, titleText, messageText }) {
  root.dataset.state = stateName;
  hero.hidden = true;
  notFound.hidden = false;
  guestIdentification.hidden = true;
  experience.hidden = true;
  orderSuccess.hidden = true;
  status.hidden = true;
  giftCartMobileBar.hidden = true;
  giftCartMobileOverlay.hidden = true;
  setGiftCartDrawerOpen(false);
  notFoundTitle.textContent = titleText;
  notFoundMessage.textContent = messageText;
}

function renderCpfGate() {
  root.dataset.state = "identify";
  hero.hidden = false;
  notFound.hidden = true;
  guestIdentification.hidden = false;
  experience.hidden = true;
  orderSuccess.hidden = true;
  status.hidden = false;
  identifyButton.disabled = false;
  setStatus(status, "status-info", "Informe seu CPF para ver a lista e escolher seu presente.");
}

async function acceptGuestCpf(guestCpf, options = {}) {
  if (!state.event || state.identifyingGuest) return;

  if (!isValidCpf(guestCpf)) {
    showFieldError(guestCpfInput, "Informe um CPF válido para acessar a lista de presentes.");
    return;
  }

  try {
    state.identifyingGuest = true;
    identifyButton.disabled = true;
    identifyButton.textContent = "Buscando...";
    clearFieldError(guestCpfInput);
    setStatus(status, "status-loading", UI_TEXT.publicEvent.rsvpLookupLoading);
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
    state.identifyingGuest = false;
    identifyButton.disabled = false;
    identifyButton.textContent = "OK";
  }
}

async function renderGiftExperience() {
  root.dataset.state = "gifts";
  hero.hidden = false;
  notFound.hidden = true;
  guestIdentification.hidden = true;
  experience.hidden = false;
  orderSuccess.hidden = true;
  status.hidden = false;
  setStatus(status, "status-loading", UI_TEXT.publicEvent.giftsLoadingList);

  await refreshGifts();
  renderGiftList();
  setStatus(status, "status-success", "Presentes carregados. Escolha com carinho e registre seus presentes.");
}

function renderGiftList() {
  giftGrid.innerHTML = "";

  if (!state.event) {
    giftGrid.innerHTML = `<div class="center-empty">${UI_TEXT.publicEvent.emptyEvent}</div>`;
    updateGiftCount(0);
    renderGiftCart();
    return;
  }

  syncGiftCartFromGifts();
  const items = filteredGifts();
  updateGiftCount(items.length);

  if (!items.length) {
    const emptyMessage = state.gifts.length
      ? UI_TEXT.publicEvent.allGiftsReserved
      : UI_TEXT.publicEvent.emptyGifts;
    giftGrid.innerHTML = `<div class="center-empty">${escapeHtml(emptyMessage)}</div>`;
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
    const hasActiveGiftAction = state.actionGiftId !== null;
    const busy = state.actionGiftId === gift.id;
    const badge = badgeForGift(gift);

    giftName.textContent = gift.name;
    giftPrice.textContent = formatCurrency(gift.price);
    giftDescription.textContent = gift.description || UI_TEXT.common.noDescription;
    giftBadge.textContent = badge.label;
    giftBadge.classList.add("tag", badge.className);
    giftMeta.textContent = `${giftAvailabilityQuantityLabel(available)} | ${giftChoiceQuantityLabel(reserved)}${cartQuantity ? ` | Escolhidos: ${cartQuantity}` : ""}`;

    reserveButton.disabled = hasActiveGiftAction || available === 0;
    reserveButton.innerHTML = `${busy ? ICON_SPINNER : ICON_GIFT}<span class="reserve-button-label">${busy ? "Adicionando..." : "Adicionar"}</span>`;
    reserveButton.addEventListener("click", (event) => {
      event.preventDefault();
      reserveGift(gift.id);
    });

    if (unreserveButton) {
      unreserveButton.disabled = hasActiveGiftAction || cartQuantity === 0;
      unreserveButton.innerHTML = `${busy ? ICON_SPINNER : ICON_UNDO}<span>${busy ? "Retirando..." : "Retirar"}</span>`;
      unreserveButton.addEventListener("click", (event) => {
        event.preventDefault();
        unreserveGift(gift.id);
      });
    }

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
          <span>${giftCartQuantityLabel(quantity)} | ${escapeHtml(formatCurrency(toNonNegativeNumber(gift.price) * quantity))}</span>
        </div>
        <button class="btn btn-secondary btn-sm gift-selection-remove" type="button" data-cart-remove-gift-id="${escapeAttribute(gift.id)}" aria-label="Retirar ${escapeAttribute(gift.name)} dos presentes escolhidos" title="Retirar presente" ${state.actionGiftId !== null ? "disabled" : ""}>
          ${state.actionGiftId === gift.id ? ICON_SPINNER : ICON_TRASH}
          <span class="gift-selection-remove-label">${state.actionGiftId === gift.id ? "Retirando..." : "Retirar"}</span>
        </button>
      </li>
    `).join("")
    : '<li class="gift-cart-empty">Nenhum presente escolhido ainda. Escolha um presente para registrar seu carinho.</li>';

  giftCartPanel.innerHTML = `
    <div class="gift-cart-head">
      <div class="gift-cart-title">
        <h3>Sua seleção para os noivos</h3>
        <span class="gift-cart-count"><strong>${escapeHtml(String(totalQuantity))}</strong><span>${totalQuantity === 1 ? "presente" : "presentes"}</span></span>
      </div>
      <button class="gift-cart-close" type="button" aria-label="Fechar seleção de presentes" data-cart-close>
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <ul class="gift-cart-list">${itemMarkup}</ul>
    <div class="gift-cart-subtotal">
      <span>Subtotal</span>
      <strong>${escapeHtml(formatCurrency(totalValue))}</strong>
    </div>
    <div class="gift-cart-total">
      <span>Total dos presentes</span>
      <strong>${escapeHtml(formatCurrency(totalValue))}</strong>
    </div>
    <div class="gift-cart-actions">
      <button id="gift-checkout-button" class="btn btn-primary" type="button" ${items.length && state.actionGiftId === null ? "" : "disabled"}>Registrar presentes</button>
    </div>
  `;

  renderGiftCartMobileBar(summary);
  syncGiftCartDrawerState(summary);
}

function updateGiftCount(quantity) {
  if (!giftCount) return;

  const normalizedQuantity = toNonNegativeInteger(quantity);
  giftCount.textContent = `${normalizedQuantity} ${normalizedQuantity === 1 ? "item" : "itens"}`;
}

function handleGiftCartPanelClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const removeButton = target.closest("[data-cart-remove-gift-id]");
  if (removeButton && giftCartPanel.contains(removeButton)) {
    event.preventDefault();
    event.stopPropagation();
    if (state.actionGiftId !== null) return;

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
    if (state.actionGiftId !== null) return;
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
    setStatus(status, "status-success", UI_TEXT.publicEvent.reserveSuccess);
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
  hero.hidden = false;
  notFound.hidden = true;
  guestIdentification.hidden = true;
  experience.hidden = true;
  orderSuccess.hidden = false;
  status.hidden = false;
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
  if (typeof gift.availableQuantity === "number") return toNonNegativeInteger(gift.availableQuantity);
  const reserved = toNonNegativeInteger(gift.reservedQuantity);
  return Math.max(0, toNonNegativeInteger(gift.quantity) - reserved);
}

function reservedUnits(gift) {
  if (typeof gift.reservedQuantity === "number") return toNonNegativeInteger(gift.reservedQuantity);
  return Math.max(0, toNonNegativeInteger(gift.quantity) - availableUnits(gift));
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
    totalValue: items.reduce((sum, item) => sum + toNonNegativeNumber(item.gift.price) * item.quantity, 0)
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
  const items = state.gifts.filter((gift) => availableUnits(gift) > 0);

  return [...items].sort(compareGifts);
}

function compareGifts(left, right) {
  switch (state.giftSort) {
    case "price-asc":
      return toNonNegativeNumber(left.price) - toNonNegativeNumber(right.price) || String(left.name || "").localeCompare(String(right.name || ""));
    case "price-desc":
      return toNonNegativeNumber(right.price) - toNonNegativeNumber(left.price) || String(left.name || "").localeCompare(String(right.name || ""));
    case "name-asc":
      return String(left.name || "").localeCompare(String(right.name || ""));
    default:
      return String(left.name || "").localeCompare(String(right.name || ""));
  }
}

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function toNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
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
