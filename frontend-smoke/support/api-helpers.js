const DEFAULT_API_BASE = process.env.WG_API_BASE_URL || "http://127.0.0.1:5298";

export async function createUser(overrides = {}) {
  const suffix = uniqueSuffix();
  const password = overrides.password || "Smoke@123";
  const email = overrides.email || `smoke-${suffix}@weddingifts.local`;
  const cpf = overrides.cpf || generateUniqueCpf();

  const payload = await requestJson("/api/users", {
    method: "POST",
    body: {
      name: overrides.name || "Usuário Smoke",
      email,
      cpf,
      birthDate: overrides.birthDate || "1990-01-01T00:00:00.000Z",
      password
    }
  });

  return {
    ...payload,
    email,
    cpf,
    password
  };
}

export async function loginUser(email, password) {
  return requestJson("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export async function createAuthenticatedSession(overrides = {}) {
  const user = await createUser(overrides);
  const login = await loginUser(user.email, user.password);

  return {
    ...user,
    token: login.token,
    login
  };
}

export async function createEvent(token, overrides = {}) {
  return requestJson("/api/events", {
    method: "POST",
    token,
    body: {
      name: overrides.name || `Evento Smoke ${uniqueSuffix()}`,
      eventDate: overrides.eventDate || futureEventIso()
    }
  });
}

export async function createGuest(token, eventId, overrides = {}) {
  const suffix = uniqueSuffix();
  const cpf = overrides.cpf || generateUniqueCpf();

  return requestJson(`/api/events/${eventId}/guests`, {
    method: "POST",
    token,
    body: {
      cpf,
      name: overrides.name || "Joao Silva",
      email: overrides.email || `guest-${suffix}@weddingifts.local`,
      phoneNumber: overrides.phoneNumber || "11999990000"
    }
  });
}

export async function createGift(token, eventId, overrides = {}) {
  return requestJson(`/api/events/${eventId}/gifts`, {
    method: "POST",
    token,
    body: {
      name: overrides.name || `Presente Smoke ${uniqueSuffix()}`,
      description: overrides.description || "Presente criado pela automação mínima.",
      price: overrides.price || 299.9,
      quantity: overrides.quantity || 1
    }
  });
}

export function futureDateInputValue(daysAhead = 30) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return formatDateInput(date);
}

export function formatCpf(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function requestJson(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
    method,
    headers: buildHeaders(token, body),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(extractErrorMessage(raw, response.status, path));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function buildHeaders(token, body) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function extractErrorMessage(raw, status, path) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.detail === "string" && parsed.detail.trim()) {
      return parsed.detail;
    }

    if (typeof parsed?.title === "string" && parsed.title.trim()) {
      return parsed.title;
    }
  } catch {
    // Ignore parse failures.
  }

  return `Falha ao chamar ${path}. Status: ${status}.`;
}

function futureEventIso(daysAhead = 45) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateUniqueCpf() {
  while (true) {
    const numbers = new Array(11).fill(0);

    for (let index = 0; index < 9; index += 1) {
      numbers[index] = Math.floor(Math.random() * 10);
    }

    numbers[9] = calculateCpfVerifier(numbers, 9, 10);
    numbers[10] = calculateCpfVerifier(numbers, 10, 11);

    if (!numbers.every((number) => number === numbers[0])) {
      return numbers.join("");
    }
  }
}

function calculateCpfVerifier(numbers, length, initialWeight) {
  let sum = 0;

  for (let index = 0; index < length; index += 1) {
    sum += numbers[index] * (initialWeight - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
