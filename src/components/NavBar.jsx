import { Link, useLocation } from "react-router-dom";

export default function NavBar() {
  const location = useLocation();

  return (
    <div className="nav-wrapper">
      <img src="/logo.png" className="logo" alt="logo" />

      <div className="nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Clients
        </Link>

        <Link
          to="/sedation"
          className={location.pathname === "/sedation" ? "active" : ""}
        >
          Sedation
        </Link>

        <Link
          to="/protocols"
          className={location.pathname === "/protocols" ? "active" : ""}
        >
          Protocols
        </Link>
      </div>
    </div>
  );
}