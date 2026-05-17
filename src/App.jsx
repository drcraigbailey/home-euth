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
          <div className="nav-links-group" style={{ overflowX: "auto", display: "flex", whiteSpace: "nowrap", alignItems: "center" }}>
            
            {/* INVISIBLE SPACER: Safely forces empty space before "Home" starts */}
            <div style={{ flexShrink: 0, width: "50px", height: "1px" }}></div>
            
            <NavLink to="/" end className="nav-item">Home</NavLink>
            <NavLink to="/clients" className="nav-item">Clients</NavLink>
            <NavLink to="/patients" className="nav-item">Patients</NavLink> 
            <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
            <NavLink to="/products" className="nav-item">Products</NavLink>
            {isAdmin && <NavLink to="/admin" className="nav-item" style={{ color: "#e74c3c" }}>Admin</NavLink>}
            
            {/* INVISIBLE SPACER: Safely forces empty space at the end */}
            <div style={{ flexShrink: 0, width: "50px", height: "1px" }}></div>
          </div>

          {/* Left Arrow (Absolute Overlay) */}
          <div style={{
            position: "absolute",
            left: "0",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "55px",
            pointerEvents: "none",
            background: "linear-gradient(270deg, rgba(255,255,255,0) 0%, #fff 60%)",
            paddingLeft: "10px",
            height: "100%",
            zIndex: 1
          }}>
            <span style={{ color: "#5b8fb9", fontWeight: "900", fontSize: "20px", animation: "bounceLeft 1s infinite alternate" }}>{"❮"}</span>
          </div>

          {/* Right Arrow (Absolute Overlay) */}
          <div style={{
            position: "absolute",
            right: "85px", 
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "55px",
            pointerEvents: "none", 
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, #fff 60%)", 
            paddingRight: "15px",
            height: "100%",
            zIndex: 1
          }}>
            <span style={{ color: "#5b8fb9", fontWeight: "900", fontSize: "20px", animation: "bounceRight 1s infinite alternate" }}>{"❯"}</span>
          </div>

          <button onClick={logout} className="logout-btn-minimal" style={{ position: "relative", zIndex: 2 }}>Logout</button>
        </div>
      </nav>

      {/* Animations (Media query hiding arrows is strictly removed) */}
      <style>{`
        .nav-links-group::-webkit-scrollbar {
          display: none;
        }
        @keyframes bounceRight {
          0% { transform: translateX(0); opacity: 0.6; }
          100% { transform: translateX(4px); opacity: 1; }
        }
        @keyframes bounceLeft {
          0% { transform: translateX(0); opacity: 0.6; }
          100% { transform: translateX(-4px); opacity: 1; }
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