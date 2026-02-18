import { useState } from "react";
import { Link } from "react-router-dom";
import { registerRequest } from "../api";
import logoWolfHard from "../assets/logo-wolfhard.jpg";

function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
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
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err?.message || "Error registrando la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src={logoWolfHard} 
            alt="Wolf Hard" 
            style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '10px', objectFit:'cover' }} 
          />
          <h2 style={{ margin: 0 }}>Crear Cuenta</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Creando..." : "Registrarse"}
          </button>
        </form>

        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
           <Link to="/" style={{ color: 'var(--text-main)' }}>Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
