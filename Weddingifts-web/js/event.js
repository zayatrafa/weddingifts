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
  formatEventDateTime,
  getEventTimeZoneId,
  getTimeZoneLabel,
  parseEventInstant
} from "./event-contract.js";

const state = {
  event: null,
  gifts: [],
  giftsLoaded: false,
  filter: "all",
  giftCart: {},
  giftQuery: "",
  giftSort: "availability",
  loading: false,
  actionGiftId: null,
  rsvp: null,
  rsvpSubmitting: false,
  rsvpLookupSubmitting: false,
  rsvpReadyToContinue: false,
  slug: "",
  guestCpf: "",
  mode: "loading",
  currentStep: "identify"
};

const flowRoot = document.getElementById("invitation-flow-root");
const stepPanel = document.getElementById("invitation-step-panel");
const identifyFields = document.getElementById("invitation-identify-fields");
const identifyCpfField = identifyFields.querySelector(".field");
const identifyActionArea = identifyFields.querySelector(".invitation-fixed-action");
const guestCpfInput = document.getElementById("invitation-guest-cpf-input");
const rsvpLookupButton = document.getElementById("invitation-next-button");
const completeButton = document.getElementById("invitation-complete-button");
const status = document.getElementById("invitation-flow-status");
const rsvpStatus = document.getElementById("rsvp-status");
const rsvpPanel = document.getElementById("rsvp-panel");
const giftFilterSection = document.getElementById("public-gift-filter-section");
const giftSearchInput = document.getElementById("gift-search-input");
const giftSortSelect = document.getElementById("gift-sort-select");
const giftGrid = document.getElementById("gift-grid");
const giftTemplate = document.getElementById("gift-template");
const filters = document.querySelectorAll(".filter-button");
const ICON_GIFT = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-3.2A3 3 0 0 0 14 3h-4a3 3 0 0 0-2.8 4H4v14h16V7zM10 5h4a1 1 0 0 1 0 2h-4a1 1 0 1 1 0-2zm8 14H6V9h12v10z" fill="currentColor"/></svg></span>';
const ICON_SPINNER = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" fill="currentColor"/></svg></span>';
const ICON_UNDO = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 0 1 6.5 4.4H16v2h6V5h-2v2.1A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7z" fill="currentColor"/></svg></span>';
const MAX_SLUG_LENGTH = 24;
const MAX_RSVP_TEXT_LENGTH = 500;
const MAX_COMPANION_NAME_LENGTH = 120;
const PUBLIC_GIFT_CONTEXT_KEY = "wg_public_gift_context";

const session = getAuthSession();
enhanceHeaderForLoggedUser(session);
prefillGuestCpfForLoggedUser(session);

const query = new URLSearchParams(window.location.search);
const querySlug = String(query.get("slug") || "").trim();

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
  clearFieldError(guestCpfInput);
  autoLookupRsvpWhenCpfIsComplete();
});

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

rsvpLookupButton.addEventListener("click", handlePrimaryAction);
completeButton.addEventListener("click", completeInvitationFlow);

if (querySlug) {
  loadEvent(querySlug);
} else {
  renderMissingSlug();
}

function enhanceHeaderForLoggedUser(sessionData) {
  if (!sessionData?.token) return;

  const navRight = document.querySelector(".shell-nav-right");
  if (!navRight) return;

  navRight.innerHTML = `
    <div class="shell-links">
      <a href="./event.html" class="active">Evento público</a>
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

function prefillGuestCpfForLoggedUser(sessionData) {
  if (!guestCpfInput || !sessionData?.token) return;

  const claims = decodeJwtClaims(sessionData.token);
  const cpfFromToken = typeof claims?.cpf === "string" ? claims.cpf : "";
  const cpfFromSession = typeof sessionData?.user?.cpf === "string" ? sessionData.user.cpf : "";
  const cpf = digitsOnly(cpfFromToken || cpfFromSession);

  if (cpf.length !== 11) return;

  guestCpfInput.value = formatCpfInput(cpf);
  guestCpfInput.readOnly = true;
  guestCpfInput.setAttribute("aria-readonly", "true");
  guestCpfInput.title = "CPF preenchido automaticamente pela sua conta logada.";
}

function decodeJwtClaims(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
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

function giftCartQuantityLabel(quantity) {
  const normalizedQuantity = toNonNegativeInteger(quantity);
  return `${normalizedQuantity} ${normalizedQuantity === 1 ? "presente" : "presentes"}`;
}

function badgeForGift(gift) {
  const available = availableUnits(gift);
  if (available === 0) return { label: "Reservado", className: "tag-muted" };
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

function refreshHeader() {
  const title = document.getElementById("event-title");
  const subtitle = document.getElementById("event-subtitle");
  const date = document.getElementById("event-date");
  const hosts = document.getElementById("event-hosts");
  const slug = document.getElementById("event-slug");
  const total = document.getElementById("event-total");
  const cover = document.getElementById("event-cover");
  const coverImage = document.getElementById("event-cover-image");
  const details = document.getElementById("event-details");

  if (!state.event) {
    title.textContent = "Evento não carregado";
    subtitle.textContent = "Use o slug público para consultar o evento e a lista de presentes.";
    date.textContent = "--";
    hosts.textContent = "--";
    slug.textContent = "--";
    total.textContent = "0 itens";
    cover.hidden = true;
    coverImage.removeAttribute("src");
    details.hidden = true;
    details.innerHTML = "";
    return;
  }

  title.textContent = state.event.name;
  subtitle.textContent = state.event.hostNames
    ? `Com ${state.event.hostNames}`
    : "Lista pública atualizada em tempo real pela API.";
  date.textContent = formatEventDateTime(state.event);
  hosts.textContent = state.event.hostNames || "--";
  slug.textContent = state.event.slug;
  total.textContent = `${state.gifts.length} itens`;

  if (state.event.coverImageUrl) {
    cover.hidden = false;
    coverImage.src = state.event.coverImageUrl;
    coverImage.alt = `Imagem de capa do evento ${state.event.name}`;
  } else {
    cover.hidden = true;
    coverImage.removeAttribute("src");
  }

  const rows = [
    ["Casal", state.event.hostNames],
    ["Local", state.event.locationName],
    ["Endereço", state.event.locationAddress],
    ["Cerimônia", state.event.ceremonyInfo],
    ["Traje", state.event.dressCode],
    ["Fuso", getTimeZoneLabel(getEventTimeZoneId(state.event))]
  ].filter(([, value]) => String(value || "").trim());

  if (state.event.locationMapsUrl) {
    rows.push(["Mapa", `<a href="${escapeAttribute(state.event.locationMapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir localização</a>`]);
  }

  details.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${label === "Mapa" ? value : escapeHtml(value)}</dd></div>`)
    .join("");
  details.hidden = rows.length === 0;
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
    giftMeta.textContent = `${available} disponíveis | ${reserved} reservados${cartQuantity ? ` | No carrinho: ${cartQuantity}` : ""}`;

    reserveButton.disabled = busy || available === 0;
    reserveButton.innerHTML = `${busy ? ICON_SPINNER : ICON_GIFT}${busy ? "Aguarde..." : "Adicionar ao carrinho"}`;
    reserveButton.addEventListener("click", () => reserveGift(gift.id));

    unreserveButton.disabled = busy || cartQuantity === 0;
    unreserveButton.innerHTML = `${ICON_UNDO}Remover do carrinho`;
    unreserveButton.addEventListener("click", () => unreserveGift(gift.id));

    giftGrid.appendChild(fragment);
  });

  renderGiftCart();
}

function renderGiftCart() {
  const cartPanel = document.getElementById("gift-cart-panel");
  if (!cartPanel) return;

  syncGiftCartFromGifts();
  const items = getGiftCartItems();
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.gift.price || 0) * item.quantity, 0);
  const itemMarkup = items.length
    ? items.map(({ gift, quantity }) => `
      <li class="gift-cart-item">
        <div>
          <strong>${escapeHtml(gift.name)}</strong>
          <span>${giftCartQuantityLabel(quantity)} | ${escapeHtml(formatCurrency(Number(gift.price || 0) * quantity))}</span>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-cart-remove-gift-id="${escapeAttribute(gift.id)}">Remover</button>
      </li>
    `).join("")
    : '<li class="gift-cart-empty">Seu carrinho está vazio. Você pode continuar mesmo sem escolher presente.</li>';

  cartPanel.innerHTML = `
    <div class="gift-cart-head">
      <div>
        <p class="kicker">Carrinho de presentes</p>
        <h3>Presentes escolhidos</h3>
      </div>
      <span class="tag tag-ok">${escapeHtml(giftCartQuantityLabel(totalQuantity))}</span>
    </div>
    <ul class="gift-cart-list">${itemMarkup}</ul>
    <div class="gift-cart-total">
      <span>Total reservado</span>
      <strong>${escapeHtml(formatCurrency(totalValue))}</strong>
    </div>
    <div class="gift-cart-actions">
      <button id="gift-cart-back-button" class="btn btn-secondary" type="button">Voltar</button>
      <button id="gift-cart-continue-button" class="btn btn-primary" type="button">Continuar</button>
    </div>
  `;

  cartPanel.querySelectorAll("[data-cart-remove-gift-id]").forEach((button) => {
    button.addEventListener("click", () => unreserveGift(Number(button.dataset.cartRemoveGiftId)));
  });

  cartPanel.querySelector("#gift-cart-back-button")?.addEventListener("click", backFromGiftStep);
  cartPanel.querySelector("#gift-cart-continue-button")?.addEventListener("click", continueFromGiftStep);
}

async function refreshGifts() {
  if (!state.event) return;
  const apiBase = getApiBase();
  state.gifts = await requestJson(`${apiBase}/api/events/${state.event.id}/gifts`);
  state.giftsLoaded = true;
  syncGiftCartFromGifts();
}

async function ensureGiftsLoaded() {
  if (state.giftsLoaded) return;
  await refreshGifts();
}

function handlePrimaryAction() {
  if (state.mode === "directAction") {
    renderReturnMenu();
    return;
  }

  if (state.mode === "identify") {
    lookupRsvp();
    return;
  }

  if (state.currentStep === "rsvp") {
    if (state.rsvpReadyToContinue) {
      renderLocationStep();
      return;
    }

    document.getElementById("rsvp-form")?.requestSubmit();
    return;
  }

  if (state.currentStep === "gifts") {
    renderLocationStep();
    return;
  }

  if (state.currentStep === "location") {
    backFromLocationStep();
  }
}

function setButtonVariant(button, variant) {
  if (!button) return;
  const isPrimary = variant === "primary";
  button.classList.toggle("btn-primary", isPrimary);
  button.classList.toggle("btn-secondary", !isPrimary);
}

function autoLookupRsvpWhenCpfIsComplete() {
  if (state.mode !== "identify" || state.rsvpLookupSubmitting) return;

  const guestCpf = digitsOnly(guestCpfInput.value);
  if (guestCpf.length < 11) return;

  if (!isValidCpf(guestCpf)) {
    showFieldError(guestCpfInput, "Informe um CPF válido para consultar o convite.");
    return;
  }

  lookupRsvp();
}

function showCpfIdentification() {
  identifyFields.hidden = false;
  identifyCpfField.hidden = false;
  identifyActionArea.hidden = false;
}

function showInvitationActionArea() {
  identifyFields.hidden = false;
  identifyCpfField.hidden = true;
  identifyActionArea.hidden = false;
}

function hideInvitationActionArea() {
  identifyFields.hidden = true;
  identifyCpfField.hidden = true;
  identifyActionArea.hidden = true;
}

function renderMissingSlug() {
  state.event = null;
  state.gifts = [];
  state.rsvp = null;
  state.mode = "missingSlug";
  flowRoot.dataset.state = "missing-slug";
  hideInvitationActionArea();
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  render();
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Link do convite</p>
      <h2>Convite não encontrado</h2>
      <p>Abra o convite pelo link enviado pelo casal. O endereço precisa incluir o código do evento.</p>
    </div>
  `;
  setStatus(status, "status-error", "Link do convite incompleto.");
}

