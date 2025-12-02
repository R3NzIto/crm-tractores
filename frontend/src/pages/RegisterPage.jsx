import { useState } from "react";
import { Link } from "react-router-dom";
import { registerRequest } from "../api";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1610476208552-030dc016d98c?auto=format&fit=crop&w=1400&q=80";

const ROLE_OPTIONS = [
  { value: "jefe", label: "Jefe / Administrador" },
  { value: "empleado", label: "Empleado" },
];

function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "empleado",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await registerRequest(form);
      if (!ok) {
        setError(data?.message || "No pudimos registrar la cuenta");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err?.message || "Error registrando la cuenta");
    } finally {
      setLoading(false);
    }
  };

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
                <div className="muted small">Equipos, repuestos y postventa</div>
              </div>
            </div>
          </div>

          <div className="auth-hero-copy">
            <p className="eyebrow">Registro</p>
            <h1>La fuerza que impulsa tu campo</h1>
            <p>
              Conecta ventas, equipos y servicio postventa en un CRM con el mismo
              caracter robusto de tu maquinaria.
            </p>
            <div className="hero-tags">
              <span className="tag">Control de equipos</span>
              <span className="tag">Agenda y visitas</span>
              <span className="tag">Posventa que responde</span>
            </div>
            <button className="btn hero-cta" type="button">
              Conoce nuestros modulos
            </button>
          </div>
        </div>

        <div className="card auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>
                Datos de acceso
              </p>
              <h3 style={{ margin: 0 }}>Crear cuenta</h3>
              <p className="muted small">
                Selecciona jefe/administrador para controlar el equipo o empleado
                para operar.
              </p>
            </div>
            <div className="auth-badge">Wolf Hard</div>
          </div>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="Nombre completo"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contrasena"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
            <select
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
          <p className="muted" style={{ marginTop: 10 }}>
            ¿Ya tienes cuenta? <Link to="/">Iniciar sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
