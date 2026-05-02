import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Clients from "./pages/Clients";
import Sedation from "./pages/Sedation";
import Protocols from "./pages/Protocols";
import Login from "./pages/Login";
import ClientDetail from "./pages/ClientDetail";

import "./index.css";

export default function App() {
  return (
    <Router>

      {/* NAVBAR */}
      <div className="navbar">
        <div className="page">
          <div className="navbar-inner">
            <img src="/logo.png" alt="logo" />

            <NavLink to="/" end>Clients</NavLink>
            <NavLink to="/sedation">Sedation</NavLink>
            <NavLink to="/protocols">Protocols</NavLink>
            <NavLink to="/login">Login</NavLink>
          </div>
        </div>
      </div>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Clients />} />
        
        {/* CLIENT PAGE */}
        <Route path="/client/:id" element={<ClientDetail />} />

        {/* 🔥 SEDATION (normal + preloaded) */}
        <Route path="/sedation" element={<Sedation />} />
        <Route path="/sedation/:patientId" element={<Sedation />} />

        <Route path="/protocols" element={<Protocols />} />
        <Route path="/login" element={<Login />} />
      </Routes>

    </Router>
  );
}