import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 👇 1. IMPORTAMOS LOS NUEVOS COMPONENTES
import TopModelsChart from '../components/TopModelsChart';
import SalesHistory from '../components/SalesHistory';

const Rendimientos = () => {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('year'); 
  const [loading, setLoading] = useState(true);

  // Función para cambiar entre Mes y Año
  const handleRangeChange = (newRange) => {
    if (newRange !== range) {
      setLoading(true); 
      setRange(newRange); 
    }
  };

  // Carga de datos principales del Dashboard
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics?range=${range}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (isMounted) {
          setData(result);
          setLoading(false); 
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [range]); 

  // --- ESTILOS ---
  const pageStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', color: 'white' };
  
  const cardStyle = {
    background: '#1e1e1e', padding: '25px', borderRadius: '12px', 
    border: '1px solid #333', marginBottom: '0', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  };
  
  const titleStyle = { 
    color: '#fff', margin: '0 0 20px 0', fontSize: '1.1rem', 
    borderBottom:'1px solid #333', paddingBottom:'10px' 
  };

  const btnStyle = (isActive) => ({
    padding: '8px 16px', background: isActive ? '#333' : 'transparent',
    color: isActive ? '#fff' : '#888', border: isActive ? '1px solid #555' : '1px solid transparent',
    borderRadius: '6px', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', marginLeft: '10px'
  });

  if (loading) return <div style={{padding:'50px', color:'#666', textAlign:'center'}}>Cargando Inteligencia de Negocios...</div>;
  if (!data) return <div style={{padding:'50px', color:'#ef4444', textAlign:'center'}}>No se pudieron cargar los datos.</div>;

  return (
    <div style={pageStyle}>
      {/* HEADER + FILTROS */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'15px'}}>
        <div>
            <h1 style={{margin:0, fontSize:'1.8rem'}}>📈 Rendimientos</h1>
            <p style={{color:'#888', margin:'5px 0 0 0'}}>Análisis financiero y operativo.</p>
        </div>
        
        <div style={{background:'#121212', padding:'5px', borderRadius:'8px', border:'1px solid #333'}}>
            <button onClick={() => handleRangeChange('month')} style={btnStyle(range === 'month')}>📅 Este Mes</button>
            <button onClick={() => handleRangeChange('year')} style={btnStyle(range === 'year')}>📆 Año Actual</button>
        </div>
      </div>

      {/* --- GRÁFICO 1: INGRESOS --- */}
      <div style={{...cardStyle, marginBottom: '20px'}}>
        <h3 style={titleStyle}>💰 Evolución de Ingresos ({range === 'year' ? 'Mensual' : 'Diaria'})</h3>
        <div style={{ height: '350px', width: '100%' }}>
          <ResponsiveContainer>
            <AreaChart data={data.salesChart}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#666" tick={{fill:'#888'}} />
              <YAxis stroke="#666" tick={{fill:'#888'}} />
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <Tooltip contentStyle={{background:'#222', border:'1px solid #444', color:'white', borderRadius:'8px'}} />
              <Area type="monotone" dataKey="total_revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Ingresos ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* --- GRÁFICO 2: TOP MODELOS (NUEVO) --- */}
        {/* 👇 Aquí es donde reemplazamos el gráfico viejo por el nuevo */}
        <TopModelsChart />

        {/* --- TABLA: RANKING VENDEDORES --- */}
        <div style={cardStyle}>
            <h3 style={titleStyle}>🏆 Top Vendedores</h3>
            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', color:'#e5e7eb'}}>
                    <thead>
                        <tr style={{borderBottom:'1px solid #444', textAlign:'left', color:'#888', fontSize:'0.9rem'}}>
                            <th style={{padding:'10px'}}>#</th>
                            <th style={{padding:'10px'}}>Agente</th>
                            <th style={{padding:'10px'}}>Ventas</th>
                            <th style={{padding:'10px', textAlign:'right'}}>Total ($)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.topEmployees.length === 0 ? (
                            <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#666'}}>Sin datos.</td></tr>
                        ) : (
                            data.topEmployees.map((emp, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #333'}}>
                                    <td style={{padding:'15px', fontWeight:'bold', color: i===0 ? '#FFD700' : i===1 ? '#C0C0C0' : i===2 ? '#CD7F32' : '#555'}}>{i+1}</td>
                                    <td style={{padding:'15px', fontWeight:'500'}}>{emp.name}</td>
                                    <td style={{padding:'15px'}}>{emp.total_sales} <span style={{fontSize:'0.8rem', color:'#666'}}>u.</span></td>
                                    <td style={{padding:'15px', textAlign:'right', color:'#10B981', fontWeight:'bold', fontFamily:'monospace', fontSize:'1rem'}}>
                                        ${Number(emp.total_revenue).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {/* --- SECCIÓN INFERIOR: HISTORIAL DE VENTAS (NUEVO) --- */}
      {/* 👇 Aquí agregamos la tabla de historial y borrado */}
      <SalesHistory />

    </div>
  );
};

export default Rendimientos;