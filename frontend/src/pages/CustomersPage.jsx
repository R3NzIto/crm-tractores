import { useEffect, useMemo, useState } from "react";
import {
  assignCustomer,
  createCustomer,
  deleteCustomer,
  getCustomers,
  getUsers,
  importCustomers,
  getCustomerNotes,
  createCustomerNote,
  deleteCustomerNote,
  logoutAndRedirect,
  updateCustomer,
} from "../api";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

const MANAGER_ROLES = ["admin", "manager", "jefe"];
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "Sin fecha");

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    localidad: "",
    sector: "",
    assigned_to: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notesCustomer, setNotesCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteForm, setNoteForm] = useState({
    texto: "",
    fecha_visita: "",
    proximos_pasos: "",
  });
  const [noteError, setNoteError] = useState("");
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isManager = MANAGER_ROLES.includes(user?.role);
  const canCreate = true;
  const canEditExisting = true;
  const canImport = true;

  const handleApiError = (err) => {
    if (err?.unauthorized) {
      setError(err.message || "Sesion expirada");
      setTimeout(() => logoutAndRedirect("/"), 600);
      return;
    }
    setError(err?.message || "No pudimos completar la operacion");
  };

  const loadCustomers = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await getCustomers(token, { force });
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!isManager) return;
    try {
      const data = await getUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      // silenciar error para empleados
    }
  };

  const loadNotes = async (customer) => {
    if (!customer) return;
    setNotesCustomer(customer);
    setNotesLoading(true);
    setNoteError("");
    try {
      const data = await getCustomerNotes(token, customer.id);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setNoteError(err?.message || "No pudimos cargar notas");
    } finally {
      setNotesLoading(false);
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!notesCustomer) return;
    setNoteError("");
    if (!noteForm.texto.trim()) {
      setNoteError("La nota no puede estar vacia");
      return;
    }
    try {
      await createCustomerNote(token, notesCustomer.id, {
        texto: noteForm.texto,
        fecha_visita: noteForm.fecha_visita
          ? new Date(noteForm.fecha_visita).toISOString()
          : null,
        proximos_pasos: noteForm.proximos_pasos,
      });
      setNoteForm({ texto: "", fecha_visita: "", proximos_pasos: "" });
      await loadNotes(notesCustomer);
    } catch (err) {
      setNoteError(err?.message || "No pudimos guardar la nota");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!notesCustomer) return;
    const confirmed = window.confirm("¿Eliminar esta nota?");
    if (!confirmed) return;
    try {
      await deleteCustomerNote(token, notesCustomer.id, noteId);
      await loadNotes(notesCustomer);
    } catch (err) {
      setNoteError(err?.message || "No pudimos eliminar la nota");
    }
  };

  useEffect(() => {
    if (!token) {
      logoutAndRedirect("/");
      return;
    }
    loadCustomers();
    loadUsers();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    try {
      const payload = { ...form };
      if (!isManager) {
        delete payload.assigned_to;
      } else if (!payload.assigned_to) {
        // si jefe no selecciona, asigna a sí mismo
        payload.assigned_to = user?.id;
      }

      if (editingId) {
        await updateCustomer(token, editingId, payload);
      } else {
        await createCustomer(token, payload);
      }
      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        localidad: "",
        sector: "",
        assigned_to: "",
      });
      setEditingId(null);
      await loadCustomers(true);
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    const customer = customers.find((c) => c.id === id);
    const label = customer?.name || "este cliente";
    const confirmed = window.confirm(`Seguro que quieres eliminar ${label}?`);
    if (!confirmed) return;

    try {
      await deleteCustomer(token, id);
      await loadCustomers(true);
    } catch (err) {
      handleApiError(err);
    }
  };

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      localidad: customer.localidad || "",
      sector: customer.sector || "",
      assigned_to: customer.assigned_to || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      localidad: "",
      sector: "",
      assigned_to: "",
    });
  };

  const handleAssign = async (customerId, userId) => {
    try {
      await assignCustomer(token, customerId, userId);
      await loadCustomers(true);
    } catch (err) {
      handleApiError(err);
    }
  };

  const customerCounts = useMemo(() => {
    const total = customers.length;
    const conCorreo = customers.filter((c) => c.email).length;
    const porSector = customers.reduce((acc, c) => {
      const key = c.sector || "Sin sector";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const porLocalidad = customers.reduce((acc, c) => {
      const key = c.localidad || "Sin localidad";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, conCorreo, porSector, porLocalidad };
  }, [customers]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setImporting(true);
    try {
      await importCustomers(token, file);
      await loadCustomers(true);
    } catch (err) {
      handleApiError(err);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const isEditing = Boolean(editingId);
  const canSubmit = isEditing ? canEditExisting : canCreate;

  return (
    <div className="page">
      <div className="page-header">
        <div className="brand">
          <img src={logoWolfHard} alt="Wolf Hard" className="brand-logo" />
          <div>
            Clientes
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              CRM Tractores - gestion de cartera por localidad y rol
            </div>
          </div>
        </div>
        <div className="toolbar">
          <span className="tag">
            {customerCounts.total} clientes · {customerCounts.conCorreo} con correo
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
          <h3 style={{ margin: 0 }}>{editingId ? "Editar cliente" : "Nuevo cliente / Importar"}</h3>
          <div className="toolbar">
            <button className="btn secondary" onClick={() => loadCustomers(true)} disabled={loading}>
              Recargar
            </button>
            {canImport && (
              <label className="btn" style={{ cursor: "pointer" }}>
                Importar Excel/CSV
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  disabled={importing}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        </div>

        {!canSubmit && (
          <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
            Tu rol no permite editar este registro.
          </p>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          <input
            type="email"
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          <input
            type="text"
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          <input
            type="text"
            placeholder="Empresa"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          <input
            type="text"
            placeholder="Localidad (ej: Guaymallen, Lujan, Valle de Uco)"
            value={form.localidad}
            onChange={(e) => setForm({ ...form, localidad: e.target.value })}
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          <input
            type="text"
            placeholder="Sector (rol: comprador, ventas, taller, repuestos)"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
            disabled={isEditing ? !canEditExisting : !canCreate}
          />
          {isManager && (
            <select
              value={form.assigned_to || ""}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            >
              <option value="">Asignar a...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          )}
          <div className="toolbar">
            <button className="btn" type="submit" disabled={loading || !canSubmit}>
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
        {loading && <p className="muted">Cargando clientes...</p>}
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Listado</h3>
          <span className="pill">
            Jefe/admin ve todo · Empleado gestiona propios y asignados
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Telefono</th>
                <th>Empresa</th>
                <th>Localidad</th>
                <th>Sector (rol)</th>
                <th>Asignado</th>
                <th style={{ width: 240 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td className="muted">{c.email || "Sin correo"}</td>
                  <td className="muted">{c.phone || "-"}</td>
                  <td className="muted">{c.company || "-"}</td>
                  <td>{c.localidad || "Sin localidad"}</td>
                  <td>{c.sector || "Sin sector"}</td>
                  <td className="muted">
                    {c.assigned_to_name || c.created_by_name || "Sin asignar"}
                  </td>
                  <td>
                    <div className="table-actions" style={{ gap: 6 }}>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={!canEditExisting}
                      >
                        Editar
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={!canEditExisting}
                  >
                    Eliminar
                  </button>
                  <button className="btn ghost" type="button" onClick={() => loadNotes(c)}>
                    Notas
                  </button>
                  {isManager && (
                    <select
                      value={c.assigned_to || ""}
                      onChange={(e) => handleAssign(c.id, e.target.value)}
                    >
                          <option value="">Asignar...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan="9" className="muted">
                    No hay clientes cargados aun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {notesCustomer && (
          <div className="card lift" style={{ marginTop: 12 }}>
            <div className="card-header" style={{ marginBottom: 4 }}>
              <div>
                <p className="eyebrow">Notas del cliente</p>
                <h3 style={{ margin: "2px 0 0" }}>{notesCustomer.name}</h3>
              </div>
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <span className="tag">
                  {notes.length} notas �� {notesLoading ? "cargando" : "listo"}
                </span>
                <button className="btn secondary" type="button" onClick={() => loadNotes(notesCustomer)}>
                  Actualizar
                </button>
                <button className="btn ghost" type="button" onClick={() => setNotesCustomer(null)}>
                  Cerrar
                </button>
              </div>
            </div>

            <form onSubmit={submitNote} className="form-grid compact fade-in">
              <input
                type="datetime-local"
                value={noteForm.fecha_visita}
                onChange={(e) => setNoteForm({ ...noteForm, fecha_visita: e.target.value })}
                placeholder="Fecha/hora de visita"
              />
              <textarea
                className="textarea"
                placeholder="Detalles de la visita, acuerdos, contexto"
                value={noteForm.texto}
                onChange={(e) => setNoteForm({ ...noteForm, texto: e.target.value })}
                rows={3}
              />
              <input
                type="text"
                placeholder="Proximos pasos / compromisos"
                value={noteForm.proximos_pasos}
                onChange={(e) => setNoteForm({ ...noteForm, proximos_pasos: e.target.value })}
              />
              <div className="toolbar">
                <button className="btn" type="submit" disabled={notesLoading}>
                  Agregar nota
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setNoteForm({ texto: "", fecha_visita: "", proximos_pasos: "" })}
                >
                  Limpiar
                </button>
              </div>
            </form>

            {noteError && <p className="error">{noteError}</p>}
            {notesLoading && <p className="muted">Cargando notas...</p>}

            <div style={{ marginTop: 10 }}>
              {notes.length === 0 && !notesLoading ? (
                <p className="muted">Aún no hay notas para este cliente.</p>
              ) : (
                <div className="timeline">
                  {notes.map((note) => (
                    <div key={note.id} className="timeline-item fade-in">
                      <div className="timeline-meta">
                        <span className="status-chip info">{note.user_name || "Equipo"}</span>
                        <span className="muted small">{formatDateTime(note.created_at)}</span>
                        {note.fecha_visita && (
                          <span className="status-chip warning">
                            Visita: {formatDateTime(note.fecha_visita)}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "6px 0 4px" }}>{note.texto}</p>
                      {note.proximos_pasos && (
                        <p className="muted small" style={{ margin: "0 0 6px" }}>
                          Próximos pasos: {note.proximos_pasos}
                        </p>
                      )}
                      {(isManager || note.user_id === user?.id) && (
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <h4 style={{ margin: "8px 0" }}>Distribucion por sector (rol)</h4>
          <div className="toolbar">
            {Object.entries(customerCounts.porSector).map(([sector, count]) => (
              <span key={sector} className="tag">
                {sector}: {count}
              </span>
            ))}
          </div>
          <h4 style={{ margin: "8px 0" }}>Distribucion por localidad</h4>
          <div className="toolbar">
            {Object.entries(customerCounts.porLocalidad).map(([loc, count]) => (
              <span key={loc} className="tag">
                {loc}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomersPage;
