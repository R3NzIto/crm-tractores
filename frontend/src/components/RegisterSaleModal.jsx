import React, { useState, useEffect } from 'react';

const RegisterSaleModal = ({ isOpen, onClose }) => {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({ customer_id: '', amount: '', currency: 'USD', notes: '' });

  useEffect(() => {
    if (isOpen) {
        fetch(`${import.meta.env.VITE_API_URL}/api/customers`, { 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => setCustomers(data))
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/register-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { 
          // Notificación simple o alert
          alert('¡Venta Registrada! 💰'); 
          onClose(); 
          window.location.reload(); 
      }
    } catch  { alert('Error al guardar'); }
  };

  if (!isOpen) return null;

  // 🌑 ESTILOS DARK MODE PARA EL MODAL
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', // Fondo más oscuro atrás
    backdropFilter: 'blur(3px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
  };
  
  const contentStyle = {
    background: '#1f1f1f', // Tarjeta oscura
    padding: '30px', 
    borderRadius: '16px', 
    width: '90%', 
    maxWidth: '450px',
    border: '1px solid #333',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  // Estilo para los Inputs (Fondo negro, letra blanca)
  const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    marginBottom: '15px', 
    borderRadius: '8px', 
    border: '1px solid #444',
    background: '#121212', 
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none'
  };

  const labelStyle = { display:'block', marginBottom:'8px', color: '#aaa', fontSize: '0.9rem' };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
            <h2 style={{fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', margin:0}}>💰 Registrar Venta</h2>
            <button onClick={onClose} style={{background:'none', border:'none', color:'#666', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div>
            <label style={labelStyle}>Cliente</label>
            <select style={inputStyle} onChange={e => setFormData({...formData, customer_id: e.target.value})} required>
                <option value="" style={{background:'#121212'}}>Seleccionar Cliente...</option>
                {customers.map(c => (
                    <option key={c.id} value={c.id} style={{background:'#121212'}}>{c.name}</option>
                ))}
            </select>
          </div>

          <div style={{display:'flex', gap:'15px'}}>
             <div style={{flex: 1}}>
                <label style={labelStyle}>Monto</label>
                <input type="number" style={inputStyle} placeholder="0.00" onChange={e => setFormData({...formData, amount: e.target.value})} required />
             </div>
             <div style={{width: '110px'}}>
                <label style={labelStyle}>Moneda</label>
                <select style={inputStyle} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    <option value="USD">USD 🇺🇸</option>
                    <option value="ARS">ARS 🇦🇷</option>
                </select>
             </div>
          </div>

          <div>
            <label style={labelStyle}>Notas / Detalles</label>
            <textarea style={{...inputStyle, height: '100px', resize:'none'}} placeholder="Escribe detalles..." onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          </div>
          
          <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
                padding: '12px 20px', border:'1px solid #444', background:'transparent', 
                color:'#aaa', borderRadius:'8px', cursor:'pointer', fontWeight:'600'
            }}>
                Cancelar
            </button>
            <button type="submit" style={{
                padding: '12px 24px', border:'none', background:'#10B981', 
                color:'white', borderRadius:'8px', cursor:'pointer', fontWeight:'bold',
                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
            }}>
                Guardar Venta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default RegisterSaleModal;