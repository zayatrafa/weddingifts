import {
  attachApiBaseInput,
  authHeaders,
  buildPublicEventLink,
  clearAuthSession,
  formatCurrency,
  formatDate,
  getApiBase,
  requestJson,
  requireAuth,
  setStatus
} from "./common.js";

const session = requireAuth();
if (!session) {
  throw new Error("Authentication required.");
}

const token = session.token;

const apiBaseInput = document.getElementById("api-base-input");
const userName = document.getElementById("user-name");
const logoutButton = document.getElementById("logout-button");
const refreshEventsButton = document.getElementById("refresh-events-button");
const createEventForm = document.getElementById("create-event-form");
const createGiftForm = document.getElementById("create-gift-form");
const eventSelect = document.getElementById("event-select");
const eventsList = document.getElementById("events-list");
const giftsList = document.getElementById("gifts-list");
const status = document.getElementById("status");

const state = {
  events: [],
  selectedEventId: null,
  gifts: []
};

attachApiBaseInput(apiBaseInput);
userName.textContent = session.user?.name || session.user?.email || "Minha conta";

logoutButton.addEventListener("click", () => {
  clearAuthSession();
  window.location.href = "./login.html";
});

refreshEventsButton.addEventListener("click", loadMyEvents);
createEventForm.addEventListener("submit", createEvent);
createGiftForm.addEventListener("submit", createGift);
eventSelect.addEventListener("change", async () => {
  state.selectedEventId = Number(eventSelect.value) || null;
  await loadSelectedEventGifts();
});

loadMyEvents();

