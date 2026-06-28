// AppWeb.jsx
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
import Settings from "./pages/Settings";

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

  const navItems = [
    { to: "/", label: "Home", end: true },
    { to: "/clients", label: "Clients" },
    { to: "/patients", label: "Patients" },
    { to: "/sedation", label: "Sedation" },
    { to: "/products", label: "Products" },
    { to: "/library", label: "Library" },
    { to: "/settings", label: "Settings" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", admin: true }] : []),
  ];

  return (
    <div className="app-header" style={{ position: "relative" }}>
      <nav className="header-nav" style={{ position: "relative", width: "100%" }}>
        <div className="nav-container-inner" style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none", flexShrink: 0 }}>&lt;</span>
            <div className="nav-links-group" style={{ overflowX: "auto", display: "flex", whiteSpace: "nowrap", alignItems: "center", flex: 1, padding: "10px 0", minWidth: 0 }}>
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav-item" style={item.admin ? { color: "#e74c3c" } : undefined}>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingLeft: "5px", userSelect: "none", flexShrink: 0 }}>&gt;</span>
          </div>
          <button onClick={logout} className="logout-btn-minimal" style={{ position: "relative", zIndex: 2, flexShrink: 0 }}>Logout</button>
        </div>
      </nav>

      <style>{`
        .nav-links-group::-webkit-scrollbar { display: none; }
        .nav-links-group { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// FIXED: Native Hardware Back Button Link with Single-Instance Listener Protection
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
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

export default function AppWeb() {
  return (
    <Router>
      <ScrollToTop />
      <BackButtonHandler />
      <Navbar /> 
      <OfflineStatusBanner />
      <AppRoutes />
    </Router>
  );
}
