import { useEffect, useState } from "react";
import { getAllUnits } from "../api";

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllUnits()
      .then((data) => setUnits(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filtrado por Modelo o por Cliente
  const filteredUnits = units.filter(u => 
    u.model.toLowerCase().includes(search.toLowerCase()) ||
    u.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    if (status === 'CONSIGNED') return <span className="tag" style={{background:'#e67e22', color:'white'}}>🟠 Consignada</span>;
    return <span className="tag" style={{background:'#27ae60', color:'white'}}>🟢 Vendida</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{margin:0}}>🚜 Parque de Unidades</h2>
        <span className="tag">{units.length} Máquinas</span>
      </div>

      <div className="card">
        <div className="page-header" style={{marginBottom:10}}>
           <h3>Listado General</h3>
           <input 
             type="text" 
             placeholder="Buscar por modelo o cliente..." 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
             style={{width: 300}}
           />
        </div>

        <div className="table-wrapper">
          {loading ? <p>Cargando maquinaria...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Modelo</th>
                  <th>Detalles</th>
                  <th>Cliente / Ubicación</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((u) => (
                  <tr key={u.id}>
                    <td>{getStatusBadge(u.status)}</td>
                    <td style={{fontWeight:'bold', color:'#f0b43a'}}>{u.model}</td>
                    <td className="muted">{u.year ? `Año ${u.year}` : '-'} {u.hp ? `• ${u.hp} HP` : ''}</td>
                    <td>
                      <div style={{fontWeight:'bold'}}>{u.customer_name}</div>
                      <div style={{fontSize:'0.8rem', color:'#888'}}>{u.localidad} • {u.customer_type === 'POS' ? 'Concesionaria' : 'Cliente Final'}</div>
                    </td>
                    <td>{formatDate(u.sale_date)}</td>
                  </tr>
                ))}
                {filteredUnits.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:20}}>No se encontraron unidades.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default UnitsPage;
