import { useEffect, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import {
  createCustomer, deleteCustomer, getCustomers, getUsers, updateCustomer,
  getCustomerUnits, createCustomerUnit, updateCustomerUnit, deleteCustomerUnit,
  logoutAndRedirect
} from "../api";

const MANAGER_ROLES = ["admin", "manager", "jefe"];
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

function PointsOfSalePage() {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", localidad: "", sector: "", assigned_to: "" });
  const [editingId, setEditingId] = useState(null);
  
  // VARIABLES QUE DABA ERROR: AHORA LAS USAREMOS
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [search, setSearch] = useState("");
  
  // UNIDADES
  const [unitsCustomer, setUnitsCustomer] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitForm, setUnitForm] = useState({ model: "", year: "", hp: "", accessories: "", sale_date: "", status: "CONSIGNED" });
  
  // VARIABLE QUE DABA ERROR: AHORA LA USAREMOS
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isManager = MANAGER_ROLES.includes(user?.role);

  // CARGAR SOLO PUNTOS DE VENTA (type='POS')
  const loadPOS = useCallback(async () => {
    setLoading(true);
    setError(""); // Limpiamos errores al cargar
    try {
      const data = await getCustomers(token, { type: 'POS' });
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error(err);
      setError("Error cargando los puntos de venta.");
    } finally { 
      setLoading(false); 
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!isManager) return;
    try { const data = await getUsers(token); setUsers(Array.isArray(data) ? data : []); } catch (e) { console.error(e); }
  }, [token, isManager]);

  useEffect(() => { 
    if (!token) { logoutAndRedirect("/"); return; } 
    loadPOS(); loadUsers(); 
  }, [token, loadPOS, loadUsers]);

  // CREAR / EDITAR PUNTO DE VENTA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); // Bloqueamos botón
    try {
      const payload = { ...form, type: 'POS' };
      if (!isManager) delete payload.assigned_to;
      
      if (editingId) await updateCustomer(token, editingId, payload);
      else await createCustomer(token, payload);
      
      setForm({ name: "", email: "", phone: "", company: "", localidad: "", sector: "", assigned_to: "" });
      setEditingId(null);
      await loadPOS();
    } catch (err) { 
      console.error(err);
      setError("Error al guardar el punto de venta.");
    } finally {
      setLoading(false); // Desbloqueamos botón
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Borrar Punto de Venta?")) return;
    try { await deleteCustomer(token, id); await loadPOS(); } catch  { alert("Error al borrar"); }
  };

  // --- LOGICA DE UNIDADES ---
  const loadUnits = async (c) => {
    setUnitsCustomer(c);
    setUnitsLoading(true);
    try {
      const data = await getCustomerUnits(token, c.id);
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setUnitsLoading(false); }
  };

  const submitUnit = async (e) => {
    e.preventDefault();
    if (!unitsCustomer) return;
    setUnitsLoading(true); // Bloqueamos botón de unidad
    try {
      if (editingUnitId) await updateCustomerUnit(token, unitsCustomer.id, editingUnitId, unitForm);
      else await createCustomerUnit(token, unitsCustomer.id, unitForm);
      
      setUnitForm({ model: "", year: "", hp: "", accessories: "", sale_date: "", status: "CONSIGNED" });
      setEditingUnitId(null);
      await loadUnits(unitsCustomer);
    } catch  { 
      alert("Error guardando unidad"); 
    } finally { 
      setUnitsLoading(false); // Desbloqueamos botón
    }
  };

  const startEditUnit = (u) => {
    setEditingUnitId(u.id);
    setUnitForm({ model: u.model, year: u.year, hp: u.hp, accessories: u.accessories, sale_date: u.sale_date?.split('T')[0], status: u.status || 'SOLD' });
  };
  
  const handleDeleteUnit = async (uid) => {
    if(!window.confirm("¿Borrar unidad?")) return;
    try { await deleteCustomerUnit(token, unitsCustomer.id, uid); await loadUnits(unitsCustomer); } catch{ alert("Error"); }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const getStock = (uList) => {
    const consignadas = uList.filter(u => u.status === 'CONSIGNED').length;
    const vendidas = uList.filter(u => u.status === 'SOLD').length;
    return { consignadas, vendidas };
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{margin:0}}>🏭 Red de Puntos de Venta</h2>
        <span className="tag">{customers.length} Concesionarias</span>
      </div>

      {/* FORMULARIO AGREGAR POS */}
      <div className="card" style={{marginBottom: 20}}>
        <h3>{editingId ? "Editar Concesionaria" : "Nuevo Punto de Venta"}</h3>
        <form onSubmit={handleSubmit} className="form-grid">
           <input type="text" placeholder="Nombre del Punto de Venta" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
           <input type="text" placeholder="Contacto / Encargado" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
           <input type="text" placeholder="Teléfono" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
           <input type="text" placeholder="Localidad" value={form.localidad} onChange={e=>setForm({...form, localidad:e.target.value})} />
           {isManager && <select value={form.assigned_to||""} onChange={e=>setForm({...form, assigned_to:e.target.value})}><option value="">Asignar Ejecutivo...</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>}
           
           <div className="toolbar">
             {/* AQUI USAMOS "loading" PARA DESHABILITAR EL BOTON */}
             <button className="btn" disabled={loading}>{editingId?"Guardar":"Agregar"}</button>
           </div>
        </form>
        {/* AQUI MOSTRAMOS EL ERROR SI EXISTE */}
        {error && <p className="error" style={{marginTop:10}}>{error}</p>}
      </div>

      {/* LISTADO */}
      <div className="card">
        <div className="page-header">
            <h3>Listado</h3>
            <input type="text" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:200}}/>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Encargado</th><th>Ubicación</th><th>Opciones</th></tr></thead>
            <tbody>
                {filtered.map(c => (
                    <tr key={c.id}>
                        <td>{c.name}</td>
                        <td className="muted">{c.company}</td>
                        <td>{c.localidad}</td>
                        <td>
                            <button className="btn secondary" onClick={()=>{setEditingId(c.id); setForm(c);}}>✏️</button>
                            <button className="btn ghost" onClick={()=>loadUnits(c)}>🚜 Stock</button>
                            <button className="btn danger" onClick={()=>handleDelete(c.id)}>🗑️</button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* --- GESTIÓN DE STOCK (UNIDADES) --- */}
        {unitsCustomer && (
            <div className="card" style={{marginTop:20, border:'1px solid #f0b43a'}}>
                <div className="card-header">
                    <div>
                        <h3 style={{margin:0}}>{unitsCustomer.name}</h3>
                        <div style={{display:'flex', gap:10, marginTop:5}}>
                            <span className="tag" style={{background:'#e67e22', color:'white'}}>🟠 {getStock(units).consignadas} Consignadas</span>
                            <span className="tag" style={{background:'#27ae60', color:'white'}}>🟢 {getStock(units).vendidas} Vendidas</span>
                        </div>
                    </div>
                    <button className="btn ghost" onClick={()=>setUnitsCustomer(null)}>Cerrar</button>
                </div>

                <form onSubmit={submitUnit} className="form-grid compact" style={{marginTop:15}}>
                    <select value={unitForm.status} onChange={e=>setUnitForm({...unitForm, status:e.target.value})} style={{fontWeight:'bold', color: unitForm.status==='SOLD'?'#27ae60':'#e67e22'}}>
                        <option value="CONSIGNED">🟠 En Consignación</option>
                        <option value="SOLD">🟢 Vendida</option>
                    </select>
                    <input type="text" placeholder="Modelo" value={unitForm.model} onChange={e=>setUnitForm({...unitForm, model:e.target.value})} required />
                    <input type="number" placeholder="Año" value={unitForm.year} onChange={e=>setUnitForm({...unitForm, year:e.target.value})} />
                    <input type="number" placeholder="HP" value={unitForm.hp} onChange={e=>setUnitForm({...unitForm, hp:e.target.value})} />
                    <input type="date" value={unitForm.sale_date} onChange={e=>setUnitForm({...unitForm, sale_date:e.target.value})} />
                    
                    {/* AQUI USAMOS "unitsLoading" PARA DESHABILITAR EL BOTON */}
                    <button className="btn" disabled={unitsLoading}>{editingUnitId?"Guardar":"Agregar"}</button>
                </form>

                <div style={{marginTop:15, display:'grid', gap:8}}>
                    {units.map(u => (
                        <div key={u.id} style={{background:'rgba(255,255,255,0.05)', padding:10, borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft: u.status==='SOLD'?'4px solid #27ae60':'4px solid #e67e22'}}>
                            <div>
                                <div><strong style={{color: u.status==='SOLD'?'#27ae60':'#e67e22'}}>{u.status==='SOLD'?'VENDIDA':'CONSIGNADA'}</strong> - {u.model}</div>
                                <small className="muted">{u.year} • {u.hp}HP • {formatDate(u.sale_date)}</small>
                            </div>
                            <div>
                                <button className="btn secondary" style={{padding:'4px 8px'}} onClick={()=>startEditUnit(u)}>✏️</button>
                                <button className="btn danger" style={{padding:'4px 8px'}} onClick={()=>handleDeleteUnit(u.id)}>X</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default PointsOfSalePage;