function renderLoadError(message) {
  state.event = null;
  state.gifts = [];
  state.rsvp = null;
  state.mode = "loadError";
  flowRoot.dataset.state = "error";
  hideInvitationActionArea();
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  render();
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Convite indisponível</p>
      <h2>Não foi possível abrir este convite</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  setStatus(status, "status-error", message);
}

function renderIdentifyStep() {
  state.mode = "identify";
  state.currentStep = "identify";
  flowRoot.dataset.state = "identify";
  showCpfIdentification();
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "OK";
  setButtonVariant(rsvpLookupButton, "primary");
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-identify-copy">
      <p class="kicker">Identificação do convidado</p>
      <h2>Você foi convidado para o evento ${escapeHtml(state.event?.name || "")}</h2>
      <p>Informe seu CPF para acessar o convite, confirmar presença e consultar as informações preparadas pelo casal.</p>
    </div>
  `;
}

function renderRsvpStep() {
  state.mode = "flow";
  state.currentStep = "rsvp";
  flowRoot.dataset.state = "rsvp";
  hideInvitationActionArea();
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Continuar";
  setButtonVariant(rsvpLookupButton, "primary");
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  clearFlowStatus();
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-rsvp-copy">
      <p class="kicker">Confirmação de presença</p>
      <h2>Confirme sua presença</h2>
      <p>Atualize sua resposta e seus acompanhantes permitidos para que o casal receba a lista correta.</p>
    </div>
  `;
  renderRsvpPanel();
}

async function renderGiftStep() {
  state.mode = "flow";
  state.currentStep = "gifts";
  flowRoot.dataset.state = "gifts";
  showInvitationActionArea();
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = true;
  rsvpLookupButton.textContent = "Carregando presentes...";
  setButtonVariant(rsvpLookupButton, "primary");
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-gift-copy">
      <p class="kicker">Lista de presentes</p>
      <h2>Escolha um presente, se quiser</h2>
      <p>Esta etapa é opcional. Adicione presentes ao carrinho ou continue sem escolher.</p>
    </div>
    <div id="gift-cart-panel" class="gift-cart-panel" aria-live="polite"></div>
  `;
  render();
  setStatus(status, "status-loading", "Carregando presentes...");

  try {
    await ensureGiftsLoaded();
    render();
    setStatus(status, "status-success", "Presentes carregados. Você pode adicionar ao carrinho ou continuar.");
  } catch (error) {
    setStatus(status, "status-error", `Não foi possível carregar presentes: ${error.message}`);
  } finally {
    rsvpLookupButton.disabled = false;
    rsvpLookupButton.textContent = "Continuar";
  }
}

function continueFromGiftStep() {
  if (state.mode === "directAction") {
    renderDirectEventInfo();
    return;
  }

  renderLocationStep();
}

function backFromGiftStep() {
  const wasDirectAction = state.mode === "directAction";
  state.rsvpReadyToContinue = false;
  renderRsvpStep();

  if (wasDirectAction) {
    renderBackToMenuAction();
  }

  setStatus(status, "status-info", "Revise sua confirmação de presença.");
}

function backFromLocationStep() {
  state.rsvpReadyToContinue = false;
  renderRsvpStep();
  setStatus(status, "status-info", "Revise sua confirmação antes de concluir o convite.");
}

function renderAfterGiftStep() {
  state.currentStep = "postGifts";
  flowRoot.dataset.state = "post-gifts";
  showInvitationActionArea();
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = true;
  rsvpLookupButton.textContent = "Continuar";
  setButtonVariant(rsvpLookupButton, "primary");
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Presentes concluídos</p>
      <h2>Presentes concluídos</h2>
      <p>A próxima etapa do fluxo mostrará as informações finais do evento.</p>
    </div>
  `;
  setStatus(status, "status-success", "Etapa de presentes concluída.");
}

function renderLocationStep() {
  state.currentStep = "location";
  flowRoot.dataset.state = "location";
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  clearFlowStatus();
  clearRsvpStatus();
  showInvitationActionArea();
  rsvpLookupButton.hidden = false;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Voltar";
  setButtonVariant(rsvpLookupButton, "secondary");
  completeButton.hidden = false;
  completeButton.disabled = false;
  completeButton.textContent = "Continuar";
  setButtonVariant(completeButton, "primary");
  stepPanel.innerHTML = renderEventInfoMarkup("Informações do evento", true);
}

function renderEventInfoMarkup(kicker, includeFinalMessage) {
  const eventTitle = state.event?.name || state.event?.locationName || "Evento";
  const hostNames = isSameInfoValue(state.event?.hostNames, eventTitle) ? "" : state.event?.hostNames;
  const subtitle = includeFinalMessage
    ? "Confira data, local e orientações. Depois disso, você escolhe se quer presentear os noivos agora."
    : "Confira os detalhes do evento.";

  return `
    <div class="invitation-event-info">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h2>${escapeHtml(eventTitle)}</h2>
      <p class="invitation-event-subtitle">${escapeHtml(subtitle)}</p>
      <dl class="invitation-info-list">
        ${renderInfoRow("Casal", hostNames)}
        ${renderInfoRow("Data e hora", formatEventDateTime(state.event))}
        ${renderLocationInfoRow(eventTitle)}
        ${renderInfoRow("Cerimônia", state.event?.ceremonyInfo)}
        ${renderInfoRow("Traje", state.event?.dressCode)}
      </dl>
      ${includeFinalMessage ? '<p class="invitation-event-note">Clique em Continuar para seguir para a etapa de presentes.</p>' : ""}
    </div>
  `;
}

function renderInfoRow(label, value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return `<div class="invitation-info-row"><dt>${escapeHtml(label)}</dt><dd><span>${escapeHtml(text)}</span></dd></div>`;
}

function renderLocationInfoRow(visibleTitle) {
  const rawLocationName = String(state.event?.locationName || "").trim();
  const locationName = isSameInfoValue(rawLocationName, visibleTitle) ? "" : rawLocationName;
  const address = String(state.event?.locationAddress || "").trim();
  const mapsUrl = String(state.event?.locationMapsUrl || "").trim();

  if (!locationName && !address && !mapsUrl) return "";

  return `
    <div class="invitation-info-row invitation-location-row">
      <dt>Local</dt>
      <dd>
        ${locationName ? `<strong>${escapeHtml(locationName)}</strong>` : ""}
        ${address ? `<span>${escapeHtml(address)}</span>` : ""}
        ${mapsUrl ? `<a class="invitation-map-link" href="${escapeAttribute(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir no mapa</a>` : ""}
      </dd>
    </div>
  `;
}

function isSameInfoValue(left, right) {
  const normalizedLeft = String(left || "").trim().toLowerCase();
  const normalizedRight = String(right || "").trim().toLowerCase();
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
}

async function completeInvitationFlow() {
  if (!state.event || !state.guestCpf) return;

  if (normalizeRsvpStatus(state.rsvp?.rsvpStatus) === "pending") {
    renderRsvpStep();
    setRsvpStatus("status-error", "Confirme ou recuse sua presença antes de concluir o convite.");
    return;
  }

  try {
    completeButton.disabled = true;
    completeButton.textContent = "Continuando...";
    clearFlowStatus();
    clearRsvpStatus();
    const apiBase = getApiBase();
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/invitation-flow/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf: state.guestCpf })
    });
    renderCompletionSuccess();
  } catch (error) {
    if (normalizeRsvpStatus(state.rsvp?.rsvpStatus) === "pending") {
      renderRsvpStep();
    }
    setStatus(status, "status-error", `Não foi possível continuar: ${error.message}`);
  } finally {
    completeButton.disabled = false;
    completeButton.textContent = "Continuar";
  }
}

function renderCompletionSuccess() {
  state.currentStep = "complete";
  flowRoot.dataset.state = "complete";
  hideInvitationActionArea();
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  clearFlowStatus();
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-completion">
      <div class="invitation-gift-icon" aria-hidden="true">${ICON_GIFT}</div>
      <p class="kicker">Convite concluído</p>
      <h2>Obrigado por confirmar sua presença</h2>
      <p>As informações do evento ficam disponíveis neste link. Se quiser, você pode escolher um presente agora.</p>
      <div class="invitation-completion-actions">
        <button id="invitation-gift-now-button" class="btn btn-primary with-icon" type="button">${ICON_GIFT}Quero presentear</button>
        <button id="invitation-gift-later-button" class="btn btn-secondary" type="button">Não vou presentear</button>
      </div>
    </div>
  `;
  stepPanel.querySelector("#invitation-gift-now-button")?.addEventListener("click", openPublicGiftPage);
  stepPanel.querySelector("#invitation-gift-later-button")?.addEventListener("click", renderCompletionExit);
}

function renderCompletionExit() {
  hideInvitationActionArea();
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  clearFlowStatus();
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Tudo certo</p>
      <h2>Convite concluído</h2>
      <p>Você pode voltar a este link e informar seu CPF quando quiser rever as informações ou presentear os noivos.</p>
    </div>
  `;
}

function renderReturnMenu() {
  state.mode = "returnMenu";
  state.currentStep = "returnMenu";
  flowRoot.dataset.state = "return-menu";
  hideInvitationActionArea();
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  rsvpPanel.hidden = true;
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  stepPanel.innerHTML = `
    <div id="invitation-return-menu" class="invitation-return-menu">
      <p class="kicker">Menu do convite</p>
      <h2>Bem-vindo de volta, ${escapeHtml(state.rsvp?.guestName || "convidado")}</h2>
      <button class="btn btn-primary" type="button" data-return-action="gifts">Presentear casal</button>
      <button class="btn btn-secondary" type="button" data-return-action="info">Informações do evento</button>
      <button class="btn btn-secondary" type="button" data-return-action="companions">Adicionar/editar convidados extras</button>
      <button class="btn btn-secondary" type="button" data-return-action="rsvp">Confirmar/cancelar presença</button>
    </div>
  `;
  stepPanel.querySelectorAll("[data-return-action]").forEach((button) => {
    button.addEventListener("click", () => openDirectAction(button.dataset.returnAction));
  });
  clearFlowStatus();
}

function renderBackToMenuAction() {
  state.mode = "directAction";
  showInvitationActionArea();
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Voltar ao menu";
  setButtonVariant(rsvpLookupButton, "secondary");
}

function renderDirectEventInfo() {
  state.currentStep = "directInfo";
  flowRoot.dataset.state = "direct-info";
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  renderBackToMenuAction();
  stepPanel.innerHTML = renderEventInfoMarkup("Informações do evento", true);
  clearFlowStatus();
  clearRsvpStatus();
}

function openDirectAction(action) {
  if (action === "gifts") {
    openPublicGiftPage();
    return;
  }

  if (action === "info") {
    renderDirectEventInfo();
    return;
  }

  if (action === "companions" || action === "rsvp") {
    state.rsvpReadyToContinue = false;
    renderRsvpStep();
    renderBackToMenuAction();
  }
}

function openPublicGiftPage() {
  if (!state.event?.slug) return;

  savePublicGiftContext();
  window.location.href = `./gifts.html?slug=${encodeURIComponent(state.event.slug)}`;
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
    // The gift page can still ask for CPF if session storage is unavailable.
  }
}

async function loadEvent(slug) {
  const apiBase = getApiBase();
  const safeSlug = String(slug || "").trim();
  slug = safeSlug;

  if (!slug) {
    renderMissingSlug();
    return;
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    renderLoadError("O slug deve ter no máximo 24 caracteres.");
    return;
  }

  try {
    state.loading = true;
    state.mode = "loading";
    state.slug = safeSlug;
    state.rsvp = null;
    state.gifts = [];
    state.giftsLoaded = false;
    state.giftCart = {};
    state.giftQuery = "";
    state.giftSort = "availability";
    state.filter = "all";
    state.guestCpf = "";
    state.rsvpReadyToContinue = false;
    giftSearchInput.value = "";
    giftSortSelect.value = "availability";
    filters.forEach((button) => {
      const isAll = (button.dataset.giftFilter || button.dataset.filter) === "all";
      button.classList.toggle("btn-primary", isAll);
      button.classList.toggle("btn-secondary", !isAll);
    });
    clearRsvpStatus();
    rsvpPanel.hidden = true;
    hideInvitationActionArea();
    rsvpLookupButton.disabled = true;
    flowRoot.dataset.state = "loading";
    stepPanel.innerHTML = '<div class="center-empty">Carregando convite...</div>';
    setStatus(status, "status-loading", UI_TEXT.publicEvent.loading);
    state.event = await requestJson(`${apiBase}/api/events/${encodeURIComponent(slug)}`);
    render();
    renderIdentifyStep();
    setStatus(status, "status-success", "Convite carregado. Informe seu CPF para continuar.");
  } catch (error) {
    renderLoadError(`${UI_TEXT.publicEvent.loadError}: ${error.message}`);
  } finally {
    state.loading = false;
    if (state.event && state.mode === "identify") {
      rsvpLookupButton.disabled = false;
      showCpfIdentification();
    }
  }
}

async function lookupRsvp() {
  if (state.rsvpLookupSubmitting) return;

  if (!state.event) {
    showFieldError(guestCpfInput, "Abra o convite pelo link enviado pelo casal.");
    clearRsvpStatus();
    return;
  }

  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);
  if (!isValidCpf(guestCpf)) {
    showFieldError(guestCpfInput, "Informe um CPF válido para consultar o convite.");
    clearRsvpStatus();
    return;
  }

  try {
    state.rsvpLookupSubmitting = true;
    rsvpLookupButton.disabled = true;
    clearFieldError(guestCpfInput);
    setStatus(status, "status-loading", "Consultando convite...");
    clearRsvpStatus();

    const apiBase = getApiBase();
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp?guestCpf=${encodeURIComponent(guestCpf)}`);
    state.guestCpf = guestCpf;
    state.giftCart = {};
    if (state.rsvp.hasCompletedInvitationFlow) {
      renderReturnMenu();
    } else {
      state.rsvpReadyToContinue = false;
      renderRsvpStep();
    }
  } catch (error) {
    state.rsvp = null;
    renderIdentifyStep();
    showFieldError(guestCpfInput, `Não foi possível consultar o convite: ${error.message}`);
    clearFlowStatus();
    if (state.currentStep === "rsvp") {
      renderRsvpStep();
    } else {
      renderRsvpPanel();
    }
    clearRsvpStatus();
  } finally {
    state.rsvpLookupSubmitting = false;
    if (state.mode === "identify") {
      rsvpLookupButton.disabled = false;
    }
  }
}

function renderRsvpPanel() {
  if (!state.event) {
    rsvpPanel.hidden = true;
    rsvpPanel.innerHTML = '<div class="center-empty">Carregue o evento para consultar o RSVP.</div>';
    return;
  }

  if (!state.rsvp) {
    rsvpPanel.hidden = true;
    rsvpPanel.innerHTML = '<div class="center-empty">Informe o CPF do convidado para continuar.</div>';
    return;
  }

  rsvpPanel.hidden = false;
  const currentStatus = normalizeRsvpStatus(state.rsvp.rsvpStatus) === "declined" ? "declined" : "accepted";
  const companionCount = currentStatus === "accepted"
    ? Math.min(state.rsvp.companions?.length || 0, state.rsvp.maxExtraGuests || 0)
    : 0;

  rsvpPanel.innerHTML = `
    <form id="rsvp-form" class="form form-compact rsvp-form">
      <div class="rsvp-current-state">
        <strong>${escapeHtml(state.rsvp.guestName)}</strong>
        <span class="tag ${statusTagClass(state.rsvp.rsvpStatus)}">${escapeHtml(statusLabel(state.rsvp.rsvpStatus))}</span>
        <span class="muted">Acompanhantes permitidos: ${toNonNegativeInteger(state.rsvp.maxExtraGuests)}</span>
      </div>

      <fieldset class="rsvp-fieldset">
        <legend>Você confirma presença?</legend>
        <label class="radio-card"><input type="radio" name="rsvpStatus" value="accepted" ${currentStatus === "accepted" ? "checked" : ""} /> Sim, confirmo presença</label>
        <label class="radio-card"><input type="radio" name="rsvpStatus" value="declined" ${currentStatus === "declined" ? "checked" : ""} /> Não poderei comparecer</label>
      </fieldset>

      <div class="field">
        <label for="rsvp-message-input">Mensagem para os noivos</label>
        <textarea class="textarea" id="rsvp-message-input" maxlength="500" placeholder="Mensagem opcional">${escapeHtml(state.rsvp.messageToCouple || "")}</textarea>
      </div>

      <div id="rsvp-accepted-fields">
        <div class="field">
          <label for="rsvp-dietary-input">Restrições alimentares</label>
          <textarea class="textarea" id="rsvp-dietary-input" maxlength="500" placeholder="Ex: vegetariano, alergia a castanhas">${escapeHtml(state.rsvp.dietaryRestrictions || "")}</textarea>
        </div>

        <div class="field">
          <label for="rsvp-companion-count-input">Quantidade de acompanhantes</label>
          <input class="input" id="rsvp-companion-count-input" type="number" inputmode="numeric" min="0" max="${toNonNegativeInteger(state.rsvp.maxExtraGuests)}" step="1" value="${companionCount}" />
        </div>
        <div id="rsvp-companions-list" class="rsvp-companions-list"></div>
      </div>

      <div class="row row-tight fit-content rsvp-form-actions">
        <button id="rsvp-back-button" class="btn btn-secondary" type="button">Voltar</button>
        <button id="rsvp-submit-button" class="btn btn-primary" type="submit">Continuar</button>
      </div>
    </form>
  `;

  const form = document.getElementById("rsvp-form");
  const companionCountInput = document.getElementById("rsvp-companion-count-input");
  const initialCompanions = Array.isArray(state.rsvp.companions) ? state.rsvp.companions : [];

  syncRsvpStatusUi();
  renderCompanionFields(companionCount, initialCompanions);

  form.querySelectorAll('input[name="rsvpStatus"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === "declined" && input.checked) {
        companionCountInput.value = "0";
        renderCompanionFields(0, []);
      }
      syncRsvpStatusUi();
    });
  });

  companionCountInput?.addEventListener("input", () => {
    const currentValues = readCompanionValues();
    const count = parseCompanionCount(companionCountInput.value);
    renderCompanionFields(count ?? 0, currentValues);
  });

  form.addEventListener("input", (event) => {
    clearFieldError(event.target);
    markRsvpStepDirty();
  });
  form.addEventListener("change", (event) => {
    clearFieldError(event.target);
    markRsvpStepDirty();
  });
  form.querySelector("#rsvp-back-button")?.addEventListener("click", handleRsvpBack);
  form.addEventListener("submit", submitRsvp);
}

function handleRsvpBack() {
  if (state.rsvpSubmitting) return;

  state.rsvpReadyToContinue = false;

  if (state.mode === "directAction") {
    renderReturnMenu();
    return;
  }

  state.guestCpf = "";
  renderIdentifyStep();
  clearFlowStatus();
}

function markRsvpStepDirty() {
  if (state.currentStep !== "rsvp") return;
  state.rsvpReadyToContinue = false;
  rsvpLookupButton.textContent = "Continuar";
}

function syncRsvpStatusUi() {
  const selectedStatus = getSelectedRsvpStatus();
  const acceptedFields = document.getElementById("rsvp-accepted-fields");

  if (!acceptedFields) return;
  acceptedFields.hidden = selectedStatus === "declined";
}

function renderCompanionFields(count, existingCompanions = []) {
  const container = document.getElementById("rsvp-companions-list");
  if (!container) return;

  const maxExtraGuests = toNonNegativeInteger(state.rsvp?.maxExtraGuests);
  const safeCount = Math.min(Math.max(0, count), maxExtraGuests);
  const companionCountInput = document.getElementById("rsvp-companion-count-input");
  if (companionCountInput && companionCountInput.value !== String(safeCount)) {
    companionCountInput.value = String(safeCount);
  }

  if (maxExtraGuests === 0) {
    container.innerHTML = '<p class="muted rsvp-help">Este convite não permite acompanhantes.</p>';
    return;
  }

  if (safeCount === 0) {
    container.innerHTML = '<p class="muted rsvp-help">Nenhum acompanhante informado.</p>';
    return;
  }

  container.innerHTML = "";
  for (let index = 0; index < safeCount; index += 1) {
    const companion = existingCompanions[index] || {};
    const card = document.createElement("article");
    card.className = "rsvp-companion-card";
    card.innerHTML = `
      <h3>Acompanhante ${index + 1}</h3>
      <div class="field">
        <label for="companion-${index}-name">Nome</label>
        <input class="input" id="companion-${index}-name" data-companion-field="name" type="text" maxlength="120" value="${escapeAttribute(companion.name || "")}" required />
      </div>
      <div class="rsvp-companion-docs">
        <div class="field field-flat">
          <label for="companion-${index}-birth-date">Data de nascimento</label>
          <input class="input" id="companion-${index}-birth-date" data-companion-field="birthDate" type="date" value="${escapeAttribute(toBirthDateInputValue(companion.birthDate))}" required />
          <p class="field-help field-help-placeholder" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="field field-flat">
          <label for="companion-${index}-cpf">CPF</label>
          <input class="input" id="companion-${index}-cpf" data-companion-field="cpf" type="text" inputmode="numeric" maxlength="14" value="${escapeAttribute(formatCpfInput(companion.cpf || ""))}" />
          <p class="field-help" data-companion-cpf-help>Informe a data de nascimento para validar CPF.</p>
        </div>
      </div>
    `;

    const birthDateInput = card.querySelector('[data-companion-field="birthDate"]');
    const cpfInput = card.querySelector('[data-companion-field="cpf"]');

    cpfInput.addEventListener("input", () => {
      cpfInput.value = formatCpfInput(cpfInput.value);
    });
    birthDateInput.addEventListener("input", () => {
      updateCompanionCpfRequirement(card);
    });

    container.appendChild(card);
    updateCompanionCpfRequirement(card);
  }
}

async function submitRsvp(event) {
  event.preventDefault();

  if (!state.event || !state.rsvp || state.rsvpSubmitting) return;

  const selectedStatus = getSelectedRsvpStatus();
  const messageToCouple = document.getElementById("rsvp-message-input")?.value.trim() || "";
  const dietaryRestrictions = document.getElementById("rsvp-dietary-input")?.value.trim() || "";
  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);
  const wasDirectAction = state.mode === "directAction";

  clearRsvpFieldErrors();
  const validationError = validateRsvpSubmission(selectedStatus, messageToCouple, dietaryRestrictions);
  if (validationError) {
    clearRsvpStatus();
    showFieldError(validationError.target, validationError.message);
    return;
  }

  const companions = selectedStatus === "accepted" ? readCompanionValues() : [];
  const payload = {
    guestCpf,
    status: selectedStatus,
    messageToCouple: messageToCouple || null,
    companions
  };

  if (selectedStatus === "accepted") {
    payload.dietaryRestrictions = dietaryRestrictions || null;
  }

  try {
    state.rsvpSubmitting = true;
    const submitButton = document.getElementById("rsvp-submit-button");
    const backButton = document.getElementById("rsvp-back-button");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Continuando...";
    }
    if (backButton) {
      backButton.disabled = true;
    }

    clearRsvpStatus();
    const apiBase = getApiBase();
    const method = normalizeRsvpStatus(state.rsvp.rsvpStatus) === "pending" ? "POST" : "PUT";
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.rsvpReadyToContinue = true;

    if (state.currentStep === "rsvp" && !wasDirectAction) {
      renderLocationStep();
    } else if (state.currentStep === "rsvp") {
      renderRsvpStep();
      renderBackToMenuAction();
    } else {
      renderRsvpPanel();
    }
    if (wasDirectAction) {
      setRsvpStatus("status-success", selectedStatus === "accepted"
        ? "Presença confirmada com sucesso."
        : "Presença recusada com sucesso.");
    }
  } catch (error) {
    clearRsvpStatus();
    showBackendRsvpError(`Não foi possível continuar: ${error.message}`);
  } finally {
    state.rsvpSubmitting = false;
    const submitButton = document.getElementById("rsvp-submit-button");
    const backButton = document.getElementById("rsvp-back-button");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Continuar";
    }
    if (backButton) {
      backButton.disabled = false;
    }
  }
}

