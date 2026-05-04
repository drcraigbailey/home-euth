import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// pages
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import Patients from "./pages/Patients"; 
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail";
import Sedation from "./pages/Sedation";
import Protocols from "./pages/Protocols";

// 🔒 Protected route component
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 🔥 MINIMALIST HORIZONTAL NAVBAR (No Branding)
function Navbar() {
  const location = useLocation();

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
            <NavLink to="/" end className="nav-item">Clients</NavLink>
            <NavLink to="/patients" className="nav-item">Patients</NavLink> 
            <NavLink to="/sedation" className="nav-item">Sedation</NavLink>
            <NavLink to="/protocols" className="nav-item">Protocols</NavLink>
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
      <Navbar /> {/* Must stay inside Router to prevent crash */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/client/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/patient/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/sedation" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
        <Route path="/sedation/:id" element={<ProtectedRoute><Sedation /></ProtectedRoute>} />
        <Route path="/protocols" element={<ProtectedRoute><Protocols /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}