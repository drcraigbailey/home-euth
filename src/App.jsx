function Navbar() {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (location.pathname === "/login") return null;

  return (
    <nav className="nav-header">
      <div className="nav-inner">
        <div className="nav-brand-group">
          <div className="nav-logo-text">VETAPP</div>
          
          <div className="nav-menu-desktop">
            <NavLink to="/" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Clients</NavLink>
            <NavLink to="/patients" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Patients</NavLink> 
            <NavLink to="/sedation" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Sedation</NavLink>
            <NavLink to="/protocols" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Protocols</NavLink>
          </div>
        </div>

        <button onClick={logout} className="nav-logout-btn">
          Logout
        </button>
      </div>

      {/* This only shows on phones */}
      <div className="nav-menu-mobile">
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Clients</NavLink>
        <NavLink to="/patients" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Patients</NavLink> 
        <NavLink to="/sedation" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Sedation</NavLink>
        <NavLink to="/protocols" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Protocols</NavLink>
      </div>
    </nav>
  );
}