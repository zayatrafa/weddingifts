import {
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

const MAX_SLUG_LENGTH = 24;
const MAX_RSVP_TEXT_LENGTH = 500;
const MAX_COMPANION_NAME_LENGTH = 120;
const PUBLIC_GIFT_CONTEXT_KEY = "wg_public_gift_context";
const UTC_MINUS_THREE_TIME_ZONES = new Set([
  "America/Sao_Paulo",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia"
]);

const state = {
  event: null,
  rsvp: null,
  slug: "",
  guestCpf: "",
  lookupSubmitting: false,
  rsvpSubmitting: false
};

const root = document.getElementById("public-event-root");
const hero = document.getElementById("public-event-hero");
const heroMedia = document.querySelector(".public-event-hero-media");
const coverImage = document.getElementById("event-cover-image");
const title = document.getElementById("event-title");
const hosts = document.getElementById("event-hosts");
const date = document.getElementById("event-date");
const locationLabel = document.getElementById("event-location");
const mapLink = document.getElementById("event-map-link");
const openRsvpButton = document.getElementById("open-rsvp-button");
const openGiftsButton = document.getElementById("open-gifts-button");
const content = document.getElementById("public-event-content");
const status = document.getElementById("invitation-flow-status");
const messageSection = document.getElementById("event-message-section");
const messageText = document.getElementById("event-invitation-message");
const details = document.getElementById("event-details");
const scheduleSection = document.getElementById("event-schedule-section");
const scheduleText = document.getElementById("event-schedule-info");
const foodSection = document.getElementById("event-food-section");
const foodText = document.getElementById("event-food-info");
const gallerySection = document.getElementById("event-gallery-section");
const gallery = document.getElementById("event-gallery");
const flowRoot = document.getElementById("invitation-flow-root");
const stepPanel = document.getElementById("invitation-step-panel");
const identifyFields = document.getElementById("invitation-identify-fields");
const guestCpfInput = document.getElementById("invitation-guest-cpf-input");
const rsvpLookupButton = document.getElementById("invitation-next-button");
const rsvpStatus = document.getElementById("rsvp-status");
const rsvpPanel = document.getElementById("rsvp-panel");

const session = getAuthSession();
enhanceHeaderForLoggedUser(session);
prefillGuestCpfForLoggedUser(session);

const query = new URLSearchParams(window.location.search);
const querySlug = String(query.get("slug") || "").trim();

openRsvpButton.addEventListener("click", showRsvpGate);
openGiftsButton.addEventListener("click", openPublicGiftPage);
rsvpLookupButton.addEventListener("click", lookupRsvp);
guestCpfInput.addEventListener("input", () => {
  guestCpfInput.value = formatCpfInput(guestCpfInput.value);
  clearFieldError(guestCpfInput);
});
guestCpfInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  lookupRsvp();
});

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
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function loadEvent(slug) {
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
    state.slug = safeSlug;
    root.dataset.state = "loading";
    setStatus(status, "status-loading", UI_TEXT.publicEvent.loading);

    const apiBase = getApiBase();
    state.event = await requestJson(`${apiBase}/api/events/${encodeURIComponent(safeSlug)}`);
    renderEventHub();
    clearFlowStatus();
  } catch (error) {
    renderLoadError(`${UI_TEXT.publicEvent.loadError}: ${error.message}`);
  }
}

function renderMissingSlug() {
  root.dataset.state = "missing-slug";
  hero.hidden = true;
  content.hidden = true;
  flowRoot.hidden = true;
  setStatus(status, "status-error", "Abra o convite pelo link enviado pelo casal.");
}

function renderLoadError(message) {
  root.dataset.state = "error";
  hero.hidden = true;
  content.hidden = true;
  flowRoot.hidden = true;
  setStatus(status, "status-error", message);
}

function renderEventHub() {
  if (!state.event) return;

  root.dataset.state = "ready";
  hero.hidden = false;
  content.hidden = false;

  title.textContent = state.event.name || "Evento";
  hosts.textContent = state.event.hostNames ? `Com ${state.event.hostNames}` : "";
  date.textContent = formatEventDateTime(state.event);
  locationLabel.textContent = state.event.locationName || state.event.locationAddress || "";
  date.closest(".public-event-fact").hidden = !date.textContent.trim();
  locationLabel.closest(".public-event-fact").hidden = !locationLabel.textContent.trim();
  heroMedia?.setAttribute("data-monogram", buildEventMonogram(state.event.hostNames || state.event.name));

  if (state.event.coverImageUrl) {
    coverImage.src = state.event.coverImageUrl;
    coverImage.alt = `Imagem de capa do evento ${state.event.name}`;
    coverImage.hidden = false;
    hero.dataset.cover = "image";
  } else {
    coverImage.removeAttribute("src");
    coverImage.alt = "";
    coverImage.hidden = true;
    hero.dataset.cover = "fallback";
  }

  if (state.event.locationMapsUrl) {
    mapLink.hidden = false;
    mapLink.href = state.event.locationMapsUrl;
  } else {
    mapLink.hidden = true;
    mapLink.removeAttribute("href");
  }

  renderOptionalTextSection(messageSection, messageText, state.event.invitationMessage);
  renderOptionalTextSection(scheduleSection, scheduleText, state.event.scheduleInfo);
  renderOptionalTextSection(foodSection, foodText, state.event.foodInfo);
  renderEventDetails();
  renderGallery();
}

