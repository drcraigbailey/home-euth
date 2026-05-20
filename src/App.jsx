// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react"; 
import { supabase } from "./supabase";
import Loader from "./Loader"; 

// --- CAPACITOR HARDWARE APP LINK ---
import { App as CapacitorApp } from "@capacitor/app";

// --- IMPORT YOUR LOGO HERE ---
import logoImage from "./assets/logo.png"; 

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
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };
const blueBtn = { background: "#5b8fb9", color: "white", ...standardBtnProps };

// --- HELPER: SCROLL TO TOP ON NAVIGATION ---
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

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

// 📌 GLOBAL NAVBAR WITH PERSISTENT BRANDING
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

  // Hide the global navbar entirely on the login screen
  if (location.pathname === "/login") return null;

  return (
    <div className="app-header" style={{ position: "relative", background: "white", paddingBottom: "10px" }}>
      
      {/* --- PERSISTENT BRANDING HEADER --- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "15px 10px" }}>
        <img src={logoImage} alt="SP Home Euthanasia Logo" style={{ height: "35px", objectFit: "contain" }} />
       <h2 style={{ 
  margin: 0, 
  fontSize: "18px", 
  color: "#2c3e50", 
  fontFamily: "Helvetica, Arial, sans-serif", // Standard, web-safe font stack
  fontWeight: "600" 
}}>
  SP Home Euthanasia
</h2>
      </div>

      <nav className="header-nav" style={{ position: "relative", width: "100%", padding: "0 10px" }}>
        <div className="nav-container-inner" style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          
          <div style={{ display: "flex", alignItems: "center", flex: 1, background: "#f8f9fb", borderRadius: "15px", border: "1px solid #eee", padding: "0 10px", minWidth: 0 }}>
            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none", flexShrink: 0 }}>&lt;</span>
            
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

// NATIVE HARDWARE BACK BUTTON LINK
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPathRef = useRef(location.pathname);
  
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const setupHardwareLink = async () => {
      return await CapacitorApp.addListener('backButton', () => {
        const path = currentPathRef.current;
        
        if (path === "/" || path === "/login") {
          CapacitorApp.exitApp();
        } else if (path.startsWith("/patient/")) {
          navigate("/patients");
        } else if (path.startsWith("/client/")) {
          navigate("/clients");
        } else {
          navigate(-1);
        }
      });
    };

    const initiationPromise = setupHardwareLink();

    return () => {
      initiationPromise.then(handlerInstance => {
        if (handlerInstance) handlerInstance.remove();
      });
    };
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <BackButtonHandler />
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