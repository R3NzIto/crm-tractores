const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

// Función auxiliar para limpiar sesión
const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// Función genérica para peticiones
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

// --- AUTENTICACIÓN ---

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

export function logoutAndRedirect(path = "/") {
  clearAuthStorage();
  window.location.href = path;
}

// --- CLIENTES ---

export const getCustomers = async (token, { machine = "", type = "" } = {}) => {
  let url = `${API_URL}/api/customers?`;
  if (machine) url += `&machine=${encodeURIComponent(machine)}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw { unauthorized: true };
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Error cargando datos");
  return data;
};

export async function getCustomer(token, id) {
  return apiFetch(`/api/customers/${id}`, { token });
}

export async function createCustomer(token, payload) {
  return apiFetch("/api/customers", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateCustomer(token, id, payload) {
  return apiFetch(`/api/customers/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteCustomer(token, id) {
  return apiFetch(`/api/customers/${id}`, {
    method: "DELETE",
    token,
  });
}

// 👇👇 AQUÍ ESTÁ LA FUNCIÓN NUEVA QUE FALTABA 👇👇
export async function deleteCustomersBatch(token, ids) {
  return apiFetch("/api/customers/delete-batch", {
    method: "POST",
    token,
    body: { ids }, 
  });
}
// 👆👆 FIN DE LA FUNCIÓN NUEVA 👆👆

export async function importCustomers(token, file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/api/customers/import", {
    method: "POST",
    token,
    body: formData,
    isFormData: true,
  });
}

export async function assignCustomer(token, id, userId) {
  return apiFetch(`/api/customers/${id}/assign`, {
    method: "PATCH",
    token,
    body: { user_id: userId },
  });
}

// --- USUARIOS ---

export async function getUsers(token) {
  return apiFetch("/api/users", { token });
}

// --- NOTAS Y AGENDA ---

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

// --- DASHBOARD ---

export const getDashboardActivity = async (token) => {
  const response = await fetch(`${API_URL}/api/dashboard/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

export const getDashboardStats = async (token) => {
  const response = await fetch(`${API_URL}/api/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

// --- UNIDADES / MAQUINARIA ---

export const getCustomerUnits = async (token, customerId) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
};

export const createCustomerUnit = async (token, customerId, data) => {
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

export const deleteCustomerUnit = async (token, customerId, unitId) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units/${unitId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Error eliminando unidad");
};