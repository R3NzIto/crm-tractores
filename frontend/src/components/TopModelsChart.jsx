import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getSalesByModel } from '../api';

const COLORS = ['#f0b43a', '#F59E0B', '#D97706', '#B45309', '#78350F']; // Tonos dorados/Wolf

const TopModelsChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getSalesByModel().then(setData).catch(console.error);
  }, []);

  if (data.length === 0) {
    return (
        <div style={{height: '300px', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', border:'1px dashed #333', borderRadius:'8px'}}>
            Aún no hay datos de modelos vendidos
        </div>
    );
  }

  return (
    <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', border: '1px solid #333', height: '350px' }}>
      <h3 style={{ margin: '0 0 20px', color: '#fff', fontSize: '1.1rem' }}>🏆 Top Modelos Wolf Hard</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="model" type="category" width={100} tick={{fill:'#ccc', fontSize:12}} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{fill: 'rgba(255,255,255,0.05)'}}
            contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={25}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopModelsChart;
