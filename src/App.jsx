import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// pages
import Login from "./pages/Login";
import Home from "./pages/Home"; 
import Clients from "./pages/Clients";
import Patients from "./pages/Patients"; 
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail";
import Sedation from "./pages/Sedation";
import Products from "./pages/Products"; 
import AdminDashboard from "./pages/AdminDashboard";

// 🔒 Protected route component
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8f9fb" }}>
        <style>
          {`
            @keyframes pawWalk {
              0% { opacity: 0; transform: translateY(5px); }
              25% { opacity: 1; transform: translateY(0); }
              50% { opacity: 0; transform: translateY(-5px); }
              100% { opacity: 0; }
            }
          `}
        </style>
        <div style={{ position: "relative", width: "100px", height: "120px", marginBottom: "10px" }}>
          {/* Paw 1 (Bottom Left) - Replaced with hallow outline paw, keeping blue colour */}
          <svg viewBox="0 0 512 512" width="35" height="35" fill="none" stroke="#5b8fb9" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", bottom: "10px", left: "10px", transform: "rotate(-15deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "0s", opacity: 0 }}>
            <path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/>
          </svg>
          {/* Paw 2 (Middle Right) */}
          <svg viewBox="0 0 512 512" width="35" height="35" fill="none" stroke="#5b8fb9" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", top: "40px", right: "15px", transform: "rotate(15deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "0.5s", opacity: 0 }}>
            <path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/>
          </svg>
          {/* Paw 3 (Top Left) */}
          <svg viewBox="0 0 512 512" width="35" height="35" fill="none" stroke="#5b8fb9" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", top: "0px", left: "20px", transform: "rotate(-5deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "1s", opacity: 0 }}>
            <path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/>
          </svg>
        </div>
        <p style={{ marginTop: "10px", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Authenticating...</p>
      </div>
    );
  }
  
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

// 🔥 MINIMALIST HORIZONTAL NAVBAR
function Navbar() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
        setIsAdmin(!!data?.is_admin);
      }
    }
    checkAdmin();
  }, [location.pathname]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (location.pathname === "/login") return null;

  return (
    <div className="app-header">
      <nav className="header-nav">
        <div className="nav-container-inner">
          <div className="nav-links-group">
            <NavLink to="/" end className="nav-item">Home</NavLink>
            <NavLink to="/clients" className="nav-item">Clients</NavLink>
            <NavLink to="/patients" className="nav-item">Patients</NavLink> 
            <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
            <NavLink to="/products" className="nav-item">Products</NavLink>
            {isAdmin && <NavLink to="/admin" className="nav-item" style={{ color: "#e74c3c" }}>Admin</NavLink>}
          </div>
          <button onClick={logout} className="logout-btn-minimal">Logout</button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar /> 
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/client/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/patient/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/sedation" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
        <Route path="/sedation/:id" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}