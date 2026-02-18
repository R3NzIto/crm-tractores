import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { logoutAndRedirect } from "../api"; 
import logoWolfHard from "../assets/logo-wolfhard.jpg";

// IMPORTAMOS EL MODAL DE VENTA
import RegisterSaleModal from "../components/RegisterSaleModal"; 

const Layout = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Roles con privilegios elevados
  const isJefe = user?.role === 'admin' || user?.role === 'manager'; 
  const isAdmin = user?.role === 'admin';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const handleLogout = () => {
    logoutAndRedirect("/");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Sombra de fondo (Solo móvil) */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`} 
        onClick={closeSidebar}
      />

      {/* --- BARRA LATERAL (SIDEBAR) --- */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <img src={logoWolfHard} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-brand">Wolf Hard</span>
          <button className="close-menu-btn" onClick={closeSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/dashboard" className={`nav-link ${isActive("/dashboard")}`} onClick={closeSidebar}>
                <span className="icon">📊</span> Dashboard
              </Link>
            </li>
            
            {/* 👇 NUEVA SECCIÓN: RENDIMIENTOS (Solo roles con permiso) */}
            {isJefe && (
              <li>
                <Link to="/analytics" className={`nav-link ${isActive("/analytics")}`} onClick={closeSidebar}>
                  <span className="icon">📈</span> Rendimientos
                </Link>
              </li>
            )}

            {isAdmin && (
              <li>
                <Link to="/admin/users" className={`nav-link ${isActive("/admin/users")}`} onClick={closeSidebar}>
                  <span className="icon">ADM</span> Panel Admin
                </Link>
              </li>
            )}

            <li>
              <Link to="/customers" className={`nav-link ${isActive("/customers")}`} onClick={closeSidebar}>
                <span className="icon">👥</span> Clientes
              </Link>
            </li>

            {isJefe && (
              <li>
                <Link to="/pos" className={`nav-link ${isActive("/pos")}`} onClick={closeSidebar}>
                  <span className="icon">🏭</span> Puntos de Venta
                </Link>
              </li>
            )}

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
        <header className="top-navbar">
          <div className="navbar-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
            <h2 className="page-title">CRM Corporativo</h2>
          </div>
          
          <div className="navbar-actions">
            <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{textAlign: 'right', lineHeight: '1.2'}}>
                  <span className="user-name" style={{display: 'block', fontWeight: 'bold'}}>{user.name?.split(" ")[0] || "Usuario"}</span>
                  <span className="user-role badge" style={{fontSize: '0.75rem', opacity: 0.8}}>{user.role || "Emp"}</span>
                </div>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: '#333', color: 'white', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                    {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
              </div>
            </div>

            <button 
              className="btn floating-sale-btn"
              onClick={() => setIsSaleModalOpen(true)}
              aria-label="Nueva Venta"
            >
              💰 Venta
            </button>
          </div>
        </header>

        {/* AQUÍ SE CARGAN TUS PÁGINAS (Dashboard, Rendimientos, etc) */}
        <main className="content-area">
          <Outlet /> 
        </main>
      </div>

      {/* --- MODAL FLOTANTE DE VENTA --- */}
      <RegisterSaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
      />
    </div>
  );
};

export default Layout;
