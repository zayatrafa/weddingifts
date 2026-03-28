import {
  clearAuthSession,
  formatCurrency,
  formatDate,
  getApiBase,
  getAuthSession,
  initUserDropdown,
  requestJson,
  setStatus
} from "./common.js";

const state = { event: null, gifts: [], filter: "all", loading: false, actionGiftId: null };

const slugInput = document.getElementById("slug-input");
const guestCpfInput = document.getElementById("guest-cpf-input");
const loadButton = document.getElementById("load-button");
const status = document.getElementById("status");
const giftGrid = document.getElementById("gift-grid");
const giftTemplate = document.getElementById("gift-template");
const filters = document.querySelectorAll(".filter-button");

const session = getAuthSession();
enhanceHeaderForLoggedUser(session);
prefillGuestCpfForLoggedUser(session);

const query = new URLSearchParams(window.location.search);
const querySlug = query.get("slug");
if (querySlug) slugInput.value = querySlug;

guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    filters.forEach((item) => {
      item.classList.remove("btn-primary");
      item.classList.add("btn-secondary");
    });
    button.classList.remove("btn-secondary");
    button.classList.add("btn-primary");
    renderGiftList();
  });
});

loadButton.addEventListener("click", loadEvent);
if (querySlug) {
  loadEvent();
} else {
  render();
  setStatus(status, "status-info", "Informe o slug para carregar o evento público.");
}

function enhanceHeaderForLoggedUser(sessionData) {
  const session = sessionData;
  if (!session?.token) return;

  const navRight = document.querySelector(".shell-nav-right");
  if (!navRight) return;

  navRight.innerHTML = `
    <div class="shell-links">
      <a href="./event.html" class="active">Evento público</a>
    </div>
    <div class="user-menu-wrap">
      <button id="user-menu-button" class="user-chip" type="button" aria-expanded="false" aria-haspopup="menu">Minha conta</button>
      <div id="user-menu" class="user-menu" hidden>
        <a href="./create-event.html">Criar evento</a>
        <a href="./my-events.html">Gerenciar meus eventos</a>
        <span class="menu-group">Gerenciar eventos</span>
        <a class="menu-subitem" href="./my-guests.html">Gerenciar convidados</a>
        <a class="menu-subitem" href="./my-event.html">Gerenciar presentes</a>
        <a href="./account.html">Minha conta</a>
        <button id="logout-action" type="button">Sair</button>
      </div>
    </div>
  `;

  initUserDropdown({
    session,
    onLogout: () => {
      clearAuthSession();
      window.location.href = "./login.html";
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
  if (state.filter === "available") return state.gifts.filter((gift) => availableUnits(gift) > 0);
  if (state.filter === "reserved") return state.gifts.filter((gift) => reservedUnits(gift) > 0);
  return state.gifts;
}

function refreshHeader() {
  const title = document.getElementById("event-title");
  const subtitle = document.getElementById("event-subtitle");
  const date = document.getElementById("event-date");
  const slug = document.getElementById("event-slug");
  const total = document.getElementById("event-total");

  if (!state.event) {
    title.textContent = "Evento não carregado";
    subtitle.textContent = "Use o slug público para buscar os dados reais no backend.";
    date.textContent = "--";
    slug.textContent = "--";
    total.textContent = "0 itens";
    return;
  }

  title.textContent = state.event.name;
  subtitle.textContent = "Lista pública atualizada em tempo real via API.";
  date.textContent = formatDate(state.event.eventDate);
  slug.textContent = state.event.slug;
  total.textContent = `${state.gifts.length} itens`;
}

function renderGiftList() {
  giftGrid.innerHTML = "";
  if (!state.event) return (giftGrid.innerHTML = '<div class="center-empty">Nenhum evento carregado.</div>');
  const items = filteredGifts();
  if (!items.length) return (giftGrid.innerHTML = '<div class="center-empty">Nenhum presente encontrado para este filtro.</div>');

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
    giftDescription.textContent = gift.description || "Sem descrição.";
    giftBadge.textContent = badge.label;
    giftBadge.classList.add("tag", badge.className);
    giftMeta.textContent = `${available} disponíveis | ${reserved} reservados`;

    reserveButton.disabled = busy || available === 0;
    reserveButton.textContent = busy ? "Aguarde..." : "Reservar";
    reserveButton.addEventListener("click", () => reserveGift(gift.id));

    unreserveButton.disabled = busy || reserved === 0;
    unreserveButton.addEventListener("click", () => unreserveGift(gift.id));

    giftGrid.appendChild(fragment);
  });
}

async function refreshGifts() {
  if (!state.event) return;
  const apiBase = getApiBase();
  state.gifts = await requestJson(`${apiBase}/api/events/${state.event.id}/gifts`);
}

async function loadEvent() {
  const apiBase = getApiBase();
  const slug = slugInput.value.trim();

  if (!slug) return setStatus(status, "status-error", "Informe o slug do evento.");

  try {
    state.loading = true;
    loadButton.disabled = true;
    setStatus(status, "status-loading", "Carregando evento e presentes...");
    state.event = await requestJson(`${apiBase}/api/events/${encodeURIComponent(slug)}`);
    await refreshGifts();
    setStatus(status, "status-success", `Evento '${state.event.name}' carregado com ${state.gifts.length} presente(s).`);
    render();
  } catch (error) {
    state.event = null;
    state.gifts = [];
    render();
    setStatus(status, "status-error", `Falha ao carregar evento: ${error.message}`);
  } finally {
    state.loading = false;
    loadButton.disabled = false;
  }
}

async function reserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;
  const apiBase = getApiBase();
  const guestCpf = digitsOnly(guestCpfInput.value);

  if (guestCpf.length !== 11) {
    setStatus(status, "status-error", "Informe um CPF válido com 11 dígitos para reservar.");
    return;
  }

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", "Reservando presente...");

    await requestJson(`${apiBase}/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCpf })
    });

    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Reserva realizada com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao reservar: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
}

async function unreserveGift(giftId) {
  if (!state.event || state.actionGiftId) return;
  const apiBase = getApiBase();

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", "Cancelando reserva...");
    await requestJson(`${apiBase}/api/gifts/${giftId}/unreserve`, { method: "POST" });
    await refreshGifts();
    renderGiftList();
    setStatus(status, "status-success", "Reserva cancelada com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao cancelar: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    renderGiftList();
  }
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

function render() {
  refreshHeader();
  renderGiftList();
}
