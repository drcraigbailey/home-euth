import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabase";

export default function Nav() {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // hide nav on login page
  if (location.pathname === "/login") return null;

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      marginTop: "20px"
    }}>
      <div style={{
        display: "flex",
        gap: "10px",
        background: "#e5e7eb",
        padding: "8px",
        borderRadius: "30px"
      }}>

        <NavButton to="/" label="Clients" current={location.pathname} />
        <NavButton to="/sedation" label="Sedation" current={location.pathname} />
        <NavButton to="/protocols" label="Protocols" current={location.pathname} />

        <button
          onClick={logout}
          style={{
            padding: "10px 18px",
            borderRadius: "20px",
            border: "none",
            background: "#ef4444",
            color: "white",
            cursor: "pointer"
          }}
        >
          Logout
        </button>

      </div>
    </div>
  );
}

// 🔥 helper for active styling
function NavButton({ to, label, current }) {
  const isActive = current === to;

  return (
    <Link to={to}>
      <button
        style={{
          padding: "10px 18px",
          borderRadius: "20px",
          border: "none",
          cursor: "pointer",
          background: isActive ? "#3b82f6" : "transparent",
          color: isActive ? "white" : "#111827"
        }}
      >
        {label}
      </button>
    </Link>
  );
}