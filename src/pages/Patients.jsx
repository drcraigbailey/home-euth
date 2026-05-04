import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

// Standardized UI constants
const greenBtn = {
  flex: 1,
  background: "#27ae60",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px"
};

const redBtn = {
  flex: 1,
  background: "#e74c3c",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px"
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select(`*, clients(surname)`)
      .order("name");
    setPatients(data || []);
  }

  async function deletePatient(id) {
    if (!window.confirm("Delete this patient?")) return;
    await supabase.from("patients").delete().eq("id", id);
    fetchPatients();
  }

  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.species || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1>Patients</h1>

      {/* Search Bar Section */}
      <div className="card">
        <input 
          placeholder="Search patients..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Continuous Grey Container Wrapper */}
      <div style={{ 
        marginTop: "20px", 
        background: "#f8f9fb", 
        padding: "20px", 
        borderRadius: "20px", 
        border: "1px solid #eee" 
      }}>
        <h3 style={{ marginBottom: "20px" }}>Patient List</h3>

        {filtered.map((p) => (
          /* Individual White Shadow-Box Cards */
          <div key={p.id} style={{ 
            background: "white",
            padding: "20px",
            borderRadius: "15px",
            marginBottom: "15px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            border: "1px solid #eee"
          }}>
            
            {/* Top Section: Patient Details */}
            <div 
              style={{ cursor: 'pointer', marginBottom: '15px' }} 
              onClick={() => navigate(`/patient/${p.id}`)}
            >
              <div>
                <strong style={{ fontSize: '18px' }}>{p.name}</strong> 
                <span style={{ color: '#7f8c8d', marginLeft: '5px' }}>
                  ({p.clients?.surname || "No Client"})
                </span>
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>
                {p.species} – {p.weight} kg
              </div>
            </div>

            {/* Bottom Section: Buttons on their own full-width row */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button 
                style={greenBtn}
                onClick={() => navigate("/sedation", { state: { incomingPatientId: p.id } })}
              >
                Sedate
              </button>
              <button 
                style={redBtn}
                onClick={() => deletePatient(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No patients found.
          </p>
        )}
      </div>
    </div>
  );
}