import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Clients from "./pages/Clients";
import Sedation from "./pages/Sedation";
import Protocols from "./pages/Protocols";
import Login from "./pages/Login";
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail"; // 🔥 ADD THIS

import "./index.css";

export default function App() {
  return (
    <Router>

      {/* NAVBAR */}
      <div className="navbar">
        <div className="page">
          <div className="navbar-inner">
            

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
        
        <Route path="/client/:id" element={<ClientDetail />} />

        {/* 🔥 NEW PATIENT PAGE */}
        <Route path="/patient/:id" element={<PatientDetail />} />

        <Route path="/sedation" element={<Sedation />} />
        <Route path="/sedation/:patientId" element={<Sedation />} />

        <Route path="/protocols" element={<Protocols />} />
        <Route path="/login" element={<Login />} />
      </Routes>

    </Router>
  );
}