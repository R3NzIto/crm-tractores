import { useEffect, useMemo, useState, useCallback } from "react"; // 👈 Importamos useCallback
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  const [location, setLocation] = useState(null); 
  const [gpsLoading, setGpsLoading] = useState(false);
  const [noteError, setNoteError] = useState("");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ localidad: "", sector: "", assigned: "" });
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

  // ✅ CORRECCIÓN: useCallback para loadCustomers
  const loadCustomers = useCallback(async (force = false) => {
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
  }, [token]);

  // ✅ CORRECCIÓN: useCallback para loadUsers y eliminado 'err' no usado
  const loadUsers = useCallback(async () => {
    if (!isManager) return;
    try {
      const data = await getUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // silenciar error para empleados (ya no usamos variable 'err')
    }
  }, [token, isManager]);

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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización");
      return;
    }
    setGpsLoading(true);
    setNoteError("");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setGpsLoading(false);
        alert("No se pudo obtener ubicación. Verifica permisos.");
      },
      { enableHighAccuracy: true }
    );
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
        latitude: location?.lat || null,
        longitude: location?.lng || null
      });
      setNoteForm({ texto: "", fecha_visita: "", proximos_pasos: "" });
      setLocation(null);
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

  // ✅ CORRECCIÓN: Agregadas funciones a dependencias
  useEffect(() => {
    if (!token) {
      logoutAndRedirect("/");
      return;
    }
    loadCustomers();
    loadUsers();
  }, [token, loadCustomers, loadUsers]);

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

  const localidadOptions = useMemo(() => {
    return Array.from(
      new Set(customers.map((c) => (c.localidad || "").trim()).filter(Boolean))
    ).sort();
  }, [customers]);

  const sectorOptions = useMemo(() => {
    return Array.from(new Set(customers.map((c) => (c.sector || "").trim()).filter(Boolean))).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filters.localidad && c.localidad !== filters.localidad) return false;
      if (filters.sector && c.sector !== filters.sector) return false;
      if (filters.assigned && String(c.assigned_to || "") !== filters.assigned) return false;
      if (!query) return true;
      const haystack = [c.name, c.email, c.company, c.localidad, c.sector, c.phone, c.assigned_to_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, filters, search]);

  const clearFilters = () => {
    setSearch("");
    setFilters({ localidad: "", sector: "", assigned: "" });
  };

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
        <h2 style={{ margin: 0 }}>Gestión de Clientes</h2>
        <span className="tag">
           {customerCounts.total} Clientes · {customerCounts.conCorreo} con Email
        </span>
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
          <span className="tag">
            {isManager ? "Vista Admin" : "Mis Asignados"}
          </span>
        </div>

        <div className="toolbar" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar por nombre, correo, empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220, maxWidth: 320 }}
          />
          <select
            value={filters.localidad}
            onChange={(e) => setFilters({ ...filters, localidad: e.target.value })}
          >
            <option value="">Localidad</option>
            {localidadOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <select
            value={filters.sector}
            onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
          >
            <option value="">Sector/rol</option>
            {sectorOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
          {isManager && (
            <select
              value={filters.assigned}
              onChange={(e) => setFilters({ ...filters, assigned: e.target.value })}
            >
              <option value="">Asignado</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn secondary" onClick={clearFilters}>
            Limpiar filtros
          </button>
          <span className="muted small">
            Mostrando {filteredCustomers.length} de {customers.length}
          </span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Telefono</th>
                <th>Empresa</th>
                <th>Localidad</th>
                <th>Sector</th>
                <th>Asignado</th>
                <th style={{ width: 240 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td className="muted">{c.email || "Sin correo"}</td>
                  <td className="muted">{c.phone || "-"}</td>
                  <td className="muted">{c.company || "-"}</td>
                  <td>{c.localidad || "Sin localidad"}</td>
                  <td>{c.sector || "Sin sector"}</td>
                  <td className="muted">{c.assigned_to_name || c.created_by_name || "Sin asignar"}</td>
                  <td>
                    <div className="table-actions">
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
                          style={{ width: '110px' }}
                        >
                          <option value="">Asignar...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
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

        {/* --- SECCIÓN HISTORIAL DE CLIENTE --- */}
        {notesCustomer && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-header" style={{ marginBottom: 4 }}>
              <div>
                <p className="muted" style={{fontSize:'0.8rem', textTransform:'uppercase'}}>Historial de Actividad</p>
                <h3 style={{ margin: "2px 0 0" }}>{notesCustomer.name}</h3>
              </div>
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <button className="btn secondary" type="button" onClick={() => loadNotes(notesCustomer)}>
                  Actualizar
                </button>
                <button className="btn ghost" type="button" onClick={() => setNotesCustomer(null)}>
                  Cerrar
                </button>
              </div>
            </div>

            <form onSubmit={submitNote} className="form-grid compact">
              <input
                type="datetime-local"
                value={noteForm.fecha_visita}
                onChange={(e) => setNoteForm({ ...noteForm, fecha_visita: e.target.value })}
              />
              <textarea
                placeholder="Detalles de la visita, acuerdos, contexto"
                value={noteForm.texto}
                onChange={(e) => setNoteForm({ ...noteForm, texto: e.target.value })}
                rows={2}
              />
              <input
                type="text"
                placeholder="Proximos pasos"
                value={noteForm.proximos_pasos}
                onChange={(e) => setNoteForm({ ...noteForm, proximos_pasos: e.target.value })}
              />
              
              {/* --- BOTÓN GPS --- */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn secondary"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  style={{width: 'auto', background: location ? 'rgba(52, 199, 89, 0.2)' : undefined, color: location ? '#34c759' : undefined, border: location ? '1px solid #34c759' : undefined}}
                >
                  {gpsLoading ? "📡 Buscando..." : location ? "✅ Ubicación Lista" : "📍 Registrar Ubicación Actual (GPS)"}
                </button>
              </div>
              {/* ----------------- */}

              <div className="toolbar">
                <button className="btn" type="submit" disabled={notesLoading || gpsLoading}>
                  Agregar nota
                </button>
              </div>
            </form>

            {noteError && <p className="error">{noteError}</p>}

            <div style={{ marginTop: 20 }}>
              {notes.length === 0 && !notesLoading ? (
                <p className="muted">Aún no hay historial de actividad para este cliente.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                  {notes.map((note) => (
                    <div key={note.id} style={{ background:'rgba(255,255,255,0.03)', padding:'15px', borderRadius:'8px', borderLeft:'3px solid var(--primary)', border:'1px solid var(--border-color)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px', alignItems:'center' }}>
                         <div>
                           <span className="tag" style={{marginRight: '10px'}}>{note.user_name || "Equipo"}</span>
                           <span className="muted small">{formatDateTime(note.created_at)}</span>
                         </div>
                         {(isManager || note.user_id === user?.id) && (
                            <button
                              className="btn danger"
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            >
                              Eliminar
                            </button>
                          )}
                      </div>
                      
                      <p style={{ margin: "0 0 10px", fontSize:'1rem' }}>{note.texto}</p>
                      
                      {note.proximos_pasos && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding:'8px', borderRadius:'4px', marginBottom:'10px' }}>
                          <small className="muted">Próximos pasos:</small>
                          <div style={{fontSize:'0.9rem'}}>{note.proximos_pasos}</div>
                        </div>
                      )}
                      
                      {/* --- MAPA EMBEBIDO (LEAFLET) --- */}
                      {note.latitude && note.longitude && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #444' }}>
                          <MapContainer 
                            center={[parseFloat(note.latitude), parseFloat(note.longitude)]} 
                            zoom={15} 
                            scrollWheelZoom={false} // Para no hacer zoom sin querer al scrollear la pagina
                            style={{ height: "200px", width: "100%" }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={[parseFloat(note.latitude), parseFloat(note.longitude)]}>
                              <Popup>
                                Ubicación registrada de visita.
                              </Popup>
                            </Marker>
                          </MapContainer>
                          <div style={{ padding: '5px 10px', background: '#222', fontSize: '0.8rem', color: '#888' }}>
                            📍 Ubicación registrada: {note.latitude}, {note.longitude}
                          </div>
                        </div>
                      )}
                      {/* --------------------------------- */}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <h4 style={{ margin: "8px 0" }}>Resumen por Sector</h4>
          <div className="toolbar">
            {Object.entries(customerCounts.porSector).map(([sector, count]) => (
              <span key={sector} className="tag">
                {sector}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomersPage;