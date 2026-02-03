import { useEffect, useState } from "react";
import { 
  getDashboardActivity, 
  getAgenda, 
  logoutAndRedirect 
} from "../api";

// IMPORTAMOS LOS COMPONENTES (Que ya pusiste en Dark Mode)
import StatsSection from "../components/StatsSection";
import DailyChart from "../components/DailyChart";

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
  
  const [activity, setActivity] = useState([]);
  const [myAgenda, setMyAgenda] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isJefe = ["jefe", "admin", "manager"].includes(user?.role);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const promises = [
          getDashboardActivity(token) // Trae últimas 48hs
        ];

        if (!isJefe) {
          promises.push(getAgenda(token));
        }

        const results = await Promise.all(promises);
        
        setActivity(Array.isArray(results[0]) ? results[0] : []);
        
        if (!isJefe && results[1]) {
          setMyAgenda(Array.isArray(results[1]) ? results[1] : []);
        }

      } catch (err) {
        if (err?.status === 401) {
          logoutAndRedirect("/");
          return;
        }
        console.error(err);
        setError("Error cargando datos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, isJefe]);

  // ESTILOS DARK MODE COMUNES 🌑
  const cardStyle = {
    background: '#1e1e1e', 
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid #333',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
  };
  
  const titleStyle = { margin: 0, color: '#fff', fontSize: '1.1rem' };
  const mutedStyle = { color: '#9ca3af', fontSize: '0.9rem' };

  return (
    <div className="page" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* --- ENCABEZADO --- */}
      <div className="page-header" style={{ marginBottom: '25px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff' }}>{isJefe ? "Centro de Comando" : "Mi Espacio de Trabajo"}</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
            Hola, {user.name}. Aquí tienes el resumen actualizado.
          </p>
        </div>
        <span className="tag" style={{
            background: isJefe ? '#dc2626' : '#2563eb', // Rojo jefe, Azul empleado
            color: 'white', padding: '5px 12px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 'bold'
        }}>
          {isJefe ? "👑 MODO JEFE" : "👷 MODO OPERATIVO"}
        </span>
      </div>

      {error && <p style={{color:'#ef4444', background: 'rgba(239,68,68,0.1)', padding:'10px', borderRadius:'5px'}}>{error}</p>}
      
      {/* 1. SECCIÓN DE REPORTES (Ya está en Dark Mode) */}
      <StatsSection />

      {/* --- GRILLA PRINCIPAL --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GRÁFICO DIARIO (Ya está en Dark Mode) */}
          <DailyChart />

          {/* AGENDA RÁPIDA (Solo empleados) - AHORA DARK MODE */}
          {!isJefe && (
            <div className="card" style={cardStyle}>
              <div className="card-header" style={{ marginBottom: '15px', paddingBottom:'10px', borderBottom:'1px solid #333' }}>
                 <h3 style={titleStyle}>📅 Agenda Pendiente</h3>
              </div>
              {myAgenda.filter(t => t.status === 'pendiente').length === 0 ? (
                 <p style={mutedStyle}>¡Estás al día! Nada pendiente.</p>
              ) : (
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                   {myAgenda.filter(t => t.status === 'pendiente').slice(0, 5).map(t => (
                     <li key={t.id} style={{
                         padding:'12px 0', borderBottom:'1px solid #333', fontSize:'0.9rem', 
                         display:'flex', justifyContent:'space-between', color: '#e5e7eb'
                     }}>
                       <span>{t.title}</span>
                       <span style={{fontSize:'0.75rem', color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'2px 6px', borderRadius:'4px'}}>Pendiente</span>
                     </li>
                   ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* --- COLUMNA DERECHA: ACTIVIDAD RECIENTE (48HS) - AHORA DARK MODE --- */}
        <div className="card" style={{ ...cardStyle, height: 'fit-content' }}>
          <div className="card-header" style={{ marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <h3 style={titleStyle}>📡 Actividad Reciente (48h)</h3>
          </div>

          {loading ? (
            <p style={mutedStyle}>Sincronizando...</p>
          ) : activity.length === 0 ? (
            <p style={mutedStyle}>Sin movimientos en las últimas 48 horas.</p>
          ) : (
            <div className="activity-feed">
              {activity.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '15px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                  
                  {/* ICONO CON FONDO OSCURO PERO COLORIDO */}
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    // Fondos translúcidos para que brillen en lo oscuro
                    background: item.action_type === 'VISIT' ? 'rgba(16, 185, 129, 0.15)' : item.action_type === 'CALL' ? 'rgba(59, 130, 246, 0.15)' : item.action_type === 'SALE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.1)', 
                    color: item.action_type === 'VISIT' ? '#10b981' : item.action_type === 'CALL' ? '#3b82f6' : item.action_type === 'SALE' ? '#f59e0b' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {item.action_type === 'VISIT' ? '📍' : item.action_type === 'CALL' ? '📞' : item.action_type === 'SALE' ? '💰' : '📝'}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#fff' }}>
                        {isJefe ? item.user_name : "Tú"}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{timeAgo(item.created_at)}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#d1d5db', margin: '4px 0' }}>
                      {item.action_type === 'VISIT' ? 'Visitó a ' : item.action_type === 'CALL' ? 'Llamó a ' : item.action_type === 'SALE' ? 'Vendió a ' : 'Nota sobre '} 
                      <strong style={{ color: '#fff' }}>{item.customer_name}</strong>
                    </div>
                    
                    {/* Texto de la nota con fondo oscuro suave */}
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic', background: '#121212', padding: '8px', borderRadius: '6px', border: '1px solid #333' }}>
                      "{item.texto}"
                    </p>

                    {item.latitude && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tag"
                        style={{ marginTop: '8px', display: 'inline-block', fontSize: '0.75rem', textDecoration: 'none', cursor: 'pointer', color: '#3b82f6' }}
                      >
                        🌍 Ver ubicación
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