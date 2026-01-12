import { useEffect, useMemo, useState } from "react";
import { 
  getCustomers, 
  getDashboardActivity, 
  getAgenda, 
  getDashboardStats, // 👈 Importamos la nueva función
  logoutAndRedirect 
} from "../api";

// 📊 Importamos componentes de Recharts
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
  const [myAgenda, setMyAgenda] = useState([]); 
  const [statsData, setStatsData] = useState({ calls: 0, visits: 0, notes: 0 }); // 👈 Estado para datos del gráfico
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isJefe = ["jefe", "admin", "manager"].includes(user?.role);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const promises = [
          getCustomers(token, { force: true }),
          getDashboardActivity(token),
          getDashboardStats(token) // 👈 Pedimos las estadísticas
        ];

        if (!isJefe) {
          promises.push(getAgenda(token));
        }

        const results = await Promise.all(promises);
        
        setCustomers(Array.isArray(results[0]) ? results[0] : []);
        setActivity(Array.isArray(results[1]) ? results[1] : []);
        setStatsData(results[2] || { calls: 0, visits: 0, notes: 0 }); // Guardamos stats
        
        if (!isJefe && results[3]) {
          setMyAgenda(Array.isArray(results[3]) ? results[3] : []);
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

  // Datos para el gráfico de Dona
  const chartData = useMemo(() => [
    { name: 'Llamadas', value: statsData.calls, color: '#4aa3ff' }, // Azul
    { name: 'Visitas', value: statsData.visits, color: '#34c759' }, // Verde
    { name: 'Notas', value: statsData.notes, color: '#888888' },    // Gris
  ].filter(d => d.value > 0), [statsData]);

  // KPIs Generales (Cartera)
  const kpis = useMemo(() => {
    if (isJefe) {
      const total = customers.length;
      const conCorreo = customers.filter((c) => c.email).length;
      return [
        { label: "Cartera Total", value: total, color: "#D32F2F" },
        { label: "Clientes Contactables", value: conCorreo, color: "#f0b43a" },
      ];
    } else {
      const myCustomers = customers.filter(c => c.assigned_to === user.id || c.created_by === user.id); 
      const pendingTasks = myAgenda.filter(t => t.status === 'pendiente').length;
      return [
        { label: "Mis Clientes", value: myCustomers.length, color: "#4aa3ff" },
        { label: "Tareas Pendientes", value: pendingTasks, color: "#f0b43a" },
      ];
    }
  }, [customers, myAgenda, isJefe, user.id]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>{isJefe ? "Centro de Comando" : "Mi Espacio de Trabajo"}</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Hola, {user.name}. Resumen de actividad del mes en curso.
          </p>
        </div>
        <span className="tag" style={{background: isJefe ? 'var(--primary)' : '#444'}}>
          {isJefe ? "👑 MODO JEFE" : "👷 MODO OPERATIVO"}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      
      {/* --- SECCIÓN 1: KPIs DE CARTERA --- */}
      <div className="kpi-grid" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {kpis.map((s) => (
          <div key={s.label} className="card" style={{ padding: '20px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '0.85rem', color: '#A0A0A0', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* --- COLUMNA IZQUIERDA: GRÁFICO Y MÉTRICAS DE ACCIÓN --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TARJETA DE ESTADÍSTICAS DEL MES */}
          <div className="card">
            <h3 style={{ margin: "0 0 15px 0" }}>📊 Rendimiento Mensual</h3>
            
            {/* Resumen numérico rápido */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ flex: 1, background: 'rgba(74, 163, 255, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(74, 163, 255, 0.2)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4aa3ff' }}>{statsData.calls}</div>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>📞 Llamadas</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(52, 199, 89, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34c759' }}>{statsData.visits}</div>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>📍 Visitas (Km)</div>
              </div>
            </div>

            {/* GRÁFICO DE DONA */}
            <div style={{ width: '100%', height: 250 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#222', borderColor: '#444', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  Sin datos este mes
                </div>
              )}
            </div>
          </div>

          {/* Accesos rápidos (Solo si es Jefe o si es Empleado con agenda) */}
          {!isJefe ? (
            <div className="card">
              <div className="card-header" style={{ marginBottom: '10px' }}>
                 <h3 style={{margin:0}}>📅 Agenda Inmediata</h3>
              </div>
              {myAgenda.filter(t => t.status === 'pendiente').length === 0 ? (
                 <p className="muted">Nada pendiente.</p>
              ) : (
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                   {myAgenda.filter(t => t.status === 'pendiente').slice(0, 3).map(t => (
                     <li key={t.id} style={{padding:'8px 0', borderBottom:'1px solid #333', fontSize:'0.9rem'}}>
                       {t.title}
                     </li>
                   ))}
                </ul>
              )}
            </div>
          ) : (
             <div className="card">
                <h3 style={{margin:0}}>Accesos</h3>
                <button className="btn secondary" style={{marginTop:10, width:'100%'}} onClick={() => window.location.href='/customers'}>Ver todos los Clientes</button>
             </div>
          )}
        </div>

        {/* --- COLUMNA DERECHA: FEED DE ACTIVIDAD --- */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>📡 Actividad Reciente</h3>
          </div>

          {loading ? (
            <p className="muted">Sincronizando...</p>
          ) : activity.length === 0 ? (
            <p className="muted">Sin movimientos recientes.</p>
          ) : (
            <div className="activity-feed">
              {activity.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: item.action_type === 'VISIT' ? 'rgba(52, 199, 89, 0.2)' : item.action_type === 'CALL' ? 'rgba(74, 163, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', 
                    color: item.action_type === 'VISIT' ? '#34c759' : item.action_type === 'CALL' ? '#4aa3ff' : '#aaa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    {item.action_type === 'VISIT' ? '📍' : item.action_type === 'CALL' ? '📞' : '📝'}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                        {isJefe ? item.user_name : "Tú"}
                      </span>
                      <span className="muted small" style={{ fontSize: '0.75rem' }}>{timeAgo(item.created_at)}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#ccc', margin: '2px 0' }}>
                      {item.action_type === 'VISIT' ? 'Visitó a ' : item.action_type === 'CALL' ? 'Llamó a ' : 'Nota sobre '} 
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