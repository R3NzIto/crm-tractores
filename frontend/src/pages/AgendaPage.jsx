import { useEffect, useMemo, useState, useCallback } from "react"; // 👈 Importamos useCallback
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

const STATUS_META = {
  pendiente: { label: "Pendiente", tone: "warning" },
  en_progreso: { label: "En progreso", tone: "info" },
  finalizado: { label: "Finalizado", tone: "success" },
};

function AgendaPage() {

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

  // ✅ CORRECCIÓN: Usamos useCallback para que esta función sea estable
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAgenda();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, []); // Solo se recrea una vez

  // ✅ CORRECCIÓN: Agregamos loadItems a las dependencias
  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
        await updateAgenda(editingId, payload);
      } else {
        await createAgenda(payload);
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
      await deleteAgenda(id);
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

  const formatDate = (dateString) => {
    if (!dateString) return "Sin fecha";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page agenda-page">
      <div className="page-header">
         <h2 style={{margin:0}}>Agenda & Tareas</h2>
         {stats.atrasadas > 0 && (
           <span className="tag" style={{ color: '#ff6b6b' }}>
              ⚠️ {stats.atrasadas} Tareas Atrasadas
           </span>
         )}
      </div>

      <div className="kpi-grid agenda-kpis" style={{marginBottom: '20px'}}>
        <div className="card">
          <div style={{fontSize:'0.9rem', color:'#A0A0A0'}}>Pendientes</div>
          <div style={{fontSize:'1.6rem', fontWeight:'bold'}}>{stats.porEstado.pendiente || 0}</div>
        </div>
        <div className="card">
          <div style={{fontSize:'0.9rem', color:'#A0A0A0'}}>En progreso</div>
          <div style={{fontSize:'1.6rem', fontWeight:'bold'}}>{stats.porEstado.en_progreso || 0}</div>
        </div>
        <div className="card">
          <div style={{fontSize:'0.9rem', color:'#A0A0A0'}}>Finalizadas</div>
          <div style={{fontSize:'1.6rem', fontWeight:'bold'}}>{stats.porEstado.finalizado || 0}</div>
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <h3 style={{ margin: 0 }}>
             {editingId ? "Editar tarea" : "Nueva tarea"}
          </h3>
          <button className="btn ghost" onClick={loadItems} disabled={loading}>
            Actualizar Lista
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid compact">
          <input
            type="text"
            placeholder="Titulo"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripcion y notas internas"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
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

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="page-header">
          <h3 style={{ margin: "0" }}>Mis tareas</h3>
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
                  style={item.scheduled_at && new Date(item.scheduled_at) < new Date() && item.status !== "finalizado" ? { background: 'rgba(211, 47, 47, 0.05)' } : {}}
                >
                  <td>
                    <div className="cell-title" style={{fontWeight:'600'}}>{item.title}</div>
                  </td>
                  <td className="muted">{formatDate(item.scheduled_at)}</td>
                  <td>
                    <span className="tag" style={{
                         background: item.status === 'finalizado' ? 'rgba(52, 199, 89, 0.1)' : item.status === 'pendiente' ? 'rgba(240, 180, 58, 0.1)' : 'rgba(74, 163, 255, 0.1)',
                         color: item.status === 'finalizado' ? '#34c759' : item.status === 'pendiente' ? '#f0b43a' : '#4aa3ff'
                    }}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  <td className="muted">{item.description || "-"}</td>
                  <td className="muted">{item.user_name || "Yo"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn secondary" type="button" onClick={() => startEdit(item)}>
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
  );
}

export default AgendaPage;
