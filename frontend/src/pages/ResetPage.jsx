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
    if (!password || password.length < 6) {
      setStatus({ message: "La contrasena debe tener al menos 6 caracteres", type: "error" });
      return;
    }
    if (password !== confirm) {
      setStatus({ message: "Las contrasenas no coinciden", type: "error" });
      return;
    }
    setLoading(true);
    setStatus({ message: "", type: "" });
    try {
      const { ok, data } = await resetPassword(token, password);
      if (!ok) {
        setStatus({ message: data?.message || "No pudimos actualizar la contrasena", type: "error" });
        return;
      }
      setStatus({ message: data?.message || "Contrasena actualizada. Ya puedes iniciar sesion.", type: "success" });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setStatus({ message: err?.message || "No pudimos actualizar la contrasena", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="auth-card-header">
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              Recuperar acceso
            </p>
            <h3 style={{ margin: 0 }}>Restablecer contrasena</h3>
            <p className="muted small">
              Ingresa tu nueva contrasena para completar el cambio.
            </p>
          </div>
        </div>
        {!token && (
          <p className="error">Falta el token. Revisa el enlace enviado a tu correo.</p>
        )}
        <form onSubmit={handleReset} className="form-grid">
          <input
            type="password"
            placeholder="Nueva contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!token || loading}
          />
          <input
            type="password"
            placeholder="Confirmar contrasena"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!token || loading}
          />
          <div className="toolbar">
            <button className="btn" type="submit" disabled={!token || loading}>
              {loading ? "Guardando..." : "Actualizar contrasena"}
            </button>
            <Link className="btn secondary" to="/">
              Volver al login
            </Link>
          </div>
        </form>
        {status.message && (
          <p className={status.type === "error" ? "error" : "muted"} style={{ marginTop: 8 }}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ResetPage;
