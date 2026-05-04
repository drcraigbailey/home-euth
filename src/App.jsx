import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
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

// 🔒 Protected route component[cite: 5]
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

  if (session === undefined) return <div>Loading...</div>;

  if (!session) {
    window.location.href = "/login";
    return null;
  }

  return children;
}

// 🔥 NAVBAR[cite: 5]
function Navbar() {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (location.pathname === "/login") return null;

  return (
    <div className="navbar">
      {/* Container to keep the grey pill centered and correctly sized */}
      <div className="page" style={{ margin: '15px auto 0 auto' }}>
        <div className="navbar-inner">

          <NavLink to="/" end className="nav-btn">Clients</NavLink>
          <NavLink to="/patients" className="nav-btn">Patients</NavLink> 
          <NavLink to="/sedation" className="nav-btn">Sedation</NavLink>
          <NavLink to="/protocols" className="nav-btn">Protocols</NavLink>

          <button onClick={logout} className="nav-btn logout-btn">
            Logout
          </button>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />

      <Routes>

        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/:id"
          element={
            <ProtectedRoute>
              <ClientDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/:id"
          element={
            <ProtectedRoute>
              <PatientDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sedation"
          element={
            <ProtectedRoute>
              <Sedation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sedation/:id"
          element={
            <ProtectedRoute>
              <Sedation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/protocols"
          element={
            <ProtectedRoute>
              <Protocols />
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  );
}