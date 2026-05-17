// Patients.jsx
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
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Modal State for Deletion
  const [patientToDelete, setPatientToDelete] = useState(null);

  useEffect(() => {
    checkAdminStatus();
    fetchPatients();
  }, []);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!data?.is_admin);
    }
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select(`*, clients(surname)`)
      .order("name");
    setPatients(data || []);
  }

  async function confirmDeletePatient() {
    if (!isAdmin) return alert("Access Denied: Only administrators can delete patients.");
    if (!patientToDelete) return;

    const { error } = await supabase.from("patients").delete().eq("id", patientToDelete.id);
    if (!error) {
      setPatientToDelete(null);
      fetchPatients();
    } else {
      alert("Error: " + error.message);
    }
  }

  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.species || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
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
        <h3 style={{ marginBottom: "20px", marginTop: 0 }}>Patient List</h3>

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

            {/* Bottom Section: Buttons row */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button 
                style={greenBtn}
                onClick={() => navigate(`/patient/${p.id}`, { state: { activeTab: "dosing" } })}
              >
                Sedate
              </button>
              {isAdmin && (
                <button 
                  style={redBtn}
                  onClick={() => setPatientToDelete(p)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No patients found.
          </p>
        )}
      </div>

      {/* POP-UP MODAL FOR PATIENT DELETION */}
      {patientToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setPatientToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete patient <strong>{patientToDelete.name}</strong>? All records linked to this profile will be cleared.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeletePatient} style={{ flex: 1, background: "#e74c3c", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Yes, Delete</button>
              <button onClick={() => setPatientToDelete(null)} style={{ flex: 1, background: "#95a5a6", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}