function renderOptionalTextSection(section, target, value) {
  const text = String(value || "").trim();
  section.hidden = !text;
  target.textContent = text;
}

function buildEventMonogram(value) {
  const tokens = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+(?:e|and|&)\s+|[,&+/]+|\s{2,}/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const initials = tokens
    .slice(0, 2)
    .map((part) => part.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase())
    .filter(Boolean);

  return initials.length ? initials.join(" & ") : "W";
}

function renderEventDetails() {
  const eventTimeZoneId = getEventTimeZoneId(state.event);
  const rows = [
    ["Casal", state.event.hostNames],
    ["Data e hora", formatEventDateTime(state.event)],
    ["Local", state.event.locationName],
    ["Endereço", state.event.locationAddress],
    ["Cerimônia", state.event.ceremonyInfo],
    ["Traje", state.event.dressCode],
    shouldShowEventTimeZone(eventTimeZoneId) ? ["Fuso", getTimeZoneLabel(eventTimeZoneId)] : null
  ].filter((row) => row && String(row[1] || "").trim());

  details.innerHTML = rows
    .map(([label, value]) => `<div class="public-event-info-item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function shouldShowEventTimeZone(timeZoneId) {
  return !UTC_MINUS_THREE_TIME_ZONES.has(timeZoneId);
}

function renderGallery() {
  const imageUrls = Array.isArray(state.event?.galleryImageUrls) ? state.event.galleryImageUrls : [];
  gallerySection.hidden = imageUrls.length === 0;
  gallery.innerHTML = imageUrls
    .map((url, index) => `
      <figure class="public-event-gallery-item">
        <img src="${escapeAttribute(url)}" alt="Foto ${index + 1} do evento ${escapeAttribute(state.event.name)}" loading="lazy" />
      </figure>
    `)
    .join("");
}

function showRsvpGate() {
  if (!state.event) return;

  flowRoot.hidden = false;
  flowRoot.dataset.state = "identify";
  identifyFields.hidden = false;
  rsvpPanel.hidden = true;
  clearRsvpStatus();
  clearFlowStatus();
  stepPanel.innerHTML = `
    <div class="invitation-identify-copy">
      <p class="kicker">Confirmação de presença</p>
      <h2>Confirme sua presença</h2>
      <p>Informe seu CPF para acessar seu convite, confirmar presença e editar acompanhantes.</p>
    </div>
  `;
  rsvpLookupButton.disabled = false;
  rsvpLookupButton.textContent = "OK";
  flowRoot.scrollIntoView({ behavior: "smooth", block: "start" });
  guestCpfInput.focus({ preventScroll: true });
}

async function lookupRsvp() {
  if (state.lookupSubmitting || !state.event) return;

  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);
  if (!isValidCpf(guestCpf)) {
    showFieldError(guestCpfInput, "Informe um CPF válido para consultar o convite.");
    return;
  }

  try {
    state.lookupSubmitting = true;
    rsvpLookupButton.disabled = true;
    clearFieldError(guestCpfInput);
    clearRsvpStatus();
    setStatus(status, "status-loading", "Consultando convite...");

    const apiBase = getApiBase();
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp?guestCpf=${encodeURIComponent(guestCpf)}`);
    state.guestCpf = guestCpf;
    savePublicGiftContext();
    renderRsvpForm();
    clearFlowStatus();
  } catch (error) {
    state.rsvp = null;
    showRsvpGate();
    showFieldError(guestCpfInput, `Não foi possível consultar o convite: ${error.message}`);
  } finally {
    state.lookupSubmitting = false;
    rsvpLookupButton.disabled = false;
  }
}

function renderRsvpForm() {
  if (!state.rsvp) return;

  flowRoot.hidden = false;
  flowRoot.dataset.state = "rsvp";
  identifyFields.hidden = true;
  rsvpPanel.hidden = false;
  stepPanel.innerHTML = `
    <div class="invitation-rsvp-copy">
      <p class="kicker">RSVP</p>
      <h2>${escapeHtml(state.rsvp.guestName)}, confirme sua resposta</h2>
      <p>Atualize sua presença e os acompanhantes permitidos para que o casal receba a lista correta.</p>
    </div>
  `;

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
        <button id="rsvp-close-button" class="btn btn-secondary" type="button">Fechar</button>
        <button id="rsvp-submit-button" class="btn btn-primary" type="submit">Salvar confirmação</button>
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
    renderCompanionFields(parseCompanionCount(companionCountInput.value) ?? 0, currentValues);
  });

  form.addEventListener("input", (event) => clearFieldError(event.target));
  form.addEventListener("change", (event) => clearFieldError(event.target));
  form.querySelector("#rsvp-close-button")?.addEventListener("click", hideRsvpSection);
  form.addEventListener("submit", submitRsvp);
}

