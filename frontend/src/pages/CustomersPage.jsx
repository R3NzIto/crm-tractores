import { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
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
  getCustomerUnits,
  createCustomerUnit,
  updateCustomerUnit,
  deleteCustomerUnit,
  deleteCustomersBatch
} from "../api";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MANAGER_ROLES = ["admin", "manager"];
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}) : "Sin fecha");

const HP_OPTIONS = [];
for (let i = 50; i <= 400; i += 5) {
  HP_OPTIONS.push(i);
}

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", localidad: "", sector: "", assigned_to: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  
  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- NOTAS Y ACCIONES ---
  const [notesCustomer, setNotesCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteForm, setNoteForm] = useState({ texto: "", proximos_pasos: "" });
  const [location, setLocation] = useState(null); 
  const [gpsLoading, setGpsLoading] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [actionType, setActionType] = useState('CALL'); 

  // --- UNIDADES (TRACTORES) ---
  const [unitsCustomer, setUnitsCustomer] = useState(null);
  const [units, setUnits] = useState([]);
  
  const [allTractorModels, setAllTractorModels] = useState([]); 
  const [tractorBrands, setTractorBrands] = useState([]); 
  const [filteredModels, setFilteredModels] = useState([]); 
  const [wolfHardModels, setWolfHardModels] = useState([]); 

  const [unitForm, setUnitForm] = useState({ 
    brand: "", 
    model: "", 
    year: "", 
    hp: "", 
    hours: "",      
    comments: "",   
    interventions: "", 
    intervention_date: "",
    origin: "TERCEROS",
    status: "EN_USO"
  });
  
  const [newIntervention, setNewIntervention] = useState({ date: "", text: "" });
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);

  const [search, setSearch] = useState("");
  const [machineSearch, setMachineSearch] = useState(""); 
  const [filters, setFilters] = useState({ localidad: "", sector: "", assigned: "" });
  
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

  // 1. Carga Inicial de Modelos
  useEffect(() => {
    fetch(`${API_URL}/api/models`) 
      .then(res => res.json())
      .then(data => {
        setAllTractorModels(data);
        const uniqueBrands = [...new Set(data.map(item => item.brand))].sort();
        setTractorBrands(uniqueBrands);
        const whModels = data.filter(m => m.brand === 'Wolf Hard');
        setWolfHardModels(whModels);
      })
      .catch(err => console.error("Error cargando modelos:", err));
  }, []);

  // 2. Filtro de Clientes (useMemo) - Aquí estaba el error de duplicado
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filters.localidad && c.localidad !== filters.localidad) return false;
      if (filters.sector && c.sector !== filters.sector) return false;
      if (filters.assigned && String(c.assigned_to || "") !== filters.assigned) return false;
      if (!q) return true;
      return [c.name, c.email, c.company, c.localidad, c.sector].join(" ").toLowerCase().includes(q);
    });
  }, [customers, filters, search]);

  // --- LÓGICA DE SELECCIÓN MÚLTIPLE ---
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredCustomers.map(c => c.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`⚠️ ¿Estás seguro de ELIMINAR ${selectedIds.length} clientes seleccionados?\nEsta acción no se puede deshacer.`)) return;
    
    setLoading(true);
    try {
      await deleteCustomersBatch(selectedIds);
      setSelectedIds([]); 
      await loadCustomers(); // Recarga sin filtros para actualizar la lista
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS DE FORMULARIOS ---

  const handleBrandChange = (e) => {
    const selectedBrand = e.target.value;
    const models = allTractorModels.filter(m => m.brand === selectedBrand);
    setFilteredModels(models);
    setUnitForm({ ...unitForm, brand: selectedBrand, model: "" });
  };

  const handleOriginChange = (newOrigin) => {
    if (newOrigin === 'WOLF_HARD') {
        setUnitForm({ ...unitForm, origin: 'WOLF_HARD', brand: 'Wolf Hard', model: '' });
    } else {
        setUnitForm({ ...unitForm, origin: 'TERCEROS', brand: '', model: '' });
        setFilteredModels([]);
    }
  };

  // Función loadCustomers CORREGIDA para no borrar la lista al actualizar
  const loadCustomers = useCallback(async ( machineFilter = "") => {
    setLoading(true);
    setError("");
    try {
      // Si machineFilter es booleano (true/false), lo ignoramos y usamos string vacio
      const filter = typeof machineFilter === 'string' ? machineFilter : "";
      const data = await getCustomers({ machine: filter });
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMachineSearch = () => {
    loadCustomers(machineSearch);
  };

  const loadUsers = useCallback(async () => {
    if (!isManager) return;
    try {
      const data = await getUsers(null);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) { console.error("Error users", error); }
  }, [isManager]);

  const loadNotes = async (customer) => {
    if (!customer || customer.id === undefined || customer.id === null) return;
    const cid = Number(customer.id);
    if (Number.isNaN(cid)) {
      console.warn('loadNotes: customer id inválido', customer);
      return;
    }
    setUnitsCustomer(null); 
    setNotesCustomer(customer);
    setNotesLoading(true);
    setNoteError("");
    setActionType('CALL');
    setLocation(null);
    setOpenMenuId(null); 
    try {
      const data = await getCustomerNotes(cid);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setNoteError(err?.message || "No pudimos cargar acciones");
    } finally {
      setNotesLoading(false);
    }
  };

  const loadUnits = async (customer) => {
    if (!customer) return;
    setNotesCustomer(null); 
    setUnitsCustomer(customer);
    setUnitsLoading(true);
    setEditingUnitId(null);
    setUnitForm({ brand: "", model: "", year: "", hp: "", hours: "", comments: "", interventions: "", intervention_date: "", origin: "TERCEROS" });
    setNewIntervention({ date: "", text: "" });
    setOpenMenuId(null); 
    try {
      const data = await getCustomerUnits(customer.id);
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setUnitsLoading(false);
    }
  };

  const startEditUnit = (unit) => {
    setEditingUnitId(unit.id);
    const detectedOrigin = unit.brand === 'Wolf Hard' ? 'WOLF_HARD' : 'TERCEROS';

    if (detectedOrigin === 'TERCEROS') {
        const models = allTractorModels.filter(m => m.brand === unit.brand);
        setFilteredModels(models);
    }

    setUnitForm({
      brand: unit.brand || "",
      model: unit.model || "",
      year: unit.year || "",
      hp: unit.hp || "",
      hours: unit.hours || "",       
      comments: unit.comments || "", 
      interventions: unit.interventions || "",
      intervention_date: unit.intervention_date ? unit.intervention_date.split('T')[0] : "",
      origin: detectedOrigin
    });
    setNewIntervention({ date: new Date().toISOString().split('T')[0], text: "" });
  };

  const cancelEditUnit = () => {
    setEditingUnitId(null);
    setUnitForm({ brand: "", model: "", year: "", hp: "", hours: "", comments: "", interventions: "", intervention_date: "", origin: "TERCEROS" });
    setNewIntervention({ date: "", text: "" });
    setFilteredModels([]);
  };

  const addToHistory = () => {
    if (!newIntervention.date || !newIntervention.text.trim()) {
      alert("Completa fecha y detalle para agregar al historial.");
      return;
    }
    const dateObj = new Date(newIntervention.date + "T12:00:00");
    const dateStr = dateObj.toLocaleDateString();
    const newLine = `${dateStr}: ${newIntervention.text}`;
    const currentHistory = unitForm.interventions || "";
    const updatedHistory = currentHistory ? `${currentHistory}\n${newLine}` : newLine;

    setUnitForm({ 
      ...unitForm, 
      interventions: updatedHistory,
      intervention_date: newIntervention.date 
    });
    setNewIntervention({ ...newIntervention, text: "" });
  };

  const submitUnit = async (e) => {
    e.preventDefault();
    if (!unitsCustomer) return;
    if (!unitForm.brand || !unitForm.model) return alert("Marca y Modelo son obligatorios");
    
    setUnitsLoading(true); 
    try {
      const payload = {
        ...unitForm,
        year: unitForm.year ? Number(unitForm.year) : null,
        hp: unitForm.hp ? Number(unitForm.hp) : null,
        hours: unitForm.hours ? Number(unitForm.hours) : 0,
        status: unitForm.status || 'EN_USO',
        intervention_date: unitForm.intervention_date ? unitForm.intervention_date : null,
      };
      if (Number.isNaN(payload.year)) payload.year = null;
      if (Number.isNaN(payload.hp)) payload.hp = null;
      if (Number.isNaN(payload.hours)) payload.hours = 0;

      if (editingUnitId) {
        await updateCustomerUnit(unitsCustomer.id, editingUnitId, payload);
      } else {
        await createCustomerUnit(unitsCustomer.id, payload);
      }
      setUnitForm({ brand: "", model: "", year: "", hp: "", hours: "", comments: "", interventions: "", intervention_date: "", origin: "TERCEROS", status: "EN_USO" });
      setNewIntervention({ date: "", text: "" });
      setEditingUnitId(null);
      await loadUnits(unitsCustomer);
    } catch (err) {
      console.error(err);
      alert("Error al guardar unidad");
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm("¿Eliminar esta unidad?")) return;
    try {
      await deleteCustomerUnit(unitsCustomer.id, unitId);
      await loadUnits(unitsCustomer);
    } catch (err) {
      console.error(err);
      alert("Error eliminando unidad");
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert("Tu navegador no soporta geolocalización"); return; }
    setGpsLoading(true); setNoteError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsLoading(false); },
      (err) => { console.error(err); setGpsLoading(false); setNoteError("⚠️ Error GPS."); },
      { enableHighAccuracy: true }
    );
  };

  const switchToAction = (type) => { 
    setActionType(type); 
    setNoteError(""); 
    if (type === 'VISIT' && !location) handleGetLocation(); 
  };

  const submitNote = async (e) => {
    e.preventDefault(); 
    if (!notesCustomer) return; 
    setNoteError("");
    if (!noteForm.texto.trim()) { setNoteError("Debes escribir detalles"); return; }
    if (actionType === 'VISIT' && !location) { setNoteError("⚠️ Esperando GPS..."); return; }
    try {
      await createCustomerNote(notesCustomer.id, {
        texto: noteForm.texto, 
        proximos_pasos: noteForm.proximos_pasos,
        latitude: actionType === 'VISIT' ? location?.lat : null,
        longitude: actionType === 'VISIT' ? location?.lng : null,
        action_type: actionType
      });
      setNoteForm({ texto: "", proximos_pasos: "" }); 
      setLocation(null); 
      setActionType('CALL'); 
      await loadNotes(notesCustomer);
    } catch (err) { 
      setNoteError(err?.message || "Error al guardar"); 
    }
  };

  const handleDeleteNote = async (nid) => { 
    if (!window.confirm("¿Eliminar?")) return; 
    try { 
      await deleteCustomerNote(notesCustomer.id, nid); 
      await loadNotes(notesCustomer); 
    } catch (err) { 
      console.error(err);
      setNoteError("Error eliminando"); 
    } 
  };
  
  // 3. Inicialización
  useEffect(() => { 
    loadCustomers(); 
    loadUsers(); 
  }, [loadCustomers, loadUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(""); 
    if (!form.name.trim()) { setError("Nombre obligatorio"); return; }
    try {
      const payload = { ...form };
      if (!isManager) delete payload.assigned_to;
      else if (!payload.assigned_to) payload.assigned_to = user?.id;
      
      if (editingId) await updateCustomer(editingId, payload); 
      else await createCustomer(payload);
      
      setForm({ name: "", email: "", phone: "", company: "", localidad: "", sector: "", assigned_to: "" }); 
      setEditingId(null); 
      await loadCustomers(); // Recargar lista
    } catch (err) { handleApiError(err); }
  };

  const handleDelete = async (id) => { 
    if (!window.confirm("¿Eliminar cliente?")) return; 
    try { 
      await deleteCustomer(id); 
      await loadCustomers(); // Recargar lista
    } catch (err) { handleApiError(err); } 
  };

  const startEdit = (c) => { 
    setEditingId(c.id); 
    setForm({ 
      name: c.name||"", email: c.email||"", phone: c.phone||"", 
      company: c.company||"", localidad: c.localidad||"", sector: c.sector||"", 
      assigned_to: c.assigned_to||"" 
    }); 
    setOpenMenuId(null); 
  };

  const cancelEdit = () => { 
    setEditingId(null); 
    setForm({ name: "", email: "", phone: "", company: "", localidad: "", sector: "", assigned_to: "" }); 
  };

  const handleAssign = async (cId, uId) => { 
    try { 
      await assignCustomer(cId, uId); 
      setCustomers(prevCustomers => prevCustomers.map(customer => {
        if (customer.id === cId) {
          return { ...customer, assigned_to: uId ? parseInt(uId) : null };
        }
        return customer; 
      }));
      setOpenMenuId(null); 
    } catch (err) { 
      handleApiError(err); 
      loadCustomers(); // Recargar lista
    } 
  };

  const handleImport = async (e) => { 
    const f = e.target.files?.[0]; 
    if (!f) return; 
    setError(""); 
    setImporting(true); 
    try { 
      await importCustomers(null, f); 
      await loadCustomers(); // Recargar lista
    } catch (err) { handleApiError(err); } 
    finally { setImporting(false); e.target.value = ""; } 
  };

  const toggleMenu = (id) => {
    if (openMenuId === id) setOpenMenuId(null);
    else setOpenMenuId(id);
  };

  const customerCounts = useMemo(() => {
    const total = customers.length; const conCorreo = customers.filter((c) => c.email).length;
    const porSector = customers.reduce((acc, c) => { const k = c.sector || "Sin sector"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    return { total, conCorreo, porSector };
  }, [customers]);

  const localidadOptions = useMemo(() => Array.from(new Set(customers.map((c) => (c.localidad || "").trim()).filter(Boolean))).sort(), [customers]);
  const sectorOptions = useMemo(() => Array.from(new Set(customers.map((c) => (c.sector || "").trim()).filter(Boolean))).sort(), [customers]);
  
  const clearFilters = () => { setSearch(""); setFilters({ localidad: "", sector: "", assigned: "" }); };
  const isEditing = Boolean(editingId); 
  const canSubmit = isEditing ? canEditExisting : canCreate;

  return (
    <div className="page" onClick={() => setOpenMenuId(null)}>

      <div className="page-header">
        <h2 style={{ margin: 0 }}>Gestión de Clientes</h2>
        <span className="tag">{customerCounts.total} Clientes</span>
      </div>

      {/* --- FORMULARIO DE CLIENTES (ARRIBA) --- */}
      <div className="card" style={{ marginBottom: 14 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px" }}>{editingId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
        {!canSubmit && <p className="muted" style={{marginTop:0}}>Tu rol no permite crear/editar clientes.</p>}
        <form onSubmit={handleSubmit} className="form-grid">
          <input type="text" placeholder="Nombre" value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} required />
          <input type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} />
          <input type="text" placeholder="Telefono" value={form.phone} onChange={(e) => setForm({...form, phone:e.target.value})} />
          <input type="text" placeholder="Empresa" value={form.company} onChange={(e) => setForm({...form, company:e.target.value})} />
          <input type="text" placeholder="Localidad" value={form.localidad} onChange={(e) => setForm({...form, localidad:e.target.value})} />
          <input type="text" placeholder="Sector" value={form.sector} onChange={(e) => setForm({...form, sector:e.target.value})} />
          {isManager && <select value={form.assigned_to || ""} onChange={(e) => setForm({...form, assigned_to:e.target.value})}><option value="">Asignar a...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
          <div className="toolbar">
            <button className="btn" type="submit" disabled={loading || !canSubmit}>{editingId ? "Guardar Cambios" : "Agregar"}</button>
            {editingId && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancelar</button>}
             {canImport && <label className="btn secondary" style={{ cursor: "pointer", marginLeft:'auto' }}>Importar Excel <input type="file" accept=".csv,.xlsx" onChange={handleImport} disabled={importing} style={{ display: "none" }} /></label>}
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      {/* --- LISTADO DE CLIENTES --- */}
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <div className="page-header" style={{ marginBottom: 6 }}>
           <h3 style={{margin:0}}>Listado</h3>
           <div className="machine-search">
             <input 
               className="machine-search__input"
               type="text" 
               placeholder="🔍 Buscar por Maquinaria..." 
               value={machineSearch} 
               onChange={(e) => setMachineSearch(e.target.value)} 
               onKeyDown={(e) => e.key === 'Enter' && handleMachineSearch()} 
             />
             <button className="btn machine-search__btn" style={{background:'#f0b43a', color:'#000'}} onClick={handleMachineSearch}>Buscar</button>
             {machineSearch && <button className="btn secondary" onClick={() => {setMachineSearch(""); loadCustomers("");}}>X</button>}
           </div>
        </div>

        <div className="toolbar" style={{gap:8, flexWrap:'wrap', alignItems:'center'}}>
           {/* BOTÓN DE BORRADO MASIVO */}
           {selectedIds.length > 0 && (
             <button 
               className="btn danger" 
               onClick={handleBulkDelete}
               style={{ marginRight: '10px', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)', fontWeight:'bold' }}
             >
               🗑️ Eliminar ({selectedIds.length}) seleccionados
             </button>
           )}

           <input type="text" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
           <select value={filters.localidad} onChange={(e) => setFilters({ ...filters, localidad: e.target.value })}><option value="">Localidad</option>{localidadOptions.map(l => <option key={l} value={l}>{l}</option>)}</select>
           <select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })}><option value="">Sector</option>{sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
           <button className="btn secondary" onClick={clearFilters}>Limpiar Filtros</button>
        </div>
        
        <div className="table-wrapper" style={{minHeight: '250px'}}>
          <table>
            <thead>
              <tr>
                {/* CHECKBOX SELECT ALL */}
                <th style={{width: 40, textAlign:'center'}}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    style={{cursor:'pointer', transform:'scale(1.2)'}}
                  />
                </th>
                <th>ID</th><th>Nombre</th><th>Teléfono</th><th>Localidad</th><th>Sector</th><th style={{width: 120}}>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id} style={{background: selectedIds.includes(c.id) ? 'rgba(240, 180, 58, 0.1)' : 'transparent'}}>
                  {/* CHECKBOX INDIVIDUAL */}
                  <td style={{textAlign:'center'}}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(c.id)}
                      onChange={() => handleSelectOne(c.id)}
                      style={{cursor:'pointer', transform:'scale(1.2)'}}
                    />
                  </td>
                  <td>{c.id}</td><td>{c.name}</td><td className="muted">{c.phone || "-"}</td><td>{c.localidad||"-"}</td><td>{c.sector||"-"}</td>
                  
                  <td style={{position: 'relative'}}>
                      <button className="btn secondary" onClick={(e) => { e.stopPropagation(); toggleMenu(c.id); }} style={{width: '100%', display: 'flex', justifyContent: 'center', gap: '5px'}}>⚙️ ▼</button>
                      {openMenuId === c.id && (
                        <div style={{position: 'absolute', right: 0, top: '100%', background: '#222', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 100, minWidth: '160px', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                          <button className="btn ghost" style={{textAlign:'left', borderRadius:0, padding:'10px'}} onClick={() => startEdit(c)}>✏️ Editar Datos</button>
                          <button className="btn ghost" style={{textAlign:'left', borderRadius:0, padding:'10px'}} onClick={() => loadUnits(c)}>🚜 Ver Unidades</button>
                          <button className="btn ghost" style={{textAlign:'left', borderRadius:0, padding:'10px'}} onClick={() => loadNotes(c)}>📝 Notas/Visitas</button>
                          {isManager && (
                            <div style={{padding: '5px 10px', borderTop: '1px solid #333'}}>
                                <label style={{fontSize: '0.7rem', color:'#888'}}>Asignar a:</label>
                                <select value={c.assigned_to || ""} onChange={(e) => handleAssign(c.id, e.target.value)} style={{width: '100%', marginTop:2, fontSize:'0.8rem', padding:'2px'}} onClick={(e) => e.stopPropagation()}>
                                    <option value="">Nadie</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                          )}
                          <button className="btn danger" style={{textAlign:'left', borderRadius:0, padding:'10px', borderTop:'1px solid #333'}} onClick={() => handleDelete(c.id)}>🗑️ Eliminar</button>
                        </div>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- CENTRO DE UNIDADES --- */}
        {unitsCustomer && (
           <div className="card" style={{ marginTop: 20, border: '1px solid #f0b43a' }} onClick={(e) => e.stopPropagation()}>
             <div className="card-header" style={{ marginBottom: 10 }}>
              <div><p className="muted" style={{fontSize:'0.8rem', textTransform:'uppercase'}}>Parque de Maquinaria</p><h3 style={{ margin: "2px 0 0" }}>{unitsCustomer.name}</h3></div>
              <button className="btn ghost" onClick={() => setUnitsCustomer(null)}>Cerrar</button>
            </div>

            <form onSubmit={submitUnit} className="form-grid compact" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
              
              <div style={{gridColumn: '1 / -1', display: 'flex', gap: '20px', marginBottom: '5px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize:'0.9rem'}}>
                    <input type="radio" name="origin" value="TERCEROS" checked={unitForm.origin === 'TERCEROS'} onChange={() => handleOriginChange('TERCEROS')} />
                    <span>🏢 Unidad de Terceros</span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize:'0.9rem'}}>
                    <input type="radio" name="origin" value="WOLF_HARD" checked={unitForm.origin === 'WOLF_HARD'} onChange={() => handleOriginChange('WOLF_HARD')} />
                    <span style={{color: '#f0b43a', fontWeight: 'bold'}}>🐺 Unidad Wolf Hard</span>
                </label>
              </div>

              {unitForm.origin === 'WOLF_HARD' ? (
                <>
                    <input type="text" value="Wolf Hard" disabled style={{borderColor: '#f0b43a', color: '#f0b43a', fontWeight: 'bold'}} />
                    <select value={unitForm.model} onChange={e => setUnitForm({...unitForm, model: e.target.value})} required style={{borderColor: '#f0b43a'}}>
                        <option value="">-- Seleccionar Modelo --</option>
                        {wolfHardModels.map((m) => <option key={m.id} value={m.model}>{m.model}</option>)}
                    </select>
                </>
              ) : (
                <>
                    <select value={unitForm.brand} onChange={handleBrandChange} required>
                        <option value="">-- Marca --</option>
                        {tractorBrands.map((b, i) => <option key={i} value={b}>{b}</option>)}
                    </select>

                    <select value={unitForm.model} onChange={e => setUnitForm({...unitForm, model: e.target.value})} required disabled={!unitForm.brand}>
                        <option value="">-- Modelo --</option>
                        {filteredModels.map((m) => <option key={m.id} value={m.model}>{m.model}</option>)}
                    </select>
                </>
              )}

              <input type="number" placeholder="Año" value={unitForm.year} onChange={e => setUnitForm({...unitForm, year: e.target.value})} />
              <select value={unitForm.hp} onChange={e => setUnitForm({...unitForm, hp: e.target.value})}>
                <option value="">-- Potencia (HP) --</option>
                {HP_OPTIONS.map(hp => (
                    <option key={hp} value={hp}>{hp} HP</option>
                ))}
              </select>
              <input type="number" placeholder="Horas de Uso ⏱️" value={unitForm.hours} onChange={e => setUnitForm({...unitForm, hours: e.target.value})} style={{borderColor: '#f0b43a'}} />

              <textarea placeholder="Comentarios..." value={unitForm.comments} onChange={e => setUnitForm({...unitForm, comments: e.target.value})} style={{gridColumn: '1 / -1', minHeight: '60px', resize: 'vertical'}} />
              
              {unitForm.origin === 'WOLF_HARD' && (
                <div style={{gridColumn: '1 / -1', background:'rgba(240, 180, 58, 0.1)', border: '1px dashed #f0b43a', padding:10, borderRadius:6, marginTop:5}}>
                    <label style={{display:'block', fontSize:'0.9rem', color:'#f0b43a', marginBottom:'8px'}}>🛠️ Service / Mantenimiento Oficial</label>
                    <div style={{display:'flex', gap:10, marginBottom:10}}>
                      <input type="date" value={newIntervention.date} onChange={e => setNewIntervention({...newIntervention, date: e.target.value})} style={{width:'150px'}} />
                      <input type="text" placeholder="Detalle" value={newIntervention.text} onChange={e => setNewIntervention({...newIntervention, text: e.target.value})} style={{flex:1}} />
                      <button type="button" className="btn secondary" onClick={addToHistory} style={{whiteSpace:'nowrap'}}>Agregar (+)</button>
                    </div>
                    <textarea placeholder="Historial..." value={unitForm.interventions} onChange={e => setUnitForm({...unitForm, interventions: e.target.value})} style={{width:'100%', minHeight: '80px', fontFamily:'monospace', fontSize:'0.85rem'}} />
                </div>
              )}

              <div className="toolbar" style={{gridColumn: '1 / -1'}}>
                 <button className="btn" style={{background: '#f0b43a', color:'#000'}} type="submit" disabled={unitsLoading}>{unitsLoading ? "Guardando..." : (editingUnitId ? "💾 Guardar" : "➕ Agregar")}</button>
                 {editingUnitId && <button className="btn secondary" type="button" onClick={cancelEditUnit}>Cancelar Edición</button>}
              </div>
            </form>

            <div style={{marginTop: 20}}>
               {units.length === 0 ? <p className="muted">Sin unidades registradas.</p> : (
                 <div style={{display:'grid', gap:'10px'}}>
                    {units.map(unit => (
                      <div key={unit.id} style={{background: unit.origin === 'WOLF_HARD' ? 'rgba(240, 180, 58, 0.15)' : 'rgba(255,255,255,0.05)', borderLeft: unit.origin === 'WOLF_HARD' ? '4px solid #f0b43a' : '4px solid #666', padding: '10px 15px', borderRadius:'6px', display:'flex', flexDirection:'column', gap:'5px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                             <div>
                                <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', color: unit.origin === 'WOLF_HARD' ? '#f0b43a' : '#888'}}>{unit.origin === 'WOLF_HARD' ? '⭐ Wolf Hard' : '🏢 Terceros'}</div>
                                <strong style={{fontSize:'1.1rem', color:'white'}}>{unit.brand} <span style={{color: '#f0b43a'}}>{unit.model}</span></strong>
                                <span className="muted small" style={{marginLeft: 10}}>{unit.year ? `Año ${unit.year}` : ''} {unit.hp ? `• ${unit.hp} HP` : ''} {unit.hours ? ` • ⏱️ ${unit.hours} hs` : ''}</span>
                             </div>
                             <div style={{display:'flex', gap:5}}>
                                <button className="btn secondary" style={{padding: '5px 10px'}} onClick={() => startEditUnit(unit)}>✏️</button>
                                <button className="btn danger" style={{padding: '5px 10px'}} onClick={() => handleDeleteUnit(unit.id)}>X</button>
                             </div>
                          </div>
                          {unit.comments && <div style={{fontSize:'0.9rem', color:'#bbb', fontStyle:'italic'}}>"{unit.comments}"</div>}
                          {unit.origin === 'WOLF_HARD' && unit.interventions && (<div style={{marginTop: 5, padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px'}}><strong style={{display:'block', fontSize:'0.75rem', color:'#f0b43a', marginBottom:2}}>HISTORIAL OFICIAL:</strong><div style={{whiteSpace: 'pre-wrap', fontSize:'0.85rem', fontFamily:'monospace'}}>{unit.interventions}</div></div>)}
                      </div>
                    ))}
                 </div>
               )}
            </div>
           </div>
        )}

        {/* --- PANEL DE NOTAS --- */}
        {notesCustomer && (
          <div className="card" style={{ marginTop: 20, border: '1px solid var(--primary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3>{notesCustomer.name} <small className="muted">(Notas y Visitas)</small></h3>
              <button className="btn ghost" onClick={() => setNotesCustomer(null)}>Cerrar</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="btn" style={{ flex: 1, background: actionType === 'CALL' ? 'var(--primary)' : '#333' }} onClick={() => switchToAction('CALL')}>📞 Llamada</button>
              <button className="btn" style={{ flex: 1, background: actionType === 'VISIT' ? '#34c759' : '#333' }} onClick={() => switchToAction('VISIT')}>📍 Visita</button>
            </div>
            <form onSubmit={submitNote} className="form-grid compact">
              {actionType === 'VISIT' && <div style={{gridColumn:'1/-1', textAlign:'center', color: gpsLoading ? '#f0b43a' : '#34c759'}}>{gpsLoading ? "📡 Buscando GPS..." : location ? "✅ GPS Listo" : "Esperando Ubicación..."}</div>}
              <textarea placeholder="Detalles..." value={noteForm.texto} onChange={(e) => setNoteForm({...noteForm, texto:e.target.value})} rows={3} disabled={notesLoading} />
              <input type="text" placeholder="Próximos pasos" value={noteForm.proximos_pasos} onChange={(e) => setNoteForm({...noteForm, proximos_pasos:e.target.value})} disabled={notesLoading} />
              <button className="btn" type="submit" disabled={notesLoading}>Guardar</button>
            </form>
            {noteError && <p className="error" style={{textAlign:'center'}}>{noteError}</p>}
            <div style={{marginTop:15, display:'grid', gap:'10px'}}>
              {notes.map(n => (
                <div key={n.id} style={{borderBottom:'1px solid #333', paddingBottom:10, marginBottom:10}}>
                   <div style={{display:'flex', justifyContent:'space-between'}}><span>{n.action_type==='VISIT'?'📍':'📞'} <b>{n.user_name}</b></span><small className="muted">{formatDateTime(n.created_at)}</small></div>
                   <div style={{marginTop:5}}>{n.texto}</div>
                   {(isManager || n.user_id === user?.id) && <button className="btn danger" style={{fontSize:'0.7rem', padding:'2px 6px', marginTop:5}} onClick={() => handleDeleteNote(n.id)}>Borrar</button>}
                   {n.action_type === 'VISIT' && n.latitude && <div style={{height:150, marginTop:10}}><MapContainer center={[n.latitude, n.longitude]} zoom={13} style={{height:'100%'}} scrollWheelZoom={false}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[n.latitude, n.longitude]} /></MapContainer></div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomersPage;
