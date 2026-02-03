import React, { useEffect, useState } from 'react';
// 👇 CORRECCIÓN: Quitamos defs, linearGradient y stop de aquí
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const DailyChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/daily-performance`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(rawData => {
      // PROCESAMIENTO DE DATOS
      const processed = {};
      rawData.forEach(item => {
        const day = item.day.split('-')[2];
        if (!processed[day]) processed[day] = { name: day, Llamadas: 0, Visitas: 0, Ventas: 0 };
        
        if (item.action_type === 'CALL') processed[day].Llamadas = parseInt(item.count);
        if (item.action_type === 'VISIT') processed[day].Visitas = parseInt(item.count);
        if (item.action_type === 'SALE') processed[day].Ventas = parseInt(item.count);
      });
      setData(Object.values(processed).sort((a, b) => parseInt(a.name) - parseInt(b.name)));
    });
  }, []);

  return (
    <div style={{ 
      background: '#1e1e1e', 
      padding: '20px', 
      borderRadius: '12px', 
      border: '1px solid #333', 
      height: '350px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
        <h3 style={{ margin:0, fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>📈 Evolución Diaria</h3>
        <span style={{fontSize:'0.8rem', color:'#666'}}>Mes Actual</span>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          
          {/* DEFINICIÓN DE DEGRADADOS (Esto es SVG nativo, no se importa) */}
          <defs>
            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            stroke="#666" 
            tick={{fill: '#888', fontSize: 12}} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#666" 
            tick={{fill: '#888', fontSize: 12}} 
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#444', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
            itemStyle={{ fontSize: '0.9rem' }}
            labelStyle={{ color: '#aaa', marginBottom: '5px' }}
          />

          <Area 
            type="monotone" 
            dataKey="Llamadas" 
            stroke="#3B82F6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorCalls)" 
          />
          <Area 
            type="monotone" 
            dataKey="Visitas" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorVisits)" 
          />
          <Area 
            type="monotone" 
            dataKey="Ventas" 
            stroke="#10B981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorSales)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyChart;