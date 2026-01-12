const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const CACHE_TTL_MS = 30_000;

let customersCache = null;
let customersCacheAt = 0;

const clearCache = () => {
  customersCache = null;
  customersCacheAt = 0;
};

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

async function apiFetch(path, { method = "GET", token, body, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include", // permitir cookie httpOnly
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

    if (res.status === 401) {
      clearAuthStorage();
    const error = new Error(data?.message || "Sesion expirada, vuelve a iniciar sesion");
    error.unauthorized = true;
    throw error;
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Error en la solicitud");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function loginRequest(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

export async function registerRequest(payload) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_URL}/api/auth/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function resetPassword(token, password) {
  const res = await fetch(`${API_URL}/api/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function getCustomers(token, { force = false } = {}) {
  const now = Date.now();

  if (!force && customersCache && now - customersCacheAt < CACHE_TTL_MS) {
    return customersCache;
  }

  const data = await apiFetch("/api/customers", { token });
  customersCache = data;
  customersCacheAt = now;
  return data;
}

export async function getCustomer(token, id) {
  return apiFetch(`/api/customers/${id}`, { token });
}

export async function createCustomer(token, payload) {
  const customer = await apiFetch("/api/customers", {
    method: "POST",
    token,
    body: payload,
  });
  clearCache();
  return customer;
}

export async function updateCustomer(token, id, payload) {
  const customer = await apiFetch(`/api/customers/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
  clearCache();
  return customer;
}

export async function deleteCustomer(token, id) {
  await apiFetch(`/api/customers/${id}`, {
    method: "DELETE",
    token,
  });
  clearCache();
  return true;
}

export async function importCustomers(token, file) {
  const formData = new FormData();
  formData.append("file", file);

  const data = await apiFetch("/api/customers/import", {
    method: "POST",
    token,
    body: formData,
    isFormData: true,
  });

  clearCache();
  return data;
}

export async function getUsers(token) {
  return apiFetch("/api/users", { token });
}

export async function assignCustomer(token, id, userId) {
  const data = await apiFetch(`/api/customers/${id}/assign`, {
    method: "PATCH",
    token,
    body: { user_id: userId },
  });
  clearCache();
  return data;
}

export function logoutAndRedirect(path = "/") {
  clearAuthStorage();
  window.location.href = path;
}

export function invalidateCustomersCache() {
  clearCache();
}

export async function getCustomerNotes(token, customerId) {
  return apiFetch(`/api/customers/${customerId}/notes`, { token });
}

export async function createCustomerNote(token, customerId, payload) {
  return apiFetch(`/api/customers/${customerId}/notes`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function deleteCustomerNote(token, customerId, noteId) {
  return apiFetch(`/api/customers/${customerId}/notes/${noteId}`, {
    method: "DELETE",
    token,
  });
}

export async function getAgenda(token) {
  return apiFetch("/api/agenda", { token });
}

export async function createAgenda(token, payload) {
  return apiFetch("/api/agenda", { method: "POST", token, body: payload });
}

export async function updateAgenda(token, id, payload) {
  return apiFetch(`/api/agenda/${id}`, { method: "PUT", token, body: payload });
}

export async function deleteAgenda(token, id) {
  return apiFetch(`/api/agenda/${id}`, { method: "DELETE", token });
}
// Agrega esto en src/api.js

export const getDashboardActivity = async (token) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"; // O usa tu variable existente
  
  const response = await fetch(`${API_URL}/dashboard/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

export const getDashboardStats = async (token) => {
  // Asegúrate de usar tu variable de entorno correcta, aquí pongo el ejemplo directo
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"; 
  
  const response = await fetch(`${API_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

// --- UNIDADES / MAQUINARIA ---

export const getCustomerUnits = async (token, customerId) => {
  // AGREGADO: /api antes de /customers
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
};

export const createCustomerUnit = async (token, customerId, data) => {
  // AGREGADO: /api antes de /customers
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error guardando unidad");
  return await response.json();
};

export const deleteCustomerUnit = async (token, customerId, unitId) => {
  // AGREGADO: /api antes de /customers
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units/${unitId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Error eliminando unidad");
};

export const updateCustomerUnit = async (token, customerId, unitId, data) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units/${unitId}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error actualizando unidad");
  return await response.json();
};