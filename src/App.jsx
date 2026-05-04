function Navbar() {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (location.pathname === "/login") return null;

  return (
    <div className="navbar-container">
      {/* Top Section: Logo/Name on the left, Logout on the right */}
      <div className="top-bar">
        <div className="brand-header">
          {/* Ensure logo.png is in your /public folder */}
          <img src="/logo.png" alt="logo" className="nav-logo-img" />
          <span>SP Home Euthanasia</span>
        </div>
        <button onClick={logout} className="logout-text-btn">
          Logout
        </button>
      </div>

      {/* Bottom Section: The Navigation Pill */}
      <div className="navbar">
        <div className="navbar-inner">
          <NavLink to="/" end className="nav-btn">Clients</NavLink>
          <NavLink to="/patients" className="nav-btn">Patients</NavLink> 
          <NavLink to="/sedation" className="nav-btn">Sedation</NavLink>
          <NavLink to="/protocols" className="nav-btn">Protocols</NavLink>
        </div>
      </div>
    </div>
  );
}