import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { logoutAndRedirect } from "../api"; 
import logoWolfHard from "../assets/logo-wolfhard.jpg";

const Layout = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Estado para controlar si el menú está abierto o cerrado en el celular
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutAndRedirect("/");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  // Función para cerrar el menú automáticamente al tocar un enlace
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Sombra de fondo (Overlay) - Solo visible cuando abres el menú en móvil */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`} 
        onClick={closeSidebar}
      />

      {/* --- BARRA LATERAL (SIDEBAR) --- */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <img src={logoWolfHard} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-brand">Wolf Hard</span>
          
          {/* Botón X para cerrar (Solo se ve en móvil gracias al CSS) */}
          <button className="close-menu-btn" onClick={closeSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              {/* Al hacer clic, llamamos a closeSidebar para que se cierre el menú */}
              <Link to="/dashboard" className={`nav-link ${isActive("/dashboard")}`} onClick={closeSidebar}>
                <span className="icon">📊</span> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/customers" className={`nav-link ${isActive("/customers")}`} onClick={closeSidebar}>
                <span className="icon">👥</span> Clientes
              </Link>
            </li>
            <li>
              <Link to="/agenda" className={`nav-link ${isActive("/agenda")}`} onClick={closeSidebar}>
                <span className="icon">📅</span> Agenda
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="icon">🚪</span> Salir
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="main-wrapper">
        {/* BARRA SUPERIOR (TOP NAVBAR) */}
        <header className="top-navbar">
          <div className="navbar-left">
            {/* Botón Hamburguesa ☰ (Solo se ve en móvil gracias al CSS) */}
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
            <h2 className="page-title">CRM Corporativo</h2>
          </div>
          <div className="navbar-right">
            <div className="user-profile">
              <span className="user-name">{user.name?.split(" ")[0] || "Usuario"}</span>
              <span className="user-role badge">{user.role || "Emp"}</span>
            </div>
          </div>
        </header>

        {/* AQUÍ SE CARGAN TUS PÁGINAS */}
        <main className="content-area">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;