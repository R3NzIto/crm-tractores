import { useEffect, useMemo, useState } from "react";
import {
  createAgenda,
  deleteAgenda,
  getAgenda,
  logoutAndRedirect,
  updateAgenda,
} from "../api";

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "finalizado", label: "Finalizado" },
];

function AgendaPage() {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    status: "pendiente",
  });
  const [editingId, setEditingId] = useState(null);

  const handleApiError = (err) => {
    if (err?.unauthorized) {
      setError(err.message || "Sesion expirada");
      setTimeout(() => logoutAndRedirect("/"), 600);
      return;
    }
    setError(err?.message || "No pudimos completar la operacion");
  };

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAgenda(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      logoutAndRedirect("/");
      return;
    }
    loadItems();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("El titulo es obligatorio");
      return;
    }
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };
      if (editingId) {
        await updateAgenda(token, editingId, payload);
      } else {
        await createAgenda(token, payload);
      }
      setForm({ title: "", description: "", scheduled_at: "", status: "pendiente" });
      setEditingId(null);
      await loadItems();
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    const item = items.find((i) => i.id === id);
    const label = item?.title || "este item";
    const confirmed = window.confirm(`Seguro que quieres eliminar ${label}?`);
    if (!confirmed) return;
    try {
      await deleteAgenda(token, id);
      await loadItems();
    } catch (err) {
      handleApiError(err);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
      status: item.status || "pendiente",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: "", description: "", scheduled_at: "", status: "pendiente" });
  };

  const stats = useMemo(() => {
    const total = items.length;
    const porEstado = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return { total, porEstado };
  }, [items]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="brand">
          <div className="brand-icon">T</div>
          <div>
            Agenda
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              Tareas personales {user?.role === "jefe" ? "y de equipo" : ""}
            </div>
          </div>
        </div>
        <div className="toolbar">
          <span className="tag">
            {stats.total} items · {stats.porEstado.pendiente || 0} pendientes
          </span>
          <button className="btn secondary" onClick={() => (window.location.href = "/dashboard")}>
            Dashboard
          </button>
          <button className="btn danger" onClick={() => logoutAndRedirect("/")}>
            Cerrar sesion
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="page-header" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{editingId ? "Editar tarea" : "Nueva tarea"}</h3>
          <div className="toolbar">
            <button className="btn secondary" onClick={loadItems} disabled={loading}>
              Recargar
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="text"
            placeholder="Titulo"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripcion"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(73, 122, 85, 0.4)",
              background: "rgba(17, 29, 23, 0.7)",
              color: "#e7f1ea",
              padding: 10,
            }}
          />
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="toolbar">
            <button className="btn" type="submit" disabled={loading}>
              {editingId ? "Guardar" : "Agregar"}
            </button>
            {editingId && (
              <button className="btn secondary" type="button" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Cargando agenda...</p>}
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Mis tareas</h3>
          <span className="pill">
            Pend: {stats.porEstado.pendiente || 0} · En prog: {stats.porEstado.en_progreso || 0} ·
            Done: {stats.porEstado.finalizado || 0}
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Fecha/hora</th>
                <th>Estado</th>
                <th>Descripcion</th>
                <th>Asignado</th>
                <th style={{ width: 200 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td className="muted">
                    {item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleString()
                      : "Sin fecha"}
                  </td>
                  <td className="muted">{item.status}</td>
                  <td className="muted">{item.description || "-"}</td>
                  <td className="muted">{item.user_name || "Yo"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn secondary" type="button" onClick={() => startEdit(item)}>
                        Editar
                      </button>
                      <button className="btn danger" type="button" onClick={() => handleDelete(item.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan="6" className="muted">
                    Sin tareas en la agenda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AgendaPage;
