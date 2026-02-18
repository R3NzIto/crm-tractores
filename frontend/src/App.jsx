// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPage from "./pages/ResetPage";
import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/CustomersPage";
import AgendaPage from "./pages/AgendaPage";
import Layout from "./components/Layout"; 
import "./App.css";
import PointsOfSalePage from "./pages/PointsOfSalePage";
import Rendimientos from "./pages/Rendimientos";
import AdminUsersPage from "./pages/AdminUsersPage";


function ProtectedRoute({ children }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const raw = localStorage.getItem("user");
  if (!raw) return <Navigate to="/" replace />;
  try {
    const user = JSON.parse(raw);
    if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
  } catch {
    return <Navigate to="/" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas (Sin menú lateral) */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset" element={<ResetPage />} />

        {/* Rutas Protegidas (Con Layout Profesional) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/customers" element={<CustomersPage />} />
           <Route path="/agenda" element={<AgendaPage />} />
           <Route path="/pos" element={<PointsOfSalePage />} />
           <Route path="analytics" element={<Rendimientos />} />
           <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
