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
  giftQuery: "",
  giftSort: "availability",
  loading: false,
  actionGiftId: null,
  rsvp: null,
  rsvpSubmitting: false,
  rsvpReadyToContinue: false,
  slug: "",
  guestCpf: "",
  mode: "loading",
  currentStep: "identify"
};

const flowRoot = document.getElementById("invitation-flow-root");
const stepPanel = document.getElementById("invitation-step-panel");
const identifyFields = document.getElementById("invitation-identify-fields");
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
const INVITATION_MESSAGE_FALLBACK = "Com muita alegria, convidamos voce para celebrar este dia tao especial conosco. Sua presenca tornara nossa comemoracao ainda mais completa.";

const session = getAuthSession();
enhanceHeaderForLoggedUser(session);
prefillGuestCpfForLoggedUser(session);

const query = new URLSearchParams(window.location.search);
const querySlug = String(query.get("slug") || "").trim();

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
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
    return;
  }

  const items = filteredGifts();
  if (!items.length) {
    giftGrid.innerHTML = `<div class="center-empty">${UI_TEXT.publicEvent.emptyFilter}</div>`;
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
    const busy = state.actionGiftId === gift.id;
    const badge = badgeForGift(gift);

    giftName.textContent = gift.name;
    giftPrice.textContent = formatCurrency(gift.price);
    giftDescription.textContent = gift.description || UI_TEXT.common.noDescription;
    giftBadge.textContent = badge.label;
    giftBadge.classList.add("tag", badge.className);
    giftMeta.textContent = `${available} disponíveis | ${reserved} reservados`;

    reserveButton.disabled = busy || available === 0;
    reserveButton.innerHTML = `${busy ? ICON_SPINNER : ICON_GIFT}${busy ? "Aguarde..." : "Reservar"}`;
    reserveButton.addEventListener("click", () => reserveGift(gift.id));

    unreserveButton.disabled = busy || reserved === 0;
    unreserveButton.innerHTML = `${ICON_UNDO}Cancelar reserva`;
    unreserveButton.addEventListener("click", () => unreserveGift(gift.id));

    giftGrid.appendChild(fragment);
  });
}

async function refreshGifts() {
  if (!state.event) return;
  const apiBase = getApiBase();
  state.gifts = await requestJson(`${apiBase}/api/events/${state.event.id}/gifts`);
  state.giftsLoaded = true;
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

  if (state.currentStep === "message") {
    renderRsvpStep();
    return;
  }

  if (state.currentStep === "rsvp") {
    if (state.rsvpReadyToContinue) {
      renderGiftStep();
      return;
    }

    document.getElementById("rsvp-form")?.requestSubmit();
    return;
  }

  if (state.currentStep === "gifts") {
    renderLocationStep();
  }
}

