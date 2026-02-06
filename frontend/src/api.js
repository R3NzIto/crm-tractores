const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

// Función auxiliar para limpiar sesión
const clearAuthStorage = () => {
  localStorage.removeItem("token"); // legacy, por si quedó
  localStorage.removeItem("user");
};

// Función genérica para peticiones
async function apiFetch(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include", // usamos cookie httpOnly
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
    // Redirigir a login conservando retorno opcional
    const redirectTo = "/"; // puedes cambiar a '/login' si tu ruta de login es esa
    window.location.replace(redirectTo);
    const error = new Error(data?.message || "Sesión expirada, vuelve a iniciar sesión");
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

export const getCustomers = async (params = {}) => {
  const { machine = "", type = "" } = params || {};
  let url = `${API_URL}/api/customers?`;
  if (machine) url += `&machine=${encodeURIComponent(machine)}`;
  
  const response = await fetch(url, {
    credentials: "include",
  });
  if (response.status === 401) throw { unauthorized: true };
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Error cargando datos");
  return data;
};

export const getCustomer = async (id) => apiFetch(`/api/customers/${id}`);
export const createCustomer = async (payload) => apiFetch("/api/customers", { method: "POST", body: payload });
export const updateCustomer = async (id, payload) => apiFetch(`/api/customers/${id}`, { method: "PUT", body: payload });
export const deleteCustomer = async (id) => apiFetch(`/api/customers/${id}`, { method: "DELETE" });

// POS (Puntos de Venta)
export const getPos = async () => apiFetch("/api/pos");
export const createPos = async (payload) => apiFetch("/api/pos", { method: "POST", body: payload });
export const updatePos = async (id, payload) => apiFetch(`/api/pos/${id}`, { method: "PUT", body: payload });
export const deletePos = async (id) => apiFetch(`/api/pos/${id}`, { method: "DELETE" });
export const deleteCustomersBatch = async (ids) => apiFetch("/api/customers/delete-batch", { method: "POST", body: { ids } });
// 👆👆 FIN DE LA FUNCIÓN NUEVA 👆👆

export async function importCustomers(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/api/customers/import", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

export async function assignCustomer(id, userId) {
  return apiFetch(`/api/customers/${id}/assign`, {
    method: "PATCH",
    body: { user_id: userId },
  });
}

// --- USUARIOS ---

export const getUsers = async () => apiFetch("/api/users");

// --- NOTAS Y AGENDA ---

export const getCustomerNotes = async (customerId) => {
  if (customerId === undefined || customerId === null || Number.isNaN(Number(customerId))) {
    throw new Error("customerId inválido");
  }
  const cid = Number(customerId);
  return apiFetch(`/api/customers/${cid}/notes`);
};
export const createCustomerNote = async (customerId, payload) => apiFetch(`/api/customers/${customerId}/notes`, { method: "POST", body: payload });
export const deleteCustomerNote = async (customerId, noteId) => apiFetch(`/api/customers/${customerId}/notes/${noteId}`, { method: "DELETE" });

export const getAgenda = async () => apiFetch("/api/agenda");
export const createAgenda = async (payload) => apiFetch("/api/agenda", { method: "POST", body: payload });
export const updateAgenda = async (id, payload) => apiFetch(`/api/agenda/${id}`, { method: "PUT", body: payload });
export const deleteAgenda = async (id) => apiFetch(`/api/agenda/${id}`, { method: "DELETE" });

// --- DASHBOARD ---
export const getDailyPerformance = async () => {
  const response = await fetch(`${API_URL}/api/dashboard/daily-performance`, { credentials: "include" });
  if (!response.ok) throw new Error("Error cargando gráfico");
  return await response.json();
};

export const getDashboardActivity = async () => {
  const response = await fetch(`${API_URL}/api/dashboard/activity`, { credentials: "include" });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

export const getDashboardStats = async () => {
  const response = await fetch(`${API_URL}/api/dashboard/stats`, { credentials: "include" });
  const data = await response.json();
  if (!response.ok) throw { message: data.message, status: response.status };
  return data;
};

export const getSalesHistory = async () => {
  const response = await fetch(`${API_URL}/api/dashboard/sales-history`, { credentials: "include" });
  return await response.json();
};

export const deleteSale = async (id) => {
  const response = await fetch(`${API_URL}/api/dashboard/sale/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error al eliminar venta");
};

export const getSalesByModel = async () => {
  const response = await fetch(`${API_URL}/api/dashboard/sales-by-model`, { credentials: "include" });
  return await response.json();
};

// --- UNIDADES / MAQUINARIA ---

export const getCustomerUnits = async (customerId) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units`, { credentials: "include" });
  return await response.json();
};

export const createCustomerUnit = async (customerId, data) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error guardando unidad");
  return await response.json();
};

export const updateCustomerUnit = async (customerId, unitId, data) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units/${unitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error actualizando unidad");
  return await response.json();
};

export const deleteCustomerUnit = async (customerId, unitId) => {
  const response = await fetch(`${API_URL}/api/customers/${customerId}/units/${unitId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error eliminando unidad");
};

// --- UNIDADES / MAQUINARIA PARA POS ---
export const getPosUnits = async (posId) => apiFetch(`/api/pos/${posId}/units`);
export const createPosUnit = async (posId, data) => apiFetch(`/api/pos/${posId}/units`, { method: "POST", body: data });
export const updatePosUnit = async (posId, unitId, data) => apiFetch(`/api/pos/${posId}/units/${unitId}`, { method: "PUT", body: data });
export const deletePosUnit = async (posId, unitId) => apiFetch(`/api/pos/${posId}/units/${unitId}`, { method: "DELETE" });
