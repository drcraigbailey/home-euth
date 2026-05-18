// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Loader from "./Loader"; 

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

// --- GLOBAL UNIFORM STYLING CONSTANTS ---
// Kept globally available to ensure seamless framework extension parity
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };
const blueBtn = { background: "#5b8fb9", color: "white", ...standardBtnProps };

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
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Authenticating...</p>
      </div>
    );
  }
  
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

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
    <div className="app-header" style={{ position: "relative" }}>
      <nav className="header-nav" style={{ position: "relative", width: "100%" }}>
        <div className="nav-container-inner" style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          
          {/* MAIN NAVBAR CONTAINER WITH MIN-WIDTH CORRECTION TO FORCE SCROLLING */}
          <div style={{ display: "flex", alignItems: "center", flex: 1, background: "white", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "0 10px", minWidth: 0 }}>
            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none", flexShrink: 0 }}>&lt;</span>
            
            {/* Scrollable container element */}
            <div className="nav-links-group" style={{ overflowX: "auto", display: "flex", whiteSpace: "nowrap", alignItems: "center", flex: 1, padding: "10px 0", minWidth: 0 }}>
              <NavLink to="/" end className="nav-item">Home</NavLink>
              <NavLink to="/clients" className="nav-item">Clients</NavLink>
              <NavLink to="/patients" className="nav-item">Patients</NavLink> 
              <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
              <NavLink to="/products" className="nav-item">Products</NavLink>
              {isAdmin && <NavLink to="/admin" className="nav-item" style={{ color: "#e74c3c" }}>Admin</NavLink>}
            </div>

            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingLeft: "5px", userSelect: "none", flexShrink: 0 }}>&gt;</span>
          </div>

          <button onClick={logout} className="logout-btn-minimal" style={{ position: "relative", zIndex: 2, flexShrink: 0 }}>Logout</button>
        </div>
      </nav>

      {/* Styles */}
      <style>{`
        .nav-links-group::-webkit-scrollbar {
          display: none;
        }
        .nav-links-group {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
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