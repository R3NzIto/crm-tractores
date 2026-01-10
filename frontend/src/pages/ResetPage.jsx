import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../api";

function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({ message: "Falta el token de recuperacion", type: "error" });
    }
  }, [token]);

  async function handleReset(e) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setStatus({ message: "Las contrasenas no coinciden", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await resetPassword(token, password);
      if (!ok) {
        setStatus({ message: data?.message || "Error al actualizar", type: "error" });
        return;
      }
      setStatus({ message: "Contrasena actualizada con exito.", type: "success" });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setStatus({ message: err?.message || "Error de servidor", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Restablecer Contraseña</h2>
        
        {!token && <p className="error" style={{textAlign:'center'}}>Enlace inválido o expirado.</p>}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!token || loading}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!token || loading}
          />
          <button className="btn" type="submit" disabled={!token || loading}>
            {loading ? "Guardando..." : "Actualizar"}
          </button>
        </form>

        {status.message && (
          <p style={{ textAlign: 'center', marginTop: '15px', color: status.type === 'error' ? '#f48b6a' : '#4caf50' }}>
            {status.message}
          </p>
        )}
        
        {status.type === 'success' && (
           <div style={{textAlign:'center', marginTop:'10px'}}>
             <Link to="/" className="btn secondary">Ir al Login</Link>
           </div>
        )}
      </div>
    </div>
  );
}

export default ResetPage;