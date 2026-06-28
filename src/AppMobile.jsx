import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const BLUE = "#5b8fb9";
const DARK = "#2f4153";
const ADMIN_RED = "#e74c3c";

function Icon({ name, active = false, danger = false }) {
  const color = danger ? ADMIN_RED : active ? DARK : BLUE;
  const common = {
    width: 31,
    height: 31,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.35,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { display: "block" },
  };

  if (name === "home") return (
    <svg {...common}><path d="M3 10.8 12 3l9 7.8" /><path d="M5.4 9.4V21h5.1v-6.2h3V21h5.1V9.4" /></svg>
  );
  if (name === "clients") return (
    <svg {...common}><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M2.8 20c.5-3.2 2.4-5 5.2-5s4.7 1.8 5.2 5" /><path d="M17 10a2.6 2.6 0 1 0 0-5.2" /><path d="M15.8 14.5c2.6.2 4.4 1.9 4.9 5.1" /></svg>
  );
  if (name === "patients") return (
    <svg {...common}><circle cx="7" cy="15" r="2.7" /><circle cx="14.8" cy="17" r="2.4" /><circle cx="16" cy="7" r="2.2" /><circle cx="8.7" cy="6.2" r="1.8" /><path d="M10.2 13.2c1-2 2.3-3.1 4-3.6" /></svg>
  );
  if (name === "sedation") return (
    <svg {...common}><path d="m6 18 8.8-8.8" /><path d="m11.7 6.3 6 6" /><path d="m14.2 3.8 6 6" /><path d="M4 20l2.5-1" /><path d="M14.8 9.2 12.6 7" /></svg>
  );
  if (name === "more") return (
    <svg {...common}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
  );
  if (name === "products") return (
    <svg {...common}><path d="m12 3 7 4v8l-7 4-7-4V7l7-4Z" /><path d="M5 7l7 4 7-4" /><path d="M12 11v8" /></svg>
  );
  if (name === "library") return (
    <svg {...common}><path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z" /><path d="M7 16h11" /><path d="M8 7h7" /></svg>
  );
  if (name === "admin") return (
    <svg {...common}><path d="M12 3 19 6v5c0 4.4-2.7 7.5-7 9-4.3-1.5-7-4.6-7-9V6l7-3Z" /></svg>
  );
  if (name === "logout") return (
    <svg {...common}><path d="M10 5H5v14h5" /><path d="M13 8l4 4-4 4" /><path d="M8 12h9" /></svg>
  );
  return null;
}

function BottomItem({ to, label, icon, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      style={({ isActive }) => ({
        flex: "1 1 0",
        minWidth: 0,
        textDecoration: "none",
        color: isActive ? DARK : BLUE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        fontSize: "14px",
        fontWeight: 700,
        lineHeight: 1.1,
      })}
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} active={isActive} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function MoreRow({ to, label, icon, danger = false, onClick }) {
  const content = ({ isActive = false } = {}) => (
    <>
      <Icon name={icon} active={isActive} danger={danger} />
      <span>{label}</span>
    </>
  );

  const style = ({ isActive = false } = {}) => ({
    width: "100%",
    border: "none",
    background: "transparent",
    color: danger ? ADMIN_RED : isActive ? DARK : BLUE,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "15px 20px",
    fontSize: "23px",
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
  });

  if (to) {
    return (
      <NavLink to={to} onClick={onClick} style={style}>
        {({ isActive }) => content({ isActive })}
      </NavLink>
    );
  }

  return (
    <button type="button" onClick={onClick} style={style()}>
      {content()}
    </button>
  );
}

export default function AppMobileMenu({ navItems, logout }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = navItems.some((item) => item.admin);
  const moreActive = ["/products", "/library", "/settings", "/admin"].some((path) => location.pathname.startsWith(path));

  function closeMore() {
    setMoreOpen(false);
  }

  async function handleLogout() {
    setMoreOpen(false);
    await logout();
  }

  return (
    <>
      <style>{`
        body { padding-bottom: calc(82px + env(safe-area-inset-bottom, 0px)); }
      `}</style>

      {moreOpen && (
        <div
          style={{
            position: "fixed",
            right: "14px",
            bottom: "calc(86px + env(safe-area-inset-bottom, 0px))",
            width: "min(330px, calc(100vw - 28px))",
            background: "white",
            borderRadius: "26px",
            boxShadow: "0 18px 45px rgba(30, 52, 68, 0.22)",
            padding: "22px 0",
            zIndex: 1001,
          }}
        >
          <MoreRow to="/products" label="Products" icon="products" onClick={closeMore} />
          <MoreRow to="/library" label="Library" icon="library" onClick={closeMore} />
          <MoreRow to="/settings" label="Settings" icon="more" onClick={closeMore} />
          {isAdmin && <MoreRow to="/admin" label="Admin" icon="admin" danger onClick={closeMore} />}
          <MoreRow label="Logout" icon="logout" onClick={handleLogout} />
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "calc(74px + env(safe-area-inset-bottom, 0px))",
          padding: "8px 10px calc(7px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(255, 255, 255, 0.96)",
          borderTop: "1px solid rgba(91, 143, 185, 0.18)",
          boxShadow: "0 -8px 24px rgba(47, 65, 83, 0.12)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          gap: "4px",
          boxSizing: "border-box",
          backdropFilter: "blur(12px)",
        }}
      >
        <BottomItem to="/" label="Home" icon="home" end onClick={closeMore} />
        <BottomItem to="/clients" label="Clients" icon="clients" onClick={closeMore} />
        <BottomItem to="/patients" label="Patients" icon="patients" onClick={closeMore} />
        <BottomItem to="/sedation" label="Sedation" icon="sedation" onClick={closeMore} />
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            border: "none",
            background: "transparent",
            color: moreOpen || moreActive ? DARK : BLUE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            fontSize: "14px",
            fontWeight: 700,
            lineHeight: 1.1,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Icon name="more" active={moreOpen || moreActive} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
