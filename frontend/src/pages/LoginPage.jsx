import { useState } from "react";
import { loginRequest, forgotPassword } from "../api";
import { Link } from "react-router-dom";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

function LoginPage() {
  const [email, setEmail] = useState("admin@empresa.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Eliminamos 'email' de resetInfo porque usaremos el principal
  const [resetInfo, setResetInfo] = useState({ message: "", sending: false });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { ok, data } = await loginRequest(email, password);

      if (!ok) {
        setError(data.message || "Usuario o contrasena incorrectos");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err?.message || "No pudimos iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    // CORRECCIÓN: Ahora usa la variable 'email' del formulario principal
    if (!email.trim()) {
      setResetInfo((prev) => ({ ...prev, message: "⚠️ Escribe tu correo en el campo de arriba primero." }));
      return;
    }
    setResetInfo((prev) => ({ ...prev, sending: true, message: "" }));
    try {
      const { data } = await forgotPassword(email);
      setResetInfo((prev) => ({
        ...prev,
        message: data?.message || "✅ Si el correo existe, enviaremos instrucciones.",
      }));
    } catch (err) {
      setResetInfo((prev) => ({
        ...prev,
        message: err?.message || "❌ Error al solicitar recuperacion",
      }));
    } finally {
      setResetInfo((prev) => ({ ...prev, sending: false }));
    }
  }

  return (
    <div className="auth-container">
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src={logoWolfHard} 
            alt="Wolf Hard" 
            style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '15px', objectFit:'cover' }} 
          />
          <h2 style={{ margin: '0 0 5px 0' }}>Wolf Hard CRM</h2>
          <p className="muted" style={{ margin: 0 }}>Acceso Corporativo</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button className="btn" type="submit" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          <p className="muted">
            ¿Olvidaste tu contraseña?{" "}
            <button 
              onClick={handleForgot} 
              disabled={resetInfo.sending}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {resetInfo.sending ? "Enviando..." : "Recuperar"}
            </button>
          </p>
          {resetInfo.message && <p className="muted small" style={{marginTop: '5px'}}>{resetInfo.message}</p>}
          
          <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
             <Link to="/register" style={{ color: 'var(--text-main)' }}>¿No tienes cuenta? Regístrate</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;