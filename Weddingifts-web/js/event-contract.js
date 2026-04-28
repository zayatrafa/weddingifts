export const DEFAULT_EVENT_TIME_ZONE = "America/Sao_Paulo";
export const MAX_EVENT_DATE_TIME_LOCAL = "2100-12-31T23:59";

export const EVENT_FIELD_LIMITS = {
  name: 120,
  hostNames: 160,
  locationName: 160,
  locationAddress: 255,
  url: 500,
  ceremonyInfo: 500,
  dressCode: 160,
  invitationMessage: 500
};

export const SUPPORTED_EVENT_TIME_ZONES = [
  { value: "America/Sao_Paulo", label: "Brasilia, Sul e Sudeste (UTC-03)" },
  { value: "America/Manaus", label: "Amazonas e Roraima (UTC-04)" },
  { value: "America/Rio_Branco", label: "Acre (UTC-05)" },
  { value: "America/Campo_Grande", label: "Mato Grosso do Sul (UTC-04)" },
  { value: "America/Belem", label: "Belem e Para (UTC-03)" },
  { value: "America/Fortaleza", label: "Fortaleza e Ceara (UTC-03)" },
  { value: "America/Recife", label: "Recife e Pernambuco (UTC-03)" },
  { value: "America/Bahia", label: "Bahia (UTC-03)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-02)" }
];

export function renderTimeZoneOptions(selectedValue = DEFAULT_EVENT_TIME_ZONE) {
  const selectedTimeZoneId = isSupportedEventTimeZone(selectedValue)
    ? selectedValue
    : DEFAULT_EVENT_TIME_ZONE;

  return SUPPORTED_EVENT_TIME_ZONES
    .map((timeZone) => {
      const selected = timeZone.value === selectedTimeZoneId ? " selected" : "";
      return `<option value="${timeZone.value}"${selected}>${escapeHtml(timeZone.label)}</option>`;
    })
    .join("");
}

export function getEventTimeZoneId(eventData) {
  const timeZoneId = eventData?.timeZoneId || DEFAULT_EVENT_TIME_ZONE;
  return isSupportedEventTimeZone(timeZoneId) ? timeZoneId : DEFAULT_EVENT_TIME_ZONE;
}

export function getTimeZoneLabel(timeZoneId) {
  const supported = SUPPORTED_EVENT_TIME_ZONES.find((timeZone) => timeZone.value === timeZoneId);
  return supported?.label || timeZoneId || "Fuso nao informado";
}

export function readEnrichedEventFormValues(elements) {
  return {
    name: elements.name.value.trim(),
    hostNames: elements.hostNames.value.trim(),
    eventDateTimeLocal: elements.eventDateTime.value,
    timeZoneId: elements.timeZoneId.value,
    locationName: elements.locationName.value.trim(),
    locationAddress: elements.locationAddress.value.trim(),
    locationMapsUrl: elements.locationMapsUrl.value.trim(),
    ceremonyInfo: elements.ceremonyInfo.value.trim(),
    dressCode: elements.dressCode.value.trim(),
    invitationMessage: elements.invitationMessage?.value.trim() || "",
    coverImageUrl: elements.coverImageUrl.value.trim()
  };
}

export function buildEnrichedEventPayload(values) {
  return {
    name: values.name,
    hostNames: values.hostNames,
    eventDateTime: buildEventDateTimeOffset(values.eventDateTimeLocal, values.timeZoneId),
    timeZoneId: values.timeZoneId,
    locationName: values.locationName,
    locationAddress: values.locationAddress,
    locationMapsUrl: values.locationMapsUrl,
    ceremonyInfo: values.ceremonyInfo,
    dressCode: values.dressCode,
    invitationMessage: values.invitationMessage,
    coverImageUrl: values.coverImageUrl
  };
}

export function getEnrichedEventValidationError(values) {
  const requiredFields = [
    ["name", "nome do evento"],
    ["hostNames", "nomes do casal"],
    ["eventDateTimeLocal", "data e hora do evento"],
    ["timeZoneId", "fuso do evento"],
    ["locationName", "nome do local"],
    ["locationAddress", "endereco do local"],
    ["locationMapsUrl", "link do Maps"],
    ["ceremonyInfo", "informacoes da cerimonia"],
    ["dressCode", "traje"]
  ];

  const missingField = requiredFields.find(([key]) => !String(values[key] || "").trim());
  if (missingField) {
    return `Informe ${missingField[1]}.`;
  }

  const lengthValidation = [
    ["name", EVENT_FIELD_LIMITS.name, "O nome do evento"],
    ["hostNames", EVENT_FIELD_LIMITS.hostNames, "Os nomes do casal"],
    ["locationName", EVENT_FIELD_LIMITS.locationName, "O nome do local"],
    ["locationAddress", EVENT_FIELD_LIMITS.locationAddress, "O endereco do local"],
    ["ceremonyInfo", EVENT_FIELD_LIMITS.ceremonyInfo, "As informacoes da cerimonia"],
    ["dressCode", EVENT_FIELD_LIMITS.dressCode, "O traje"],
    ["invitationMessage", EVENT_FIELD_LIMITS.invitationMessage, "A mensagem do convite"]
  ].find(([key, maxLength]) => String(values[key] || "").length > maxLength);

  if (lengthValidation) {
    return `${lengthValidation[2]} deve ter no maximo ${lengthValidation[1]} caracteres.`;
  }

  if (!isSupportedEventTimeZone(values.timeZoneId)) {
    return "Selecione um fuso brasileiro valido para o evento.";
  }

  if (!isValidLocalDateTimeValue(values.eventDateTimeLocal)) {
    return "Informe uma data e hora validas para o evento.";
  }

  if (!isFutureEventDateTime(values.eventDateTimeLocal, values.timeZoneId)) {
    return "Informe uma data e hora futuras para o evento.";
  }

  const invalidUrl = [
    ["locationMapsUrl", "link do Maps"],
    ["coverImageUrl", "imagem de capa"]
  ].find(([key]) => {
    const value = String(values[key] || "").trim();
    return value && !isHttpUrl(value);
  });

  if (invalidUrl) {
    return `Informe uma URL valida para ${invalidUrl[1]}.`;
  }

  return "";
}

export function isSupportedEventTimeZone(timeZoneId) {
  return SUPPORTED_EVENT_TIME_ZONES.some((timeZone) => timeZone.value === timeZoneId);
}

export function isFutureEventDateTime(dateTimeLocal, timeZoneId) {
  const instant = getUtcInstantForLocalDateTime(dateTimeLocal, timeZoneId);
  return Boolean(instant) && instant.getTime() > Date.now() && dateTimeLocal <= MAX_EVENT_DATE_TIME_LOCAL;
}

export function buildEventDateTimeOffset(dateTimeLocal, timeZoneId) {
  const parsed = parseLocalDateTimeValue(dateTimeLocal);
  const instant = getUtcInstantForLocalDateTime(dateTimeLocal, timeZoneId);

  if (!parsed || !instant) {
    return "";
  }

  const localAsUtcMs = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
    0,
    0
  );
  const offsetMinutes = Math.round((localAsUtcMs - instant.getTime()) / 60000);

  return `${dateTimeLocal}:00${formatOffset(offsetMinutes)}`;
}

export function defaultEventDateTimeLocalValue(timeZoneId = DEFAULT_EVENT_TIME_ZONE) {
  const nowParts = getZonedParts(new Date(), timeZoneId);
  const futureDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 30, 19, 0, 0, 0));

  return [
    String(futureDate.getUTCFullYear()).padStart(4, "0"),
    String(futureDate.getUTCMonth() + 1).padStart(2, "0"),
    String(futureDate.getUTCDate()).padStart(2, "0")
  ].join("-") + "T19:00";
}

export function minFutureEventDateTimeLocalValue(timeZoneId = DEFAULT_EVENT_TIME_ZONE) {
  return toTimeZoneDateTimeLocalValue(new Date(Date.now() + 5 * 60 * 1000), timeZoneId);
}

export function toEventDateTimeInputValue(eventData) {
  const source = eventData?.eventDateTime || eventData?.eventDate;
  const date = parseEventInstant(source);
  if (!date) return "";

  return toTimeZoneDateTimeLocalValue(date, getEventTimeZoneId(eventData));
}

export function formatEventDateTime(eventData) {
  const source = eventData?.eventDateTime || eventData?.eventDate;
  if (!source) return "Data nao informada";

  const date = parseEventInstant(source);
  if (!date) return "Data invalida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getEventTimeZoneId(eventData)
  }).format(date);
}

export function parseEventInstant(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const date = new Date(hasExplicitOffset ? text : `${text}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimeZoneDateTimeLocalValue(date, timeZoneId) {
  const parts = getZonedParts(date, timeZoneId);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function getUtcInstantForLocalDateTime(dateTimeLocal, timeZoneId) {
  if (!isSupportedEventTimeZone(timeZoneId)) return null;

  const parsed = parseLocalDateTimeValue(dateTimeLocal);
  if (!parsed) return null;

  const targetMs = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
    0,
    0
  );
  let utcMs = targetMs;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zonedParts = getZonedParts(new Date(utcMs), timeZoneId);
    const zonedMs = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      0,
      0
    );
    const difference = zonedMs - targetMs;

    if (difference === 0) break;
    utcMs -= difference;
  }

  const resolved = getZonedParts(new Date(utcMs), timeZoneId);
  if (
    resolved.year !== parsed.year
    || resolved.month !== parsed.month
    || resolved.day !== parsed.day
    || resolved.hour !== parsed.hour
    || resolved.minute !== parsed.minute
  ) {
    return null;
  }

  return new Date(utcMs);
}

function getZonedParts(date, timeZoneId) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const mappedParts = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      mappedParts[part.type] = part.value;
    }
  });

  const hour = Number(mappedParts.hour);
  return {
    year: Number(mappedParts.year),
    month: Number(mappedParts.month),
    day: Number(mappedParts.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(mappedParts.minute)
  };
}

function isValidLocalDateTimeValue(value) {
  return Boolean(parseLocalDateTimeValue(value));
}

function parseLocalDateTimeValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  if (
    Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
    || dateTimeIsOutOfRange(year, hour, minute)
  ) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function dateTimeIsOutOfRange(year, hour, minute) {
  return year < 1900 || year > 2100 || hour < 0 || hour > 23 || minute < 0 || minute > 59;
}

function formatOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function isHttpUrl(value) {
  if (String(value || "").length > EVENT_FIELD_LIMITS.url) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
