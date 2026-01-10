import { useEffect, useMemo, useState } from "react";
import { getCustomers, getDashboardActivity, getAgenda, logoutAndRedirect } from "../api";

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return date.toLocaleDateString();
};

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  
  const [customers, setCustomers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [myAgenda, setMyAgenda] = useState([]); // Nuevo: Para tareas del empleado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isJefe = ["jefe", "admin", "manager"].includes(user?.role);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        // Cargar datos básicos
        const promises = [
          getCustomers(token, { force: true }),
          getDashboardActivity(token)
        ];

        // Si es empleado, cargamos también su agenda para mostrarla en el inicio
        if (!isJefe) {
          promises.push(getAgenda(token));
        }

        const results = await Promise.all(promises);
        
        setCustomers(Array.isArray(results[0]) ? results[0] : []);
        setActivity(Array.isArray(results[1]) ? results[1] : []);
        
        if (!isJefe && results[2]) {
          setMyAgenda(Array.isArray(results[2]) ? results[2] : []);
        }

      } catch (err) {
        if (err?.status === 401) {
          logoutAndRedirect("/");
          return;
        }
        console.error(err);
        setError("Error cargando datos del tablero.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, isJefe]);

  // --- CÁLCULO DE MÉTRICAS SEGÚN ROL ---
  const stats = useMemo(() => {
    if (isJefe) {
      // ESTADÍSTICAS GLOBALES (JEFE)
      const total = customers.length;
      const conCorreo = customers.filter((c) => c.email).length;
      const lead = customers.filter((c) => !c.email).length;
      return [
        { label: "Cartera Global", value: total, color: "#D32F2F" }, // Rojo Wolf Hard
        { label: "Clientes Contactables", value: conCorreo, color: "#34c759" },
        { label: "Leads Pendientes", value: lead, color: "#f0b43a" },
      ];
    } else {
      // ESTADÍSTICAS PERSONALES (EMPLEADO)
      // Filtramos solo los asignados a él (aunque la API ya debería traer solo los suyos si está bien configurada, aseguramos aquí)
      const myCustomers = customers.filter(c => c.assigned_to === user.id || c.created_by === user.id); 
      const pendingTasks = myAgenda.filter(t => t.status === 'pendiente').length;
      const completedTasks = myAgenda.filter(t => t.status === 'finalizado').length;

      return [
        { label: "Mis Clientes", value: myCustomers.length, color: "#4aa3ff" },
        { label: "Tareas Pendientes", value: pendingTasks, color: "#f0b43a" },
        { label: "Completadas (Mes)", value: completedTasks, color: "#34c759" },
      ];
    }
  }, [customers, myAgenda, isJefe, user.id]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>{isJefe ? "Centro de Comando" : "Mi Espacio de Trabajo"}</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Hola, {user.name}. {isJefe ? "Aquí tienes el control total." : "Vamos a ser productivos hoy."}
          </p>
        </div>
        <span className="tag" style={{background: isJefe ? 'var(--primary)' : '#444'}}>
          {isJefe ? "👑 MODO JEFE" : "👷 MODO OPERATIVO"}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      
      {/* --- SECCIÓN 1: KPIs (Diferentes por rol) --- */}
      <div className="kpi-grid" style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {loading ? <p className="muted">Cargando métricas...</p> : stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: '20px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '0.85rem', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginTop: '5px' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Si es EMPLEADO: Mostrar "Mis Próximas Tareas" primero */}
          {!isJefe && (
            <div className="card">
              <div className="card-header" style={{borderBottom:'1px solid var(--border-color)', paddingBottom:'10px', marginBottom:'10px'}}>
                <h3 style={{ margin: 0 }}>📅 Mis Próximas Tareas</h3>
                <a href="/agenda" className="btn ghost" style={{padding:'5px 10px', fontSize:'0.8rem'}}>Ver todas</a>
              </div>
              
              {loading ? <p className="muted">Cargando agenda...</p> : myAgenda.filter(t => t.status === 'pendiente').slice(0, 5).length === 0 ? (
                <div style={{textAlign:'center', padding:'20px 0'}}>
                  <p className="muted">¡Todo al día! No tienes pendientes urgentes.</p>
                  <button className="btn secondary" onClick={() => window.location.href='/agenda'}>Agendar algo</button>
                </div>
              ) : (
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  {myAgenda.filter(t => t.status === 'pendiente').slice(0, 5).map(task => (
                    <li key={task.id} style={{padding:'10px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div style={{fontWeight:'500'}}>{task.title}</div>
                        <div className="muted small">
                          {task.scheduled_at ? new Date(task.scheduled_at).toLocaleDateString() : 'Sin fecha'}
                        </div>
                      </div>
                      <span className="tag" style={{background:'rgba(240, 180, 58, 0.1)', color:'#f0b43a'}}>Pendiente</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Si es JEFE: Mostrar Accesos Rápidos de Gestión */}
          {isJefe && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Gestión Rápida</h3>
              <div className="toolbar" style={{ flexDirection: 'column' }}>
                <button className="btn" onClick={() => (window.location.href = "/customers")}>
                  👥 Supervisar Clientes
                </button>
                <button className="btn secondary" onClick={() => (window.location.href = "/agenda")}>
                  📅 Ver Agenda del Equipo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- COLUMNA DERECHA: FEED DE ACTIVIDAD --- */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>{isJefe ? "📡 Actividad Global del Equipo" : "📝 Mi Historial Reciente"}</h3>
            <span className="muted small">
              {isJefe ? "Monitoreo en tiempo real con GPS" : "Tus últimas notas y visitas"}
            </span>
          </div>

          {loading ? (
            <p className="muted">Sincronizando datos...</p>
          ) : activity.length === 0 ? (
            <p className="muted">No hay actividad registrada aún.</p>
          ) : (
            <div className="activity-feed">
              {activity.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Icono */}
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: item.latitude ? 'rgba(52, 199, 89, 0.2)' : 'rgba(74, 163, 255, 0.2)', 
                    color: item.latitude ? '#34c759' : '#4aa3ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    {item.latitude ? '📍' : '📝'}
                  </div>
                  
                  {/* Contenido */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                        {isJefe ? item.user_name : "Tú"} {/* El empleado se ve a sí mismo como "Tú" */}
                      </span>
                      <span className="muted small" style={{ fontSize: '0.75rem' }}>{timeAgo(item.created_at)}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#ccc', margin: '2px 0' }}>
                      {item.latitude ? 'Visita registrada en ' : 'Nota agregada a '} 
                      <strong style={{ color: '#fff' }}>{item.customer_name}</strong>
                    </div>
                    
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
                      "{item.texto}"
                    </p>

                    {item.latitude && (
                      <a 
                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tag"
                        style={{ marginTop: '8px', fontSize: '0.75rem', textDecoration: 'none', cursor: 'pointer', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.3)' }}
                      >
                        🌍 Ver mapa
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;