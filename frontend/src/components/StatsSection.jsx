import React, { useEffect, useState } from 'react';

const StatsSection = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/reports`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => setStats(data))
    .catch(err => console.error(err));
  }, []);

  if (!stats) return <div style={{color: '#888', padding: '20px'}}>Cargando métricas...</div>;

  // ESTILOS DARK MODE 🌑
  const cardStyle = {
    background: '#1e1e1e', // Fondo oscuro
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid #333', // Borde sutil
    flex: 1,
    minWidth: '280px'
  };
  
  const titleStyle = { 
    color: '#aaa', 
    fontSize: '0.85rem', 
    textTransform: 'uppercase', 
    letterSpacing: '1px', 
    marginBottom: '15px', 
    borderBottom: '1px solid #333', 
    paddingBottom: '10px' 
  };
  
  const numStyle = { fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' };
  const labelStyle = { fontSize: '0.8rem', color: '#666', marginTop: '5px' };

  return (
    <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
      
      {/* Tarjeta Semanal */}
      <div style={{ ...cardStyle, borderLeft: '4px solid #3B82F6' }}>
        <h3 style={titleStyle}>📅 Esta Semana</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div><div style={numStyle}>{stats.week_calls}</div><div style={labelStyle}>Llamadas</div></div>
          <div><div style={numStyle}>{stats.week_visits}</div><div style={labelStyle}>Visitas</div></div>
          <div><div style={{...numStyle, color: '#10B981'}}>{stats.week_sales_count}</div><div style={labelStyle}>Ventas</div></div>
        </div>
      </div>

      {/* Tarjeta Mensual */}
      <div style={{ ...cardStyle, borderLeft: '4px solid #8B5CF6' }}>
        <h3 style={titleStyle}>📊 Este Mes</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div><div style={numStyle}>{stats.month_calls}</div><div style={labelStyle}>Llamadas</div></div>
          <div><div style={numStyle}>{stats.month_visits}</div><div style={labelStyle}>Visitas</div></div>
          <div><div style={{...numStyle, color: '#10B981'}}>{stats.month_sales_count}</div><div style={labelStyle}>Ventas</div></div>
        </div>
      </div>

    </div>
  );
};
export default StatsSection;