async function loadMyEvents() {
  try {
    refreshEventsButton.disabled = true;
    setStatus(status, "status-loading", "Carregando seus eventos...");

    const apiBase = getApiBase();
    const events = await requestJson(`${apiBase}/api/events/mine`, {
      headers: authHeaders(token)
    });

    state.events = events;

    if (!state.events.length) {
      state.selectedEventId = null;
      state.gifts = [];
      renderEvents();
      renderGiftSelect();
      renderGifts();
      setStatus(status, "status-info", "Voce ainda nao possui eventos. Crie o primeiro abaixo.");
      return;
    }

    const selectedStillExists = state.events.some((event) => event.id === state.selectedEventId);
    if (!selectedStillExists) {
      state.selectedEventId = state.events[0].id;
    }

    renderEvents();
    renderGiftSelect();
    await loadSelectedEventGifts();
    setStatus(status, "status-success", "Eventos carregados com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao carregar eventos: ${error.message}`);
  } finally {
    refreshEventsButton.disabled = false;
  }
}

async function createEvent(event) {
  event.preventDefault();

  const name = document.getElementById("event-name-input").value.trim();
  const eventDate = document.getElementById("event-date-input").value;
  const submitButton = document.getElementById("event-submit-button");

  if (!name || !eventDate) {
    setStatus(status, "status-error", "Informe nome e data do evento.");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Criando...";
    setStatus(status, "status-loading", "Criando evento...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, eventDate })
    });

    createEventForm.reset();
    await loadMyEvents();
    setStatus(status, "status-success", "Evento criado com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao criar evento: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar evento";
  }
}

async function createGift(event) {
  event.preventDefault();

  const submitButton = document.getElementById("gift-submit-button");
  const eventId = Number(eventSelect.value);
  const name = document.getElementById("gift-name-input").value.trim();
  const description = document.getElementById("gift-description-input").value.trim();
  const price = Number(document.getElementById("gift-price-input").value);
  const quantity = Number(document.getElementById("gift-quantity-input").value);

  if (!eventId) {
    setStatus(status, "status-error", "Selecione um evento para adicionar o presente.");
    return;
  }

  if (!name) {
    setStatus(status, "status-error", "Informe o nome do presente.");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    setStatus(status, "status-error", "Informe um preco valido (>= 0).");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    setStatus(status, "status-error", "Informe uma quantidade valida (>= 1).");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setStatus(status, "status-loading", "Criando presente...");

    const apiBase = getApiBase();
    await requestJson(`${apiBase}/api/events/${eventId}/gifts`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify({ name, description, price, quantity })
    });

    createGiftForm.reset();
    document.getElementById("gift-quantity-input").value = "1";
    await loadSelectedEventGifts();
    await loadMyEvents();
    setStatus(status, "status-success", "Presente adicionado com sucesso.");
  } catch (error) {
    setStatus(status, "status-error", `Falha ao criar presente: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Adicionar presente";
  }
}

async function loadSelectedEventGifts() {
  if (!state.selectedEventId) {
    state.gifts = [];
    renderGifts();
    return;
  }

  try {
    const apiBase = getApiBase();
    state.gifts = await requestJson(`${apiBase}/api/events/${state.selectedEventId}/gifts`);
    renderGifts();
  } catch (error) {
    state.gifts = [];
    renderGifts();
    setStatus(status, "status-error", `Falha ao carregar presentes: ${error.message}`);
  }
}

function renderGiftSelect() {
  const options = ['<option value="">Selecione um evento</option>'];

  state.events.forEach((event) => {
    const selected = event.id === state.selectedEventId ? " selected" : "";
    options.push(`<option value="${event.id}"${selected}>${escapeHtml(event.name)} - ${formatDate(event.eventDate)}</option>`);
  });

  eventSelect.innerHTML = options.join("");
}

function renderEvents() {
  if (!state.events.length) {
    eventsList.innerHTML = '<div class="center-empty">Nenhum evento cadastrado ainda.</div>';
    return;
  }

  eventsList.innerHTML = "";

  state.events.forEach((event) => {
    const item = document.createElement("article");
    item.className = "event-item";

    const isSelected = event.id === state.selectedEventId;
    const reserveCount = Array.isArray(event.gifts) ? event.gifts.length : 0;

    item.innerHTML = `
      <div class="event-head">
        <div>
          <h3 class="event-title">${escapeHtml(event.name)}</h3>
          <p class="meta">Data: ${formatDate(event.eventDate)} | Slug: ${escapeHtml(event.slug)} | ${reserveCount} presente(s)</p>
        </div>
        <span class="tag ${isSelected ? "tag-ok" : "tag-muted"}">${isSelected ? "Selecionado" : "Disponivel"}</span>
      </div>
      <div class="row" style="margin-top: 10px;">
        <button class="btn ${isSelected ? "btn-primary" : "btn-secondary"}" data-action="select">${isSelected ? "Evento atual" : "Selecionar"}</button>
        <button class="btn btn-ghost" data-action="copy">Copiar link publico</button>
      </div>
    `;

    item.querySelector('[data-action="select"]').addEventListener("click", async () => {
      state.selectedEventId = event.id;
      renderEvents();
      renderGiftSelect();
      await loadSelectedEventGifts();
      setStatus(status, "status-info", `Evento '${event.name}' selecionado.`);
    });

    item.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      const link = buildPublicEventLink(event.slug);
      await copyToClipboard(link);
      setStatus(status, "status-success", `Link publico copiado: ${link}`);
    });

    eventsList.appendChild(item);
  });
}

function renderGifts() {
  if (!state.selectedEventId) {
    giftsList.innerHTML = '<div class="center-empty">Selecione um evento para visualizar os presentes.</div>';
    return;
  }

  if (!state.gifts.length) {
    giftsList.innerHTML = '<div class="center-empty">Nenhum presente cadastrado para este evento.</div>';
    return;
  }

  giftsList.innerHTML = "";

  state.gifts.forEach((gift) => {
    const item = document.createElement("article");
    item.className = "gift-item";

    const available = typeof gift.availableQuantity === "number"
      ? gift.availableQuantity
      : Math.max(0, gift.quantity - (gift.reservedQuantity || 0));

    const badgeClass = available === 0 ? "tag-muted" : available === 1 ? "tag-warning" : "tag-ok";
    const badgeText = available === 0 ? "Reservado" : available === 1 ? "Ultima unidade" : "Disponivel";

    item.innerHTML = `
      <div class="gift-head">
        <div>
          <h3 class="gift-name">${escapeHtml(gift.name)}</h3>
          <p class="meta">${escapeHtml(gift.description || "Sem descricao")}</p>
        </div>
        <span class="tag ${badgeClass}">${badgeText}</span>
      </div>
      <p class="meta">${formatCurrency(gift.price)} | ${available} disponiveis | ${gift.reservedQuantity || 0} reservados</p>
    `;

    giftsList.appendChild(item);
  });
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
