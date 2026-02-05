import React, { useEffect, useState, useCallback } from 'react';
import { getSalesHistory, deleteSale } from '../api';

// 👇 Recibimos una nueva prop: onSaleDeleted
const SalesHistory = ({ onSaleDeleted }) => {
  const [sales, setSales] = useState([]);
  const token = localStorage.getItem('token');

  const loadData = useCallback(() => {
    getSalesHistory(token)
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [token]); 

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de ELIMINAR esta venta?\nSe borrará del registro financiero.")) return;
    try {
        await deleteSale(token, id);
        loadData(); // 1. Recargar la tabla
        
        // 👇 2. AVISAR AL PADRE PARA QUE ACTUALICE LOS GRÁFICOS
        if (onSaleDeleted) {
            onSaleDeleted();
        }
        
    } catch  {
        alert("Error al eliminar");
    }
  };

  return (
    <div style={{ marginTop: '20px', background: '#1e1e1e', padding: '25px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom:'1px solid #333', paddingBottom:'10px'}}>
        <h3 style={{ margin: 0, color: '#fff', fontSize:'1.1rem' }}>📜 Historial de Ventas (Últimas 50)</h3>
        <button onClick={loadData} style={{background:'transparent', border:'none', color:'#f0b43a', cursor:'pointer', fontSize:'1.2rem'}}>🔄</button>
      </div>
      
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', color: '#ddd', fontSize:'0.9rem'}}>
            <thead>
                <tr style={{borderBottom: '1px solid #444', textAlign:'left', color:'#888'}}>
                    <th style={{padding:'10px'}}>Fecha</th>
                    <th style={{padding:'10px'}}>Cliente</th>
                    <th style={{padding:'10px'}}>Modelo / Detalle</th>
                    <th style={{padding:'10px'}}>Vendedor</th>
                    <th style={{padding:'10px', textAlign:'right'}}>Monto</th>
                    <th style={{padding:'10px', textAlign:'center'}}>Acción</th>
                </tr>
            </thead>
            <tbody>
                {sales.length === 0 ? (
                    <tr><td colSpan="6" style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay ventas registradas.</td></tr>
                ) : (
                    sales.map(sale => (
                        <tr key={sale.id} style={{borderBottom: '1px solid #2a2a2a'}}>
                            <td style={{padding:'10px'}}>{new Date(sale.sale_date).toLocaleDateString()}</td>
                            <td style={{padding:'10px', fontWeight:'bold'}}>{sale.customer_name}</td>
                            <td style={{padding:'10px'}}>
                                {sale.model ? <span style={{color:'#f0b43a', fontWeight:'bold'}}>{sale.model}</span> : <span style={{fontStyle:'italic', color:'#666'}}>Sin modelo</span>}
                                {sale.hp ? ` (${sale.hp} HP)` : ''}
                            </td>
                            <td style={{padding:'10px'}}>{sale.user_name}</td>
                            <td style={{padding:'10px', textAlign:'right', color:'#10B981', fontWeight:'bold'}}>
                                {sale.currency === 'USD' ? 'USD ' : '$'}{sale.amount}
                            </td>
                            <td style={{padding:'10px', textAlign:'center'}}>
                                <button 
                                    onClick={() => handleDelete(sale.id)}
                                    style={{background:'#450a0a', color:'#fca5a5', border:'1px solid #7f1d1d', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', fontSize:'0.75rem'}}
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistory;