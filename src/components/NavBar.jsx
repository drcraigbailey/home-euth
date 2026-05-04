import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "../supabase";

export default function NavBar() {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Hide Navbar on Login page
  if (location.pathname === "/login") return null;

  return (
    <div className="navbar">
      <div className="page">
        <div className="navbar-inner">
          {/* Logo - Optional: remove if you don't have /logo.png */}
          <img src="/logo.png" className="logo" alt="logo" style={{ height: '30px' }} />

          <NavLink to="/" end className="nav-btn">
            Clients
          </NavLink>

          {/* 🔥 New Patients Link */}
          <NavLink to="/patients" className="nav-btn">
            Patients
          </NavLink>

          <NavLink to="/sedation" className="nav-btn">
            Sedation
          </NavLink>

          <NavLink to="/protocols" className="nav-btn">
            Protocols
          </NavLink>

          <button onClick={logout} className="nav-btn logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}