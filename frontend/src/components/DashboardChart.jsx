import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDailyPerformance } from '../api';

const toChartData = (raw) => {
  const processed = {};
  raw.forEach((item) => {
    if (!item.day) return;
    // item.day viene como "YYYY-MM-DDTHH:mm:ssZ". Para evitar corrimientos de huso,
    // tomamos solo la parte de fecha y armamos DD/MM sin crear un Date().
    const [_year, month, day] = item.day.substring(0, 10).split('-');
    const dateKey = `${day}/${month}`;
    if (!processed[dateKey]) processed[dateKey] = { name: dateKey, CALL: 0, VISIT: 0, SALE: 0 };
    processed[dateKey][item.action_type] = parseInt(item.count, 10);
  });
  return Object.values(processed);
};

const DashboardChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getDailyPerformance()
      .then((raw) => setData(toChartData(raw)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const raw = await getDailyPerformance();
        if (mounted) setData(toChartData(raw));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div style={{height: '300px', display:'flex', alignItems:'center', justifyContent:'center', color:'#666'}}>Cargando gráfico...</div>;
  if (data.length === 0) return <div style={{height: '300px', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', fontStyle:'italic'}}>Sin actividad este mes.</div>;

  return (
    <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', marginBottom: '20px' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>📊 Actividad Diaria (Mes Actual)</h3>
        <button onClick={loadData} style={{border:'1px solid #444', background:'transparent', color:'#ccc', borderRadius:6, padding:'6px 10px', cursor:'pointer', fontSize:'0.85rem'}}>Actualizar</button>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="name" stroke="#888" tick={{fill:'#888'}} />
            <YAxis stroke="#888" tick={{fill:'#888'}} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff', borderRadius: '8px' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="CALL" name="Llamadas" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} barSize={30} />
            <Bar dataKey="VISIT" name="Visitas" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="SALE" name="Ventas" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;  
