import {
  attachApiBaseInput,
  formatCurrency,
  formatDate,
  getApiBase,
  requestJson,
  setApiBase,
  setStatus
} from "./common.js";

const state = {
  event: null,
  gifts: [],
  filter: "all",
  loading: false,
  actionGiftId: null
};

const apiBaseInput = document.getElementById("api-base-input");
const slugInput = document.getElementById("slug-input");
const guestNameInput = document.getElementById("guest-name-input");
const loadButton = document.getElementById("load-button");
const status = document.getElementById("status");
const giftGrid = document.getElementById("gift-grid");
const giftTemplate = document.getElementById("gift-template");
const filters = document.querySelectorAll(".filter-button");

attachApiBaseInput(apiBaseInput);

const query = new URLSearchParams(window.location.search);
const queryApi = query.get("api");
if (queryApi) {
  apiBaseInput.value = queryApi;
  setApiBase(queryApi);
}

const querySlug = query.get("slug");
if (querySlug) {
  slugInput.value = querySlug;
}

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
  setStatus(status, "status-info", "Informe o slug para carregar o evento publico.");
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
  if (available === 1) return { label: "Ultima unidade", className: "tag-warning" };
  return { label: "Disponivel", className: "tag-ok" };
}

function filteredGifts() {
  if (state.filter === "available") {
    return state.gifts.filter((gift) => availableUnits(gift) > 0);
  }

  if (state.filter === "reserved") {
    return state.gifts.filter((gift) => reservedUnits(gift) > 0);
  }

  return state.gifts;
}

function refreshHeader() {
  const title = document.getElementById("event-title");
  const subtitle = document.getElementById("event-subtitle");
  const date = document.getElementById("event-date");
  const slug = document.getElementById("event-slug");
  const total = document.getElementById("event-total");

  if (!state.event) {
    title.textContent = "Evento nao carregado";
    subtitle.textContent = "Use o slug publico para buscar os dados reais no backend.";
    date.textContent = "--";
    slug.textContent = "--";
    total.textContent = "0 itens";
    return;
  }

  title.textContent = state.event.name;
  subtitle.textContent = "Lista publica atualizada em tempo real via API.";
  date.textContent = formatDate(state.event.eventDate);
  slug.textContent = state.event.slug;
  total.textContent = `${state.gifts.length} itens`;
}

function renderGiftList() {
  giftGrid.innerHTML = "";

  if (!state.event) {
    giftGrid.innerHTML = '<div class="center-empty">Nenhum evento carregado.</div>';
    return;
  }

  const items = filteredGifts();
  if (!items.length) {
    giftGrid.innerHTML = '<div class="center-empty">Nenhum presente encontrado para este filtro.</div>';
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
    giftDescription.textContent = gift.description || "Sem descricao.";
    giftBadge.textContent = badge.label;
    giftBadge.classList.add("tag", badge.className);
    giftMeta.textContent = `${available} disponiveis | ${reserved} reservados`;

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

  if (!slug) {
    setStatus(status, "status-error", "Informe o slug do evento.");
    return;
  }

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
  const guestName = guestNameInput.value.trim();

  try {
    state.actionGiftId = giftId;
    renderGiftList();
    setStatus(status, "status-loading", "Reservando presente...");

    await requestJson(`${apiBase}/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName })
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

function render() {
  refreshHeader();
  renderGiftList();
}
