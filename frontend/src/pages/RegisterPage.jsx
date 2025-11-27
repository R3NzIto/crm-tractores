import { useState } from "react";
import { Link } from "react-router-dom";
import { registerRequest } from "../api";

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
    <div className="page">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="brand">
            <div className="brand-icon">T</div>
            <div>
              CRM Tractores
              <div className="muted" style={{ fontSize: "0.9rem" }}>
                Define tu rol: jefe para controlar, empleado para operar
              </div>
            </div>
          </div>
          <h1>Crear cuenta</h1>
          <p>
            Registra una cuenta para el equipo de venta o postventa. Selecciona
            tu rol para ver las funcionalidades correctas al ingresar.
          </p>
        </div>

        <div className="card auth-card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Datos de acceso</h3>
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
