// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Loader from "./Loader"; // <-- Added custom loader

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
        <div className="nav-container-inner" style={{ position: "relative" }}>
          
          {/* Scrollable container element */}
          <div className="nav-links-group" style={{ overflowX: "auto", display: "flex", whiteSpace: "nowrap", paddingRight: "35px" }}>
            <NavLink to="/" end className="nav-item">Home</NavLink>
            <NavLink to="/clients" className="nav-item">Clients</NavLink>
            <NavLink to="/patients" className="nav-item">Patients</NavLink> 
            <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
            <NavLink to="/products" className="nav-item">Products</NavLink>
            {isAdmin && <NavLink to="/admin" className="nav-item" style={{ color: "#e74c3c" }}>Admin</NavLink>}
          </div>

          {/* Little Blue Scroll Indicator Arrow */}
          <div style={{
            position: "absolute",
            right: "85px", /* Positioned right before the logout button */
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none", /* Ensures it doesn't block touch/clicks */
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, #fff 40%)", /* Smooth blending backdrop */
            paddingLeft: "15px",
            height: "100%"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b8fb9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "bounceRight 1s infinite alternate" }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>

          <button onClick={logout} className="logout-btn-minimal" style={{ position: "relative", zIndex: 2 }}>Logout</button>
        </div>
      </nav>

      {/* Injecting a quick keyframe animation for a subtle breathing/bouncing effect */}
      <style>{`
        @keyframes bounceRight {
          0% { transform: translateX(0); opacity: 0.6; }
          100% { transform: translateX(4px); opacity: 1; }
        }
        /* Optional: Hide arrow on desktop screens where layout doesn't overflow */
        @media (min-width: 768px) {
          .nav-links-group { padding-right: 0 !important; }
          div[style*="pointerEvents: none"] { display: none !important; }
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