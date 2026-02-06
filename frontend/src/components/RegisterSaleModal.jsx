import React, { useState, useEffect } from 'react';
import { getCustomers } from '../api'; // Asegúrate de tener esta función o la que uses para listar clientes

const RegisterSaleModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [whModels, setWhModels] = useState([]);

  // FORMULARIO DE VENTA
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    currency: 'USD',
    model: '', // Nuevo
    hp: '',    // Nuevo
    notes: ''
  });

  // 1. CARGAR CLIENTES Y MODELOS AL ABRIR
  useEffect(() => {
    if (isOpen) {
      // Cargar Clientes
      getCustomers({ type: 'CLIENT' })
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          // Filtro defensivo: excluimos cualquier registro marcado como POS
          setCustomers(
            list
              .filter(c => (c.type || '').toUpperCase() === 'CLIENT')
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          );
        })
        .catch(console.error);

      // Cargar Modelos Wolf Hard
      const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
      fetch(`${BASE_URL}/api/models?brand=Wolf Hard`, {
        credentials: 'include'
      })
      .then(res => res.json())
      .then(setWhModels)
      .catch(console.error);
    }
  }, [isOpen]);

  // Generar lista de HP (50-400)
  const hpOptions = [];
  for (let i = 50; i <= 400; i += 5) hpOptions.push(i);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amount || !formData.model) {
        alert("Completa Cliente, Monto y Modelo.");
        return;
    }

    setLoading(true);
    try {
      const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${BASE_URL}/api/dashboard/sale`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            customer_id: formData.customerId,
            amount: formData.amount,
            currency: formData.currency,
            model: formData.model,
            hp: formData.hp,
            notes: formData.notes
        })
      });

      if (response.ok) {
        alert("¡Venta registrada con éxito! 💰");
        onClose();
        window.location.reload(); // Recargar para actualizar gráficos
      } else {
        alert("Error al guardar la venta.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
          background: '#1e1e1e', padding: '30px', borderRadius: '12px', 
          width: '500px', maxWidth: '90%', border: '1px solid #333', color: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
            <h2 style={{margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
                💰 Registrar Venta <span style={{fontSize:'0.8rem', background:'#10B981', padding:'2px 8px', borderRadius:'4px', color:'white'}}>Wolf Hard</span>
            </h2>
            <button onClick={onClose} style={{background:'none', border:'none', color:'#666', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
            
            {/* 1. SELECCIONAR CLIENTE */}
            <div style={{marginBottom:'15px'}}>
                <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>Cliente</label>
                <select 
                    style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#121212', color:'white'}}
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                    <option value="">-- Seleccionar Cliente --</option>
                    {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company || 'Particular'})</option>
                    ))}
                </select>
            </div>

            {/* 2. MODELO Y HP (EN UNA FILA) */}
            <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'15px', marginBottom:'15px'}}>
                <div>
                    <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>Modelo Wolf Hard</label>
                    <select 
                        style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #f0b43a', background:'#2a1c05', color:'#f0b43a', fontWeight:'bold'}}
                        value={formData.model}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                    >
                        <option value="">-- Seleccionar --</option>
                        {whModels.map(m => (
                            <option key={m.id} value={m.model}>{m.model}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>HP</label>
                    <select 
                        style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#121212', color:'white'}}
                        value={formData.hp}
                        onChange={e => setFormData({...formData, hp: e.target.value})}
                    >
                        <option value="">HP</option>
                        {hpOptions.map(hp => (
                            <option key={hp} value={hp}>{hp}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. MONTO Y MONEDA */}
            <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'15px', marginBottom:'15px'}}>
                <div>
                    <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>Monto Venta</label>
                    <input 
                        type="number" 
                        placeholder="0.00"
                        style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#121212', color:'white', fontSize:'1.1rem'}}
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                    />
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>Moneda</label>
                    <select 
                        style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#121212', color:'white'}}
                        value={formData.currency}
                        onChange={e => setFormData({...formData, currency: e.target.value})}
                    >
                        <option value="USD">USD 💵</option>
                        <option value="ARS">ARS 🇦🇷</option>
                    </select>
                </div>
            </div>

            {/* 4. NOTAS */}
            <div style={{marginBottom:'20px'}}>
                <label style={{display:'block', marginBottom:'5px', color:'#aaa', fontSize:'0.9rem'}}>Notas / Detalles</label>
                <textarea 
                    rows="3"
                    placeholder="Detalles de la operación..."
                    style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#121212', color:'white', resize:'none'}}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                />
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button type="button" onClick={onClose} style={{padding:'10px 20px', borderRadius:'6px', border:'1px solid #444', background:'transparent', color:'#aaa', cursor:'pointer'}}>Cancelar</button>
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{padding:'10px 25px', borderRadius:'6px', border:'none', background:'#10B981', color:'white', fontWeight:'bold', cursor:'pointer', opacity: loading ? 0.7 : 1}}
                >
                    {loading ? "Guardando..." : "Confirmar Venta"}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterSaleModal;
