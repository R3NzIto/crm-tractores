import { useEffect, useMemo, useState } from "react";
import {
  createAgenda,
  deleteAgenda,
  getAgenda,
  logoutAndRedirect,
  updateAgenda,
} from "../api";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "finalizado", label: "Finalizado" },
];

const STATUS_META = {
  pendiente: { label: "Pendiente", tone: "warning" },
  en_progreso: { label: "En progreso", tone: "info" },
  finalizado: { label: "Finalizado", tone: "success" },
};

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
    const completados = porEstado.finalizado || 0;
    const avance = total ? Math.round((completados / total) * 100) : 0;
    const proximas = items
      .filter((item) => item.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    const proximo = proximas[0];
    const now = Date.now();
    const atrasadas = items.filter(
      (item) =>
        item.scheduled_at &&
        new Date(item.scheduled_at).getTime() < now &&
        item.status !== "finalizado"
    ).length;
    return { total, porEstado, avance, proximo, atrasadas };
  }, [items]);

  const formatStatus = (status) => STATUS_META[status]?.label || status;

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : "Sin fecha";

  return (
    <div className="page agenda-page">
      <div className="page-hero card lift">
        <div className="brand">
          <img src={logoWolfHard} alt="Wolf Hard" className="brand-logo" />
          <div>
            Agenda de tareas
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              Flujo operativo {user?.role === "jefe" ? "del equipo" : "personal"}
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <span className="tag">
            {stats.total} items - {stats.porEstado.pendiente || 0} pendientes
          </span>
          <span className={`status-chip ${stats.atrasadas ? "danger" : "success"}`}>
            {stats.atrasadas || 0} atrasadas
          </span>
          <div className="toolbar">
            <button className="btn ghost" onClick={() => (window.location.href = "/dashboard")}>
              Dashboard
            </button>
            <button className="btn danger" onClick={() => logoutAndRedirect("/")}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid agenda-kpis">
        <div className="kpi-card pulse">
          <div className="kpi-title">Pendientes</div>
          <div className="kpi-value">{stats.porEstado.pendiente || 0}</div>
          <p className="muted small">Prioriza las proximas 24h</p>
        </div>
        <div className="kpi-card pulse">
          <div className="kpi-title">En progreso</div>
          <div className="kpi-value">{stats.porEstado.en_progreso || 0}</div>
          <p className="muted small">Movidas esta semana</p>
        </div>
        <div className="kpi-card pulse">
          <div className="kpi-title">Finalizadas</div>
          <div className="kpi-value">{stats.porEstado.finalizado || 0}</div>
          <p className="muted small">Cierre efectivo</p>
        </div>
        <div className="kpi-card pulse">
              <div className="kpi-title">Progreso</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${stats.avance}%` }} />
              </div>
              <p className="muted small">{stats.avance}% completado</p>
            </div>
            <div className="kpi-card pulse">
              <div className="kpi-title">Atrasadas</div>
              <div className="kpi-value" style={{ color: stats.atrasadas ? "#f48b6a" : "#c8f3d6" }}>
                {stats.atrasadas || 0}
              </div>
              <p className="muted small">
                {stats.atrasadas ? "Reprograma o cierra hoy" : "Sin atrasos"}
              </p>
            </div>
            <div className="kpi-card pulse wide">
              <div className="kpi-title">Proxima cita</div>
              <div className="kpi-value" style={{ fontSize: "1rem" }}>
                {stats.proximo ? formatDate(stats.proximo.scheduled_at) : "Sin fecha programada"}
              </div>
          <p className="muted small">
            {stats.proximo ? stats.proximo.title : "Agenda una tarea para mantener ritmo"}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card lift">
          <div className="card-header">
            <div>
              <p className="eyebrow">{editingId ? "Editar tarea" : "Nueva tarea"}</p>
              <h3 style={{ margin: "2px 0 0" }}>
                {editingId ? "Ajusta detalles y guarda" : "Captura y prioriza"}
              </h3>
            </div>
            <button className="btn ghost" onClick={loadItems} disabled={loading}>
              Recargar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-grid compact fade-in">
            <input
              type="text"
              placeholder="Titulo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="textarea"
              placeholder="Descripcion y notas internas"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
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
                {editingId ? "Guardar cambios" : "Agregar a agenda"}
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

        <div className="card lift">
          <div className="card-header">
            <div>
              <p className="eyebrow">Visibilidad</p>
              <h3 style={{ margin: "2px 0 0" }}>Mis tareas</h3>
            </div>
            <span className="pill">
              Pend: {stats.porEstado.pendiente || 0} - En prog: {stats.porEstado.en_progreso || 0} -
              Done: {stats.porEstado.finalizado || 0}
            </span>
          </div>

          <div className="table-wrapper">
            <table className="table sleek">
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
                  <tr
                    key={item.id}
                    className={`fade-in ${item.scheduled_at && new Date(item.scheduled_at) < new Date() && item.status !== "finalizado" ? "overdue" : ""}`}
                    data-status={item.status}
                  >
                    <td>
                      <div className="cell-title">{item.title}</div>
                      <div className="muted small">{item.user_name || "Yo"}</div>
                    </td>
                    <td className="muted">{formatDate(item.scheduled_at)}</td>
                    <td>
                      <span className={`status-chip ${STATUS_META[item.status]?.tone || "neutral"}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td className="muted">{item.description || "-"}</td>
                    <td className="muted">{item.user_name || "Yo"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn ghost" type="button" onClick={() => startEdit(item)}>
                          Editar
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => handleDelete(item.id)}
                        >
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
    </div>
  );
}

export default AgendaPage;
