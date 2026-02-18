import { useCallback, useEffect, useState } from "react";
import { createUserByAdmin, deleteUserByAdmin, getUsers } from "../api";

const ROLE_OPTIONS = [
  { value: "employee", label: "Empleado" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createUserByAdmin(form);
      setForm({ name: "", email: "", password: "", role: "employee" });
      await loadUsers();
    } catch (err) {
      setError(err?.message || "No se pudo crear el usuario");
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Eliminar usuario ${user.name}?`);
    if (!confirmed) return;
    setError("");
    try {
      await deleteUserByAdmin(user.id);
      await loadUsers();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el usuario");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Panel Admin - Usuarios</h2>
        <span className="tag">{users.length} usuarios</span>
      </div>

      <div className="card">
        <h3 style={{ margin: 0 }}>Crear usuario</h3>
        <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="toolbar" style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit" disabled={loading}>
              Crear usuario
            </button>
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Listado de usuarios</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => handleDelete(user)}
                      disabled={currentUser.id === user.id}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted">
                    Sin usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
