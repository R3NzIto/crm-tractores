import { useEffect, useMemo, useState } from "react";
import { getCustomers, logoutAndRedirect } from "../api";

function Dashboard() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem("token");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isJefe = user?.role === "jefe" || user?.role === "admin" || user?.role === "manager";
  const isEmpleado = user?.role === "empleado";

  useEffect(() => {
    async function load() {
      if (!token) {
        logoutAndRedirect("/");
        return;
      }
      try {
        const data = await getCustomers(token, { force: true });
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.unauthorized) {
          logoutAndRedirect("/");
          return;
        }
        setError(err?.message || "No pudimos cargar clientes");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const stats = useMemo(() => {
    const total = customers.length;
    const conCorreo = customers.filter((c) => c.email).length;
    const potencial = customers.filter((c) => !c.email).length;
    return [
      { label: "Clientes activos", value: total || 0 },
      { label: "Contactos con correo", value: conCorreo },
      { label: "Leads por contactar", value: potencial },
      { label: "Equipos en seguimiento", value: Math.max(total - 1, 0) },
    ];
  }, [customers]);

  if (!user) {
    logoutAndRedirect("/");
    return null;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="brand">
          <div className="brand-icon">T</div>
          <div>
            CRM Tractores
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              Operaciones y relacion con clientes
            </div>
          </div>
        </div>
        <div className="status-bar">
          <div className="tag">
            <span className="status-dot" />
            {user.name} · {user.role}
          </div>
          <button className="btn secondary" onClick={() => (window.location.href = "/customers")}>
            Clientes
          </button>
          <button className="btn danger" onClick={() => logoutAndRedirect("/")}>
            Cerrar sesion
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="page-header" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>{isJefe ? "Panel de Jefe" : "Panel de Empleado"}</h2>
          <span className="pill">
            {isJefe ? "Control total · asigna y decide" : "Modo operativo · seguimiento"}
          </span>
        </div>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Cargando resumen...</p>
        ) : (
          <div className="kpi-grid">
            {stats.map((s) => (
              <div key={s.label} className="kpi-card">
                <div className="kpi-title">{s.label}</div>
                <div className="kpi-value">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Accesos rapidos</h3>
        <div className="toolbar">
          <button className="btn" onClick={() => (window.location.href = "/customers")}>
            Ver clientes
          </button>
          {isJefe ? (
            <>
              <button className="btn secondary" disabled>
                Asignar cartera (pronto)
              </button>
              <button className="btn secondary" disabled>
                Reportes ventas (pronto)
              </button>
              <button className="btn secondary" onClick={() => (window.location.href = "/agenda")}>
                Agenda equipo
              </button>
            </>
          ) : (
            <>
              <button className="btn secondary" onClick={() => (window.location.href = "/agenda")}>
                Mi agenda
              </button>
              <button className="btn secondary" disabled>
                Seguimiento postventa (pronto)
              </button>
            </>
          )}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {isJefe
            ? "Como jefe puedes crear/editar clientes, asignar cuentas y revisar performance."
            : "Como empleado puedes consultar clientes y apoyar en seguimiento; la edicion se limita al rol jefe."}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
