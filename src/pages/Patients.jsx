// Patients.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";
import tombIcon from '../assets/tomb.png'; 

// --- STYLING CONSTANTS ---
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" };
const btnRow = { display: "flex", gap: "10px", marginTop: "15px", width: "100%" };

// Updated properties to lock text to a single line (whiteSpace: "nowrap")
const standardBtnProps = { 
  borderRadius: "8px", 
  border: "none", 
  cursor: "pointer", 
  fontWeight: "bold", 
  padding: "8px 14px", 
  fontSize: "12px", 
  boxSizing: "border-box", 
  display: "inline-block",
  textAlign: "center", 
  whiteSpace: "nowrap", 
  minWidth: "100px",
  width: "auto"
};

const greenBtn = { background: "#27ae60", color: "white", ...standardBtnProps };
const redBtn   = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greyBtn  = { background: "#95a5a6", color: "white", ...standardBtnProps };
const blueBtn  = { background: "#5b8fb9", color: "white", ...standardBtnProps };

export default function Patients() {
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const navigate = useNavigate();

  // Modal State for Deletion
  const [patientToDelete, setPatientToDelete] = useState(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await checkAdminStatus();
      await fetchPatients();
      setIsLoading(false);
    }
    loadData();
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
    if (!isAdmin) return setAlertMessage("Access Denied: Only administrators can delete patients.");
    if (!patientToDelete) return;

    const { error } = await supabase.from("patients").delete().eq("id", patientToDelete.id);
    if (!error) {
      setPatientToDelete(null);
      fetchPatients();
    } else {
      setAlertMessage("Error: " + error.message);
    }
  }

  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.species || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Patients...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>Patients</h1>

      {/* Search Bar Section */}
      <div className="card">
        <input 
          placeholder="Search patients..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={inputStyle}
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
              style={{ cursor: 'pointer', marginBottom: '10px' }} 
              onClick={() => navigate(`/patient/${p.id}`)}
            >
              <div>
                <strong style={{ fontSize: '18px' }}>
                  {p.name}
                  {p.is_deceased && <img src={tombIcon} alt="Deceased" style={{ width: "20px", height: "20px", marginLeft: "8px", verticalAlign: "middle" }} />}
                </strong> 
                <span style={{ color: '#7f8c8d', marginLeft: '5px' }}>
                  ({p.clients?.surname || "No Client"})
                </span>
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>
                {p.species} – {p.weight} kg
              </div>
            </div>

            {/* Bottom Section: Buttons row */}
            <div style={btnRow}>
              {p.is_deceased ? (
                <button 
                  style={{ ...blueBtn, flex: 1 }}
                  onClick={() => navigate(`/patient/${p.id}`, { state: { activeTab: "details" } })}
                >
                  Details
                </button>
              ) : (
                <button 
                  style={{ ...greenBtn, flex: 1 }}
                  onClick={() => navigate(`/patient/${p.id}`, { state: { activeTab: "dosing" } })}
                >
                  Sedate
                </button>
              )}
              {isAdmin && (
                <button 
                  style={{ ...redBtn, flex: 1 }}
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
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmDeletePatient} style={{ ...redBtn, flex: 1 }}>Yes, Delete</button>
              <button onClick={() => setPatientToDelete(null)} style={{ ...greyBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setAlertMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>Notice</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {alertMessage}
            </p>
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

    </div>
  );
}