function hideRsvpSection() {
  flowRoot.hidden = true;
  clearFlowStatus();
  clearRsvpStatus();
}

function renderRsvpResult(selectedStatus) {
  const accepted = selectedStatus === "accepted";

  flowRoot.hidden = false;
  flowRoot.dataset.state = "complete";
  identifyFields.hidden = true;
  rsvpPanel.hidden = true;
  rsvpPanel.innerHTML = "";
  clearRsvpStatus();

  stepPanel.innerHTML = `
    <div class="rsvp-result-message ${accepted ? "rsvp-result-accepted" : "rsvp-result-declined"}" role="status">
      <span class="rsvp-result-icon" aria-hidden="true">
        ${accepted
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>'}
      </span>
      <p class="kicker">${accepted ? "Presença confirmada" : "Resposta registrada"}</p>
      <h2>${accepted ? "Obrigado por confirmar presença." : "Sentiremos sua falta."}</h2>
      <p>${accepted
        ? "Sua resposta foi registrada. Vai ser especial celebrar essa história com você."
        : "Que pena que você não poderá comparecer. Mesmo assim, você faz parte dessa história."}</p>
      <div class="rsvp-result-actions">
        <button id="rsvp-edit-response-button" class="btn btn-secondary with-icon" type="button">
          <span class="btn-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
          </span>
          <span>Editar resposta</span>
        </button>
        <button id="rsvp-result-gifts-button" class="btn btn-primary with-icon" type="button">
          <span class="btn-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/></svg>
          </span>
          <span>Ver lista de presentes</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById("rsvp-edit-response-button")?.addEventListener("click", renderRsvpForm);
  document.getElementById("rsvp-result-gifts-button")?.addEventListener("click", openPublicGiftPage);
  flowRoot.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitRsvp(event) {
  event.preventDefault();

  if (!state.event || !state.rsvp || state.rsvpSubmitting) return;

  const selectedStatus = getSelectedRsvpStatus();
  const messageToCouple = document.getElementById("rsvp-message-input")?.value.trim() || "";
  const dietaryRestrictions = document.getElementById("rsvp-dietary-input")?.value.trim() || "";
  const guestCpf = state.guestCpf || digitsOnly(guestCpfInput.value);

  clearRsvpFieldErrors();
  const validationError = validateRsvpSubmission(selectedStatus, messageToCouple, dietaryRestrictions);
  if (validationError) {
    showFieldError(validationError.target, validationError.message);
    return;
  }

  const payload = {
    guestCpf,
    status: selectedStatus,
    messageToCouple: messageToCouple || null,
    companions: selectedStatus === "accepted" ? readCompanionValues() : []
  };

  if (selectedStatus === "accepted") {
    payload.dietaryRestrictions = dietaryRestrictions || null;
  }

  try {
    state.rsvpSubmitting = true;
    const submitButton = document.getElementById("rsvp-submit-button");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
    }

    clearRsvpStatus();
    setStatus(status, "status-loading", "Salvando confirmação...");
    const apiBase = getApiBase();
    const method = normalizeRsvpStatus(state.rsvp.rsvpStatus) === "pending" ? "POST" : "PUT";
    state.rsvp = await requestJson(`${apiBase}/api/events/${encodeURIComponent(state.event.slug)}/rsvp`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.guestCpf = guestCpf;
    savePublicGiftContext();
    renderRsvpResult(selectedStatus);
    clearFlowStatus();
  } catch (error) {
    clearFlowStatus();
    showBackendRsvpError(`Não foi possível salvar sua resposta: ${error.message}`);
  } finally {
    state.rsvpSubmitting = false;
    const submitButton = document.getElementById("rsvp-submit-button");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar confirmação";
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

  if (!isValidCpf(state.guestCpf || digitsOnly(guestCpfInput.value))) {
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

function syncRsvpStatusUi() {
  const selectedStatus = getSelectedRsvpStatus();
  const acceptedFields = document.getElementById("rsvp-accepted-fields");

  if (!acceptedFields) return;
  acceptedFields.hidden = selectedStatus === "declined";
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

  const eventDate = parseEventInstant(source);
  if (!eventDate) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getEventTimeZoneId(state.event),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(eventDate);

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

function openPublicGiftPage() {
  if (!state.event?.slug) return;

  savePublicGiftContext();
  window.location.href = `./gifts.html?slug=${encodeURIComponent(state.event.slug)}`;
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
  return /^[\p{L}'-]+(?:\s+[\p{L}'-]+)*$/u.test(String(name || "").trim());
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
