import { NavLink } from "react-router-dom";

function mobileNavLinkStyle({ isActive, isAdmin }) {
  return {
    flex: "1 1 92px",
    minWidth: "86px",
    textAlign: "center",
    color: isAdmin ? "#e74c3c" : (isActive ? "#1f4f6d" : "#3f6f93"),
    background: isActive ? "#dcecf5" : "white",
    border: "1px solid #d6e6f1",
    borderRadius: "12px",
    padding: "10px 8px",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "13px",
    boxShadow: isActive ? "0 2px 8px rgba(91,143,185,0.22)" : "0 1px 4px rgba(0,0,0,0.05)",
  };
}

export default function AppMobileMenu({ navItems, logout }) {
  return (
    <div className="app-header" style={{ background: "#f8fbfd", borderBottom: "1px solid #d6e6f1", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", maxWidth: "1200px", margin: "0 auto" }}>
        <strong style={{ color: "#2f5f7f", fontSize: "15px", whiteSpace: "nowrap" }}>SP Home Euth</strong>
        <button onClick={logout} className="logout-btn-minimal" style={{ flexShrink: 0 }}>Logout</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxWidth: "1200px", margin: "10px auto 0" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => mobileNavLinkStyle({ isActive, isAdmin: item.admin })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
