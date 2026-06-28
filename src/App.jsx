// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react"; 
import { supabase } from "./supabase";
import Loader from "./Loader"; 
import OfflineStatusBanner from "./components/OfflineStatusBanner";

// --- CAPACITOR HARDWARE APP LINK ---
import { App as CapacitorApp } from "@capacitor/app";

// pages
import Login from "./pages/Login";
import Home from "./pages/Home"; 
import Clients from "./pages/Clients";
import Patients from "./pages/Patients"; 
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail";
import Sedation from "./pages/Sedation";
import Products from "./pages/Products"; 
import Library from "./pages/Library";
import AdminDashboard from "./pages/AdminDashboard";

// --- GLOBAL UNIFORM STYLING CONSTANTS ---
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };
const blueBtn = { background: "#5b8fb9", color: "white", ...standardBtnProps };

// --- HELPER: SCROLL TO TOP ON NAVIGATION ---
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Instantly snaps the page to the top
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
          
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none", flexShrink: 0 }}>&lt;</span>
            
            <div className="nav-links-group" style={{ overflowX: "auto", display: "flex", whiteSpace: "nowrap", alignItems: "center", flex: 1, padding: "10px 0", minWidth: 0 }}>
              <NavLink to="/" end className="nav-item">Home</NavLink>
              <NavLink to="/clients" className="nav-item">Clients</NavLink>
              <NavLink to="/patients" className="nav-item">Patients</NavLink> 
              <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
              <NavLink to="/products" className="nav-item">Products</NavLink>
              <NavLink to="/library" className="nav-item">Library</NavLink>
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

// FIXED: Native Hardware Back Button Link with Single-Instance Listener Protection
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Create a mutable path reference so the listener callback stays updated without duplicate attachments
  const currentPathRef = useRef(location.pathname);
  
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const setupHardwareLink = async () => {
      return await CapacitorApp.addListener('backButton', () => {
        const path = currentPathRef.current;
        
        // 1. Core structural exit paths
        if (path === "/" || path === "/login") {
          CapacitorApp.exitApp();
        } 
        // 2. Structured parent routing: Force patient profiles to return directly to the full records deck
        else if (path.startsWith("/patient/")) {
          navigate("/patients");
        } 
        // 3. Structured parent routing: Force specific client files to return directly to the general clients list
        else if (path.startsWith("/client/")) {
          navigate("/clients");
        } 
        // 4. Default safe fallback (Traces chronological path back exactly one step without skipping)
        else {
          navigate(-1);
        }
      });
    };

    const initiationPromise = setupHardwareLink();

    // Clean up cleanly on unmount to make sure no duplicate event paths persist
    return () => {
      initiationPromise.then(handlerInstance => {
        if (handlerInstance) handlerInstance.remove();
      });
    };
  }, [navigate]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const lastRefreshRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    function refreshAfterOfflineChange(event) {
      if (location.pathname === "/login") return;
      const kind = event?.detail?.kind;
      if (kind && kind !== "records") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 1500) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        lastRefreshRef.current = Date.now();
        setRefreshVersion((version) => version + 1);
      }, 250);
    }

    window.addEventListener("offline-data-changed", refreshAfterOfflineChange);
    return () => {
      window.removeEventListener("offline-data-changed", refreshAfterOfflineChange);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  return (
    <Routes key={`${location.pathname}:${refreshVersion}`}>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/client/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/patient/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/sedation" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
      <Route path="/sedation/:id" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop /> {/* <--- FORCES SCROLL TO TOP ON PAGE CHANGE */}
      <BackButtonHandler />
      <Navbar /> 
      <OfflineStatusBanner />
      <AppRoutes />
    </Router>
  );
}