function renderMissingSlug() {
  state.event = null;
  state.gifts = [];
  state.rsvp = null;
  state.mode = "missingSlug";
  flowRoot.dataset.state = "missing-slug";
  identifyFields.hidden = true;
  rsvpLookupButton.hidden = true;
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
  identifyFields.hidden = true;
  rsvpLookupButton.hidden = true;
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
  identifyFields.hidden = false;
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Consultar RSVP";
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

function renderFlowStart() {
  state.mode = "flow";
  state.currentStep = "message";
  flowRoot.dataset.state = "message";
  identifyFields.hidden = false;
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Continuar";
  rsvpPanel.hidden = true;
  const message = String(state.event?.invitationMessage || "").trim() || INVITATION_MESSAGE_FALLBACK;
  stepPanel.innerHTML = `
    <div class="invitation-flow-start">
      <p class="kicker">Mensagem do casal</p>
      <h2>Ola, ${escapeHtml(state.rsvp?.guestName || "convidado")}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="invitation-rsvp-summary">
        <span class="tag ${statusTagClass(state.rsvp?.rsvpStatus)}">${escapeHtml(statusLabel(state.rsvp?.rsvpStatus))}</span>
        <span class="muted">Acompanhantes permitidos: ${toNonNegativeInteger(state.rsvp?.maxExtraGuests)}</span>
      </div>
    </div>
  `;
}

function renderRsvpStep() {
  state.mode = "flow";
  state.currentStep = "rsvp";
  flowRoot.dataset.state = "rsvp";
  identifyFields.hidden = false;
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = state.rsvpReadyToContinue ? "Continuar para presentes" : "Salvar RSVP";
  stepPanel.innerHTML = `
    <div class="invitation-rsvp-copy">
      <p class="kicker">Confirmacao de presenca</p>
      <h2>Confirme sua presenca</h2>
      <p>Atualize sua resposta e seus acompanhantes permitidos para que o casal receba a lista correta.</p>
    </div>
  `;
  renderRsvpPanel();
}

async function renderGiftStep() {
  state.mode = "flow";
  state.currentStep = "gifts";
  flowRoot.dataset.state = "gifts";
  identifyFields.hidden = false;
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = true;
  rsvpLookupButton.textContent = "Carregando presentes...";
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  stepPanel.innerHTML = `
    <div class="invitation-gift-copy">
      <p class="kicker">Lista de presentes</p>
      <h2>Escolha um presente, se quiser</h2>
      <p>Esta etapa e opcional. As reservas usam o CPF ja informado no convite.</p>
    </div>
  `;
  render();
  setStatus(status, "status-loading", "Carregando presentes...");

  try {
    await ensureGiftsLoaded();
    render();
    setStatus(status, "status-success", "Presentes carregados. Voce pode reservar ou continuar sem presente.");
  } catch (error) {
    setStatus(status, "status-error", `Nao foi possivel carregar presentes: ${error.message}`);
  } finally {
    rsvpLookupButton.disabled = false;
    rsvpLookupButton.textContent = "Continuar sem presente";
  }
}

function renderAfterGiftStep() {
  state.currentStep = "postGifts";
  flowRoot.dataset.state = "post-gifts";
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpLookupButton.disabled = true;
  rsvpLookupButton.textContent = "Continuar";
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Presentes concluidos</p>
      <h2>Presentes concluidos</h2>
      <p>A proxima etapa do fluxo mostrara as informacoes finais do evento.</p>
    </div>
  `;
  setStatus(status, "status-success", "Etapa de presentes concluida.");
}

function renderLocationStep() {
  state.currentStep = "location";
  flowRoot.dataset.state = "location";
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  rsvpLookupButton.hidden = true;
  completeButton.hidden = false;
  completeButton.disabled = false;
  completeButton.textContent = "Concluir convite";
  stepPanel.innerHTML = renderEventInfoMarkup("Informacoes do evento", true);
  setStatus(status, "status-info", "Revise as informacoes finais e conclua o convite.");
}

function renderEventInfoMarkup(kicker, includeFinalMessage) {
  const mapsLink = state.event?.locationMapsUrl
    ? `<p><a href="${escapeAttribute(state.event.locationMapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir localizacao no mapa</a></p>`
    : "";

  return `
    <div class="invitation-event-info">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h2>${escapeHtml(state.event?.locationName || state.event?.name || "Evento")}</h2>
      <dl class="public-event-details invitation-inline-details">
        ${renderInfoRow("Data e hora", formatEventDateTime(state.event))}
        ${renderInfoRow("Endereco", state.event?.locationAddress)}
        ${renderInfoRow("Cerimonia", state.event?.ceremonyInfo)}
        ${renderInfoRow("Traje", state.event?.dressCode)}
      </dl>
      ${mapsLink}
      ${includeFinalMessage ? "<p>Esperamos voce la.</p>" : ""}
    </div>
  `;
}

function renderInfoRow(label, value) {
  if (!String(value || "").trim()) return "";
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

async function completeInvitationFlow() {
  if (!state.event || !state.guestCpf) return;

  if (normalizeRsvpStatus(state.rsvp?.rsvpStatus) === "pending") {
    renderRsvpStep();
    setRsvpStatus("status-error", "Confirme ou recuse sua presenca antes de concluir o convite.");
    return;
  }

  try {
    completeButton.disabled = true;
    completeButton.textContent = "Concluindo...";
    setStatus(status, "status-loading", "Concluindo convite...");
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
    setStatus(status, "status-error", `Nao foi possivel concluir o convite: ${error.message}`);
  } finally {
    completeButton.disabled = false;
    completeButton.textContent = "Concluir convite";
  }
}

function renderCompletionSuccess() {
  state.currentStep = "complete";
  flowRoot.dataset.state = "complete";
  giftFilterSection.hidden = true;
  giftGrid.hidden = true;
  rsvpPanel.hidden = true;
  rsvpLookupButton.hidden = true;
  completeButton.hidden = true;
  stepPanel.innerHTML = `
    <div class="invitation-empty-state">
      <p class="kicker">Convite concluido</p>
      <h2>Convite concluido com sucesso</h2>
      <p>Quando voltar a este link, informe seu CPF para acessar as acoes diretas.</p>
    </div>
  `;
  setStatus(status, "status-success", "Convite concluido com sucesso.");
}

function renderReturnMenu() {
  state.mode = "returnMenu";
  state.currentStep = "returnMenu";
  flowRoot.dataset.state = "return-menu";
  identifyFields.hidden = false;
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
      <button class="btn btn-secondary" type="button" data-return-action="info">Informacoes do evento</button>
      <button class="btn btn-secondary" type="button" data-return-action="companions">Adicionar/editar convidados extras</button>
      <button class="btn btn-secondary" type="button" data-return-action="rsvp">Confirmar/cancelar presenca</button>
    </div>
  `;
  stepPanel.querySelectorAll("[data-return-action]").forEach((button) => {
    button.addEventListener("click", () => openDirectAction(button.dataset.returnAction));
  });
  setStatus(status, "status-success", `Convite de ${state.rsvp?.guestName || "convidado"} carregado.`);
}

function renderBackToMenuAction() {
  state.mode = "directAction";
  rsvpLookupButton.hidden = false;
  completeButton.hidden = true;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "Voltar ao menu";
}

function openDirectAction(action) {
  if (action === "gifts") {
    renderGiftStep().then(() => renderBackToMenuAction());
    return;
  }

  if (action === "info") {
    state.currentStep = "directInfo";
    flowRoot.dataset.state = "direct-info";
    giftFilterSection.hidden = true;
    giftGrid.hidden = true;
    rsvpPanel.hidden = true;
    renderBackToMenuAction();
    stepPanel.innerHTML = renderEventInfoMarkup("Informacoes do evento", true);
    return;
  }

  if (action === "companions" || action === "rsvp") {
    state.rsvpReadyToContinue = false;
    renderRsvpStep();
    renderBackToMenuAction();
  }
}

async function loadEvent(slug) {
  const apiBase = getApiBase();
  const safeSlug = String(slug || "").trim();
  slug = safeSlug;

  if (!slug) return setStatus(status, "status-error", "Informe o slug do evento.");
  if (slug.length > MAX_SLUG_LENGTH) return setStatus(status, "status-error", "O slug deve ter no máximo 24 caracteres.");

  try {
    state.loading = true;
    state.mode = "loading";
    state.slug = safeSlug;
    state.rsvp = null;
    state.gifts = [];
    state.giftsLoaded = false;
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
    identifyFields.hidden = true;
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
      identifyFields.hidden = false;
    }
  }
}

async function lookupRsvp() {
  if (!state.event) {
    setStatus(status, "status-error", "Abra o convite pelo link enviado pelo casal.");
    setRsvpStatus("status-error", "Carregue o evento antes de consultar o RSVP.");
    return;
  }

  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);
  if (!isValidCpf(guestCpf)) {
    setStatus(status, "status-error", "Informe um CPF valido para consultar o convite.");
    setRsvpStatus("status-error", "Informe um CPF válido para consultar o RSVP.");
    return;
  }

  try {
    rsvpLookupButton.disabled = true;
    setStatus(status, "status-loading", "Consultando convite...");
    setRsvpStatus("status-loading", "Consultando RSVP...");

    const apiBase = getApiBase();
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp?guestCpf=${encodeURIComponent(guestCpf)}`);
    state.guestCpf = guestCpf;
    if (state.rsvp.hasCompletedInvitationFlow) {
      renderReturnMenu();
    } else {
      renderFlowStart();
    }
    setStatus(status, "status-success", `Convite de ${state.rsvp.guestName} carregado.`);
    setRsvpStatus("status-success", `RSVP de ${state.rsvp.guestName} carregado.`);
  } catch (error) {
    state.rsvp = null;
    renderIdentifyStep();
    setStatus(status, "status-error", `Nao foi possivel consultar o convite: ${error.message}`);
    if (state.currentStep === "rsvp") {
      renderRsvpStep();
    } else {
      renderRsvpPanel();
    }
    setRsvpStatus("status-error", `Não foi possível consultar o RSVP: ${error.message}`);
  } finally {
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
    rsvpPanel.innerHTML = '<div class="center-empty">Informe o CPF do convidado e clique em "Consultar RSVP".</div>';
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

      <div class="row row-tight fit-content">
        <button id="rsvp-submit-button" class="btn btn-primary" type="submit">Enviar RSVP</button>
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

  form.addEventListener("input", markRsvpStepDirty);
  form.addEventListener("change", markRsvpStepDirty);
  form.addEventListener("submit", submitRsvp);
}

function markRsvpStepDirty() {
  if (state.currentStep !== "rsvp") return;
  state.rsvpReadyToContinue = false;
  rsvpLookupButton.textContent = "Salvar RSVP";
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
      <div class="row row-tight">
        <div class="field field-flat">
          <label for="companion-${index}-birth-date">Data de nascimento</label>
          <input class="input" id="companion-${index}-birth-date" data-companion-field="birthDate" type="date" value="${escapeAttribute(toBirthDateInputValue(companion.birthDate))}" required />
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

  const validationError = validateRsvpSubmission(selectedStatus, messageToCouple, dietaryRestrictions);
  if (validationError) {
    setRsvpStatus("status-error", validationError);
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
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    setRsvpStatus("status-loading", "Enviando RSVP...");
    const apiBase = getApiBase();
    const method = normalizeRsvpStatus(state.rsvp.rsvpStatus) === "pending" ? "POST" : "PUT";
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.rsvpReadyToContinue = true;

    if (state.currentStep === "rsvp") {
      renderRsvpStep();
      if (wasDirectAction) {
        renderBackToMenuAction();
      }
    } else {
      renderRsvpPanel();
    }
    setRsvpStatus("status-success", selectedStatus === "accepted"
      ? "Presença confirmada com sucesso."
      : "Presença recusada com sucesso.");
  } catch (error) {
    setRsvpStatus("status-error", `Não foi possível enviar o RSVP: ${error.message}`);
  } finally {
    state.rsvpSubmitting = false;
    const submitButton = document.getElementById("rsvp-submit-button");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar RSVP";
    }
  }
}

function validateRsvpSubmission(selectedStatus, messageToCouple, dietaryRestrictions) {
  if (!["accepted", "declined"].includes(selectedStatus)) {
    return "Selecione se você confirma ou recusa a presença.";
  }

  if (!isValidCpf(digitsOnly(guestCpfInput.value))) {
    return "Informe um CPF válido para enviar o RSVP.";
  }

  if (messageToCouple.length > MAX_RSVP_TEXT_LENGTH) {
    return "A mensagem para os noivos deve ter no máximo 500 caracteres.";
  }

  if (selectedStatus === "declined") {
    return "";
  }

  if (dietaryRestrictions.length > MAX_RSVP_TEXT_LENGTH) {
    return "As restrições alimentares devem ter no máximo 500 caracteres.";
  }

  const companions = readCompanionValues();
  if (companions.length > toNonNegativeInteger(state.rsvp?.maxExtraGuests)) {
    return "A quantidade de acompanhantes excede o limite permitido.";
  }

  const seenCpfs = new Set();
  for (let index = 0; index < companions.length; index += 1) {
    const companion = companions[index];
    const number = index + 1;

    if (!companion.name) return `Informe o nome do acompanhante ${number}.`;
    if (companion.name.length > MAX_COMPANION_NAME_LENGTH) return `O nome do acompanhante ${number} deve ter no máximo 120 caracteres.`;
    if (!isValidPersonName(companion.name)) return `Informe um nome válido para o acompanhante ${number}.`;
    if (!companion.birthDate) return `Informe a data de nascimento do acompanhante ${number}.`;

    const age = calculateCompanionAge(companion.birthDate);
    if (age === null) return `Informe uma data de nascimento válida para o acompanhante ${number}.`;
    if (age < 0) return `A data de nascimento do acompanhante ${number} não pode ser posterior à data do evento.`;

    if (age >= 16 && !companion.cpf) {
      return `CPF do acompanhante ${number} é obrigatório para idade igual ou superior a 16 anos na data do evento.`;
    }

    if (companion.cpf) {
      if (!isValidCpf(companion.cpf)) return `Informe um CPF válido para o acompanhante ${number}.`;
      if (seenCpfs.has(companion.cpf)) return "CPF de acompanhante não pode se repetir.";
      seenCpfs.add(companion.cpf);
    }
  }

  return "";
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
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", UI_TEXT.publicEvent.unreserveSuccess);
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
      return "RSVP pendente";
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

function clearRsvpStatus() {
  rsvpStatus.hidden = true;
  rsvpStatus.textContent = "";
  rsvpStatus.className = "status status-info";
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
