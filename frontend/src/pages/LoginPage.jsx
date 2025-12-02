import { useState } from "react";
import { loginRequest, forgotPassword } from "../api";
import { Link } from "react-router-dom";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1610476208552-030dc016d98c?auto=format&fit=crop&w=1400&q=80";

function LoginPage() {
  const [email, setEmail] = useState("admin@empresa.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetInfo, setResetInfo] = useState({ email: "", message: "", sending: false });

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
    if (!resetInfo.email.trim()) {
      setResetInfo((prev) => ({ ...prev, message: "Ingresa tu correo para recuperar" }));
      return;
    }
    setResetInfo((prev) => ({ ...prev, sending: true, message: "" }));
    try {
      const { data } = await forgotPassword(resetInfo.email);
      setResetInfo((prev) => ({
        ...prev,
        message: data?.message || "Si el correo existe, enviaremos instrucciones.",
      }));
    } catch (err) {
      setResetInfo((prev) => ({
        ...prev,
        message: err?.message || "No pudimos iniciar el proceso de recuperacion",
      }));
    } finally {
      setResetInfo((prev) => ({ ...prev, sending: false }));
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-layout">
        <div
          className="auth-hero"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(186, 24, 27, 0.82), rgba(12, 10, 11, 0.55)), url(${HERO_IMAGE})`,
          }}
        >
          <div className="hero-topbar">
            <div className="brand brand-strong">
              <img src={logoWolfHard} alt="Wolf Hard" className="brand-logo" />
              <div>
                Wolf Hard CRM
                <div className="muted small">Control de clientes y equipos</div>
              </div>
            </div>
          </div>

          <div className="auth-hero-copy">
            <p className="eyebrow">Ingreso</p>
            <h1>Potencia tus relaciones</h1>
            <p>
              Gestiona clientes, cotizaciones y servicios de maquinaria pesada en
              un solo lugar.
            </p>
            <div className="hero-tags">
              <span className="tag">CRM de campo</span>
              <span className="tag">Equipos y repuestos</span>
              <span className="tag">Agenda posventa</span>
            </div>
            <Link className="btn hero-cta" to="/register">
              Crea una cuenta
            </Link>
          </div>
        </div>

        <div className="card auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>
                Acceso
              </p>
              <h3 style={{ margin: 0 }}>Iniciar sesion</h3>
              <p className="muted small">
                Usa tu correo corporativo para ingresar al CRM de Wolf Hard.
              </p>
            </div>
            <div className="auth-badge">Wolf Hard</div>
          </div>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Entrar"}
            </button>

            {error && <p className="error">{error}</p>}
          </form>
          <p className="muted" style={{ marginTop: 10 }}>
            Sin cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
          <div className="card" style={{ marginTop: 10, padding: 12 }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              Olvide mi contrasena
            </p>
            <div className="form-grid compact">
              <input
                type="email"
                placeholder="Correo para recuperar"
                value={resetInfo.email}
                onChange={(e) => setResetInfo({ ...resetInfo, email: e.target.value })}
              />
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleForgot}
                  disabled={resetInfo.sending}
                >
                  {resetInfo.sending ? "Enviando..." : "Enviar instrucciones"}
                </button>
              </div>
            </div>
            {resetInfo.message && <p className="muted small">{resetInfo.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
