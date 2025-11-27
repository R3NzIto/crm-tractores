import { useState } from "react";
import { loginRequest } from "../api";
import { Link } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("admin@empresa.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="page">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="brand">
            <div className="brand-icon">T</div>
            <div>
              CRM Tractores
              <div className="muted" style={{ fontSize: "0.9rem" }}>
                Control de clientes, ventas y servicio postventa
              </div>
            </div>
          </div>
          <h1>Potencia tus relaciones</h1>
          <p>
            Gestiona clientes, cotizaciones y servicios de maquinaria pesada en
            un solo lugar.
          </p>
        </div>

        <div className="card auth-card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Iniciar sesion</h3>
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
            ¿Sin cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
