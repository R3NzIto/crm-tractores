import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
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
      padding: '25px', 
      borderRadius: '12px', 
      border: '1px solid #333', 
      height: '380px', // Un poco más alto para que respire
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin:0, fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>📊 Rendimiento Diario</h3>
        <p style={{ margin:'5px 0 0 0', fontSize:'0.85rem', color:'#888' }}>Comparativa de acciones del mes</p>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barSize={40} // Grosor de las barras
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            stroke="#666" 
            tick={{fill: '#aaa', fontSize: 12}} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#666" 
            tick={{fill: '#aaa', fontSize: 12}} 
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip 
            cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} // Efecto hover sutil
            contentStyle={{ backgroundColor: '#222', borderColor: '#444', color: '#fff', borderRadius: '8px' }}
            itemStyle={{ fontSize: '0.9rem', padding: 0 }}
          />
          
          <Legend 
            verticalAlign="top" 
            align="right" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '10px' }}
          />

          {/* BARRAS CON BORDES REDONDEADOS ARRIBA (radius) */}
          <Bar dataKey="Llamadas" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Llamadas" />
          <Bar dataKey="Visitas" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Visitas" />
          <Bar dataKey="Ventas" fill="#10B981" radius={[6, 6, 0, 0]} name="Ventas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyChart;