import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

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

      <div className="card">
        <input 
          placeholder="Search patients..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      <div className="card">
        {filtered.map((p) => (
          <div key={p.id} style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "10px", 
            paddingBottom: "10px", 
            borderBottom: "1px solid #eee" 
          }}>
            
            {/* Clickable Patient Info Section[cite: 5, 6] */}
            <div 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate(`/patient/${p.id}`)}
            >
              <strong style={{ fontSize: '18px' }}>{p.name}</strong> 
              <span style={{ color: '#7f8c8d', marginLeft: '5px' }}>
                ({p.clients?.surname || "No Client"})
              </span><br />
              {p.species} – {p.weight} kg
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                style={{ background: "#27ae60", width: "auto", padding: "8px 15px", fontSize: "14px" }}
                onClick={() => navigate(`/sedation/${p.id}`)}
              >
                Sedate
              </button>
              <button 
                style={{ background: "#e74c3c", width: "auto", padding: "8px 15px", fontSize: "14px" }}
                onClick={() => deletePatient(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p>No patients found.</p>}
      </div>
    </div>
  );
}