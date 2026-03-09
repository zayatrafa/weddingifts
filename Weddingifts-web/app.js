const fallbackSlug = "";

const state = {
  filter: "all",
  event: null,
  gifts: [],
  loading: false,
  actionGiftId: null
};

const giftGrid = document.getElementById("gift-grid");
const giftTemplate = document.getElementById("gift-card-template");
const loadButton = document.getElementById("load-button");
const slugInput = document.getElementById("slug-input");
const apiBaseInput = document.getElementById("api-base-input");
const guestNameInput = document.getElementById("guest-name-input");
const statusPanel = document.getElementById("status-panel");
const statusMessage = document.getElementById("status-message");

function formatDate(dateString) {
  if (!dateString) return "--";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function getApiBase() {
  return apiBaseInput.value.trim().replace(/\/$/, "");
}

function availableUnits(gift) {
  if (typeof gift.availableQuantity === "number") {
    return gift.availableQuantity;
  }

  const reserved = typeof gift.reservedQuantity === "number" ? gift.reservedQuantity : 0;
  return Math.max(0, gift.quantity - reserved);
}

function reservedUnits(gift) {
  if (typeof gift.reservedQuantity === "number") {
    return gift.reservedQuantity;
  }

  return Math.max(0, gift.quantity - availableUnits(gift));
}

function getStatus(gift) {
  const available = availableUnits(gift);

  if (available === 0) {
    return { label: "Reservado", className: "badge-reserved" };
  }

  if (available === 1) {
    return { label: "Ultima unidade", className: "badge-low" };
  }

  return { label: "Disponivel", className: "badge-available" };
}

function setStatus(type, message) {
  statusMessage.textContent = message;
  statusPanel.classList.remove("status-info", "status-error", "status-success", "status-loading");
  statusPanel.classList.add(type);
}

function refreshHeader() {
  if (!state.event) {
    document.getElementById("event-title").textContent = "Evento nao carregado";
    document.getElementById("event-subtitle").textContent = "Informe API + slug para buscar dados reais.";
    document.getElementById("event-date").textContent = "--";
    document.getElementById("event-slug").textContent = "--";
    document.getElementById("event-total-gifts").textContent = "0 itens";
    return;
  }

  document.getElementById("event-title").textContent = state.event.name;
  document.getElementById("event-subtitle").textContent = "Dados carregados do backend com sucesso.";
  document.getElementById("event-date").textContent = formatDate(state.event.eventDate);
  document.getElementById("event-slug").textContent = state.event.slug;
  document.getElementById("event-total-gifts").textContent = `${state.gifts.length} itens`;
}

function refreshStats() {
  const total = state.gifts.length;
  const reserved = state.gifts.filter((gift) => reservedUnits(gift) > 0).length;
  const available = state.gifts.filter((gift) => availableUnits(gift) > 0).length;

  document.getElementById("stat-total").textContent = String(total);
  document.getElementById("stat-available").textContent = String(available);
  document.getElementById("stat-reserved").textContent = String(reserved);
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

function extractErrorMessage(raw) {
  try {
    const payload = JSON.parse(raw);
    if (payload.detail) return payload.detail;
    if (payload.title) return payload.title;
  } catch {
    // ignore parse failures and return raw text
  }

  return raw;
}

async function requestJson(url, options = {}) {
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

async function refreshGifts() {
  if (!state.event) {
    return;
  }

  const apiBase = getApiBase();
  const gifts = await requestJson(`${apiBase}/api/events/${state.event.id}/gifts`);
  state.gifts = gifts;
}

async function reserveGift(giftId) {
  if (!state.event || state.actionGiftId) {
    return;
  }

  const apiBase = getApiBase();
  const guestName = guestNameInput.value.trim();

  try {
    state.actionGiftId = giftId;
    render();
    setStatus("status-loading", "Reservando presente...");

    await requestJson(`${apiBase}/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName })
    });

    await refreshGifts();
    render();
    setStatus("status-success", "Reserva realizada com sucesso.");
  } catch (error) {
    setStatus("status-error", `Falha ao reservar: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    render();
  }
}

async function unreserveGift(giftId) {
  if (!state.event || state.actionGiftId) {
    return;
  }

  const apiBase = getApiBase();

  try {
    state.actionGiftId = giftId;
    render();
    setStatus("status-loading", "Cancelando reserva...");

    await requestJson(`${apiBase}/api/gifts/${giftId}/unreserve`, {
      method: "POST"
    });

    await refreshGifts();
    render();
    setStatus("status-success", "Reserva cancelada com sucesso.");
  } catch (error) {
    setStatus("status-error", `Falha ao cancelar: ${error.message}`);
  } finally {
    state.actionGiftId = null;
    render();
  }
}

function renderGiftCard(gift, index) {
  const node = giftTemplate.content.cloneNode(true);

  const card = node.querySelector(".gift-card");
  const name = node.querySelector(".gift-name");
  const price = node.querySelector(".gift-price");
  const description = node.querySelector(".gift-description");
  const badge = node.querySelector(".gift-status-badge");
  const quantity = node.querySelector(".gift-quantity");
  const reserveButton = node.querySelector(".reserve-button");
  const unreserveButton = node.querySelector(".unreserve-button");

  const status = getStatus(gift);
  const available = availableUnits(gift);
  const reserved = reservedUnits(gift);
  const busy = state.actionGiftId === gift.id;

  card.style.animationDelay = `${index * 0.04}s`;
  name.textContent = gift.name;
  price.textContent = formatCurrency(gift.price);
  description.textContent = gift.description || "Sem descricao.";

  badge.textContent = status.label;
  badge.classList.add(status.className);

  quantity.textContent = `${available} disponiveis | ${reserved} reservados`;

  reserveButton.disabled = busy || available === 0;
  reserveButton.textContent = busy ? "Aguarde..." : "Reservar";
  reserveButton.addEventListener("click", () => reserveGift(gift.id));

  unreserveButton.disabled = busy || reserved === 0;
  unreserveButton.textContent = "Cancelar";
  unreserveButton.addEventListener("click", () => unreserveGift(gift.id));

  giftGrid.appendChild(node);
}

function renderGiftList() {
  giftGrid.innerHTML = "";

  const items = filteredGifts();

  if (!state.event) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum evento carregado.";
    giftGrid.appendChild(empty);
    return;
  }

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum presente encontrado para este filtro.";
    giftGrid.appendChild(empty);
    return;
  }

  items.forEach((gift, index) => renderGiftCard(gift, index));
}

function bindFilters() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;

      document.querySelectorAll(".filter-button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      renderGiftList();
    });
  });
}

async function loadEvent() {
  const slug = slugInput.value.trim();
  const apiBase = getApiBase();

  if (!apiBase) {
    setStatus("status-error", "Informe a URL base da API.");
    return;
  }

  if (!slug) {
    setStatus("status-error", "Informe o slug do evento.");
    return;
  }

  try {
    state.loading = true;
    loadButton.disabled = true;
    setStatus("status-loading", "Carregando evento e presentes do backend...");

    const event = await requestJson(`${apiBase}/api/events/${encodeURIComponent(slug)}`);

    state.event = event;
    await refreshGifts();

    setStatus("status-success", `Evento '${event.name}' carregado com ${state.gifts.length} presente(s).`);
    render();
  } catch (error) {
    state.event = null;
    state.gifts = [];
    render();
    setStatus("status-error", `Falha ao carregar dados reais: ${error.message}`);
  } finally {
    state.loading = false;
    loadButton.disabled = false;
  }
}

function render() {
  refreshHeader();
  refreshStats();
  renderGiftList();
}

loadButton.addEventListener("click", loadEvent);
bindFilters();

const params = new URLSearchParams(window.location.search);
const slugFromQuery = params.get("slug") || fallbackSlug;
if (slugFromQuery) {
  slugInput.value = slugFromQuery;
  loadEvent();
} else {
  render();
  setStatus("status-info", "Preencha o slug do evento para carregar dados reais.");
}