function validateRsvpSubmission(selectedStatus, messageToCouple, dietaryRestrictions) {
  if (!["accepted", "declined"].includes(selectedStatus)) {
    return {
      target: document.querySelector('input[name="rsvpStatus"]') || rsvpPanel,
      message: "Selecione se você confirma ou recusa a presença."
    };
  }

  if (!isValidCpf(digitsOnly(guestCpfInput.value))) {
    return { target: guestCpfInput, message: "Informe um CPF válido para enviar o RSVP." };
  }

  const messageInput = document.getElementById("rsvp-message-input");
  if (messageToCouple.length > MAX_RSVP_TEXT_LENGTH) {
    return { target: messageInput, message: "A mensagem para os noivos deve ter no máximo 500 caracteres." };
  }

  if (selectedStatus === "declined") {
    return null;
  }

  const dietaryInput = document.getElementById("rsvp-dietary-input");
  if (dietaryRestrictions.length > MAX_RSVP_TEXT_LENGTH) {
    return { target: dietaryInput, message: "As restrições alimentares devem ter no máximo 500 caracteres." };
  }

  const companionCards = Array.from(document.querySelectorAll(".rsvp-companion-card"));
  const companionCountInput = document.getElementById("rsvp-companion-count-input");
  const companions = companionCards.map((card) => ({
    nameInput: card.querySelector('[data-companion-field="name"]'),
    birthDateInput: card.querySelector('[data-companion-field="birthDate"]'),
    cpfInput: card.querySelector('[data-companion-field="cpf"]')
  })).map((fields) => ({
    ...fields,
    name: fields.nameInput?.value.trim() || "",
    birthDate: fields.birthDateInput?.value || "",
    cpf: digitsOnly(fields.cpfInput?.value || "") || null
  }));

  if (companions.length > toNonNegativeInteger(state.rsvp?.maxExtraGuests)) {
    return { target: companionCountInput, message: "A quantidade de acompanhantes excede o limite permitido." };
  }

  const seenCpfs = new Set();
  for (let index = 0; index < companions.length; index += 1) {
    const companion = companions[index];
    const number = index + 1;

    if (!companion.name) return { target: companion.nameInput, message: `Informe o nome do acompanhante ${number}.` };
    if (companion.name.length > MAX_COMPANION_NAME_LENGTH) {
      return { target: companion.nameInput, message: `O nome do acompanhante ${number} deve ter no máximo 120 caracteres.` };
    }
    if (!isValidPersonName(companion.name)) {
      return { target: companion.nameInput, message: `Informe um nome válido para o acompanhante ${number}.` };
    }
    if (!companion.birthDate) {
      return { target: companion.birthDateInput, message: `Informe a data de nascimento do acompanhante ${number}.` };
    }

    const age = calculateCompanionAge(companion.birthDate);
    if (age === null) {
      return { target: companion.birthDateInput, message: `Informe uma data de nascimento válida para o acompanhante ${number}.` };
    }
    if (age < 0) {
      return { target: companion.birthDateInput, message: `A data de nascimento do acompanhante ${number} não pode ser posterior à data do evento.` };
    }

    if (age >= 16 && !companion.cpf) {
      return { target: companion.cpfInput, message: `CPF do acompanhante ${number} é obrigatório para idade igual ou superior a 16 anos na data do evento.` };
    }

    if (companion.cpf) {
      if (!isValidCpf(companion.cpf)) {
        return { target: companion.cpfInput, message: `Informe um CPF válido para o acompanhante ${number}.` };
      }
      if (seenCpfs.has(companion.cpf)) {
        return { target: companion.cpfInput, message: "CPF de acompanhante não pode se repetir." };
      }
      seenCpfs.add(companion.cpf);
    }
  }

  return null;
}

function showBackendRsvpError(message) {
  const lowerMessage = String(message || "").toLowerCase();
  let target = document.getElementById("rsvp-submit-button");

  if (lowerMessage.includes("cpf")) {
    target = document.querySelector('[data-companion-field="cpf"]') || guestCpfInput;
  } else if (lowerMessage.includes("data") || lowerMessage.includes("nascimento")) {
    target = document.querySelector('[data-companion-field="birthDate"]') || target;
  } else if (lowerMessage.includes("nome")) {
    target = document.querySelector('[data-companion-field="name"]') || target;
  } else if (lowerMessage.includes("mensagem")) {
    target = document.getElementById("rsvp-message-input") || target;
  } else if (lowerMessage.includes("restri")) {
    target = document.getElementById("rsvp-dietary-input") || target;
  } else if (lowerMessage.includes("acompanhante")) {
    target = document.getElementById("rsvp-companion-count-input") || target;
  }

  showFieldError(target, message);
}

function readCompanionValues() {
  return Array.from(document.querySelectorAll(".rsvp-companion-card")).map((card) => ({
    name: card.querySelector('[data-companion-field="name"]')?.value.trim() || "",
    birthDate: card.querySelector('[data-companion-field="birthDate"]')?.value || "",
    cpf: digitsOnly(card.querySelector('[data-companion-field="cpf"]')?.value || "") || null
  }));
}

function updateCompanionCpfRequirement(card) {
  const birthDateInput = card.querySelector('[data-companion-field="birthDate"]');
  const cpfInput = card.querySelector('[data-companion-field="cpf"]');
  const help = card.querySelector("[data-companion-cpf-help]");
  const age = calculateCompanionAge(birthDateInput.value);

  if (age === null) {
    cpfInput.removeAttribute("aria-required");
    help.textContent = "Informe a data de nascimento para validar CPF.";
    return;
  }

  if (age >= 16) {
    cpfInput.setAttribute("aria-required", "true");
    help.textContent = "CPF obrigatório para acompanhantes com 16 anos ou mais na data do evento.";
    return;
  }

  cpfInput.removeAttribute("aria-required");
  help.textContent = "CPF opcional para acompanhantes menores de 16 anos na data do evento.";
}

async function reserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;
  const apiBase = getApiBase();
  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);

  if (guestCpf.length !== 11) {
    showReservationError("Informe um CPF válido com 11 dígitos para reservar.");
    return;
  }

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", UI_TEXT.publicEvent.reserveLoading);

    await requestJson(`${apiBase}/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf })
    });

    adjustGiftCartQuantity(giftId, 1);
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Presente adicionado ao carrinho.");
  } catch (error) {
    setStatus(status, "status-error", `${UI_TEXT.publicEvent.reserveError}: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
}

async function unreserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;
  const apiBase = getApiBase();
  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);

  if (guestCpf.length !== 11) {
    showReservationError("Informe o CPF da reserva para cancelar.");
    return;
  }

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", UI_TEXT.publicEvent.unreserveLoading);
    await requestJson(`${apiBase}/api/gifts/${giftId}/unreserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf })
    });
    adjustGiftCartQuantity(giftId, -1);
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Presente removido do carrinho.");
  } catch (error) {
    setStatus(status, "status-error", `${UI_TEXT.publicEvent.unreserveError}: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
}

function getSelectedRsvpStatus() {
  return document.querySelector('input[name="rsvpStatus"]:checked')?.value || "accepted";
}

function normalizeRsvpStatus(value) {
  return String(value || "pending").trim().toLowerCase();
}

function statusLabel(value) {
  switch (normalizeRsvpStatus(value)) {
    case "accepted":
      return "Presença confirmada";
    case "declined":
      return "Presença recusada";
    default:
      return "Confirmação pendente";
  }
}

function statusTagClass(value) {
  switch (normalizeRsvpStatus(value)) {
    case "accepted":
      return "tag-ok";
    case "declined":
      return "tag-muted";
    default:
      return "tag-warning";
  }
}

function parseCompanionCount(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return Math.min(parsed, toNonNegativeInteger(state.rsvp?.maxExtraGuests));
}

function calculateCompanionAge(birthDateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDateValue || ""))) return null;

  const [birthYear, birthMonth, birthDay] = birthDateValue.split("-").map(Number);
  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (
    Number.isNaN(birthDate.getTime())
    || birthDate.getUTCFullYear() !== birthYear
    || birthDate.getUTCMonth() + 1 !== birthMonth
    || birthDate.getUTCDate() !== birthDay
  ) {
    return null;
  }

  const eventDate = getEventLocalDateParts();
  if (!eventDate) return null;

  let age = eventDate.year - birthYear;
  if (birthMonth > eventDate.month || (birthMonth === eventDate.month && birthDay > eventDate.day)) {
    age -= 1;
  }

  return age;
}

function getEventLocalDateParts() {
  const source = state.event?.eventDateTime || state.event?.eventDate;
  if (!source) return null;

  const date = parseEventInstant(source);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getEventTimeZoneId(state.event),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const mappedParts = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      mappedParts[part.type] = part.value;
    }
  });

  return {
    year: Number(mappedParts.year),
    month: Number(mappedParts.month),
    day: Number(mappedParts.day)
  };
}

function toBirthDateInputValue(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
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

function isValidPersonName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'-]+)*$/u.test(String(name || "").trim());
}

function render() {
  const hasEvent = Boolean(state.event);
  const showGifts = hasEvent && state.currentStep === "gifts";
  giftFilterSection.hidden = !showGifts;
  giftGrid.hidden = !showGifts;
  refreshHeader();
  renderGiftList();
}

function setRsvpStatus(type, message) {
  rsvpStatus.hidden = false;
  setStatus(rsvpStatus, type, message);
}

function clearFlowStatus() {
  status.hidden = true;
  status.textContent = "";
  status.className = "status status-info";
}

function clearRsvpStatus() {
  rsvpStatus.hidden = true;
  rsvpStatus.textContent = "";
  rsvpStatus.className = "status status-info";
}

function getFieldContainer(target) {
  return target?.closest?.(".field, .rsvp-fieldset, .row") || null;
}

function clearFieldError(target) {
  if (!target) return;

  const container = getFieldContainer(target);
  target.classList?.remove("input-invalid");
  target.removeAttribute?.("aria-invalid");

  if (target.id) {
    const describedBy = String(target.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== `${target.id}-error`)
      .join(" ");

    if (describedBy) {
      target.setAttribute("aria-describedby", describedBy);
    } else {
      target.removeAttribute("aria-describedby");
    }
  }

  container?.classList.remove("field-has-error", "input-invalid");
  container?.querySelector(".field-error")?.remove();
}

function clearRsvpFieldErrors() {
  [guestCpfInput, ...Array.from(rsvpPanel.querySelectorAll(".input-invalid, [aria-invalid='true']"))].forEach(clearFieldError);
}

function showFieldError(target, message) {
  if (!target) return;

  clearFieldError(target);
  const container = getFieldContainer(target);
  const errorId = target.id ? `${target.id}-error` : "";

  target.classList?.add("input-invalid");
  target.setAttribute?.("aria-invalid", "true");
  container?.classList.add("field-has-error");

  if (errorId) {
    target.setAttribute("aria-describedby", [target.getAttribute("aria-describedby"), errorId].filter(Boolean).join(" "));
  }

  if (container) {
    const error = document.createElement("p");
    error.className = "field-error";
    if (errorId) error.id = errorId;
    error.textContent = message;
    container.appendChild(error);
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus?.({ preventScroll: true });
}

function showReservationError(message) {
  setStatus(status, "status-error", message);
  status.scrollIntoView({ behavior: "smooth", block: "start" });
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
