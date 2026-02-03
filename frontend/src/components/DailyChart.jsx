import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const DailyChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/daily-performance`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(rawData => {
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
      background: '#1e1e1e', // Fondo oscuro
      padding: '20px', 
      borderRadius: '12px', 
      border: '1px solid #333', 
      height: '350px' 
    }}>
      <h3 style={{ marginBottom: '20px', fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>📈 Rendimiento Diario</h3>
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          {/* Ejes con texto claro */}
          <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} />
          <YAxis stroke="#666" tick={{fill: '#888'}} />
          
          {/* Tooltip oscuro */}
          <Tooltip 
            contentStyle={{ backgroundColor: '#222', borderColor: '#444', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
            cursor={{fill: 'rgba(255,255,255,0.05)'}}
          />
          <Legend />
          <Bar dataKey="Llamadas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Visitas" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Ventas" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
export default DailyChart;