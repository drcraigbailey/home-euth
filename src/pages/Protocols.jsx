import { useEffect, useState } from "react";
import { supabase } from "../supabase";

// Standard UI constants to match your other pages
const btnRow = { display: "flex", gap: "10px", marginTop: "15px" };

const blueBtn = {
  flex: 1,
  background: "#5b8fb9",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer",
  fontWeight: "500"
};

const redBtn = {
  flex: 1,
  background: "#e74c3c",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer",
  fontWeight: "500"
};

export default function Protocol() {
  const [protocols, setProtocols] = useState([]);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [editingProtocolId, setEditingProtocolId] = useState(null);

  const [drugs, setDrugs] = useState([]);
  const [drugName, setDrugName] = useState("");
  const [mgPerKg, setMgPerKg] = useState("");
  const [mgPerMl, setMgPerMl] = useState("");

  useEffect(() => {
    fetchProtocols();
  }, []);

  async function fetchProtocols() {
    const { data } = await supabase
      .from("protocols")
      .select(`*, protocol_drugs (*)`)
      .order("name");
    setProtocols(data || []);
  }

  function addDrug() {
    const mgKg = parseFloat(mgPerKg);
    const mgMl = parseFloat(mgPerMl);
    if (!drugName.trim() || isNaN(mgKg) || isNaN(mgMl)) return alert("Fill all drug fields correctly");

    setDrugs(prev => [...prev, { drug_name: drugName.trim(), mg_per_kg: mgKg, mg_per_ml: mgMl }]);
    setDrugName(""); setMgPerKg(""); setMgPerMl("");
  }

  async function saveProtocol() {
    if (!name.trim() || drugs.length === 0) return alert("Enter a name and at least one drug");

    let protocolId = editingProtocolId;
    if (editingProtocolId) {
      await supabase.from("protocols").update({ name, species }).eq("id", editingProtocolId);
      await supabase.from("protocol_drugs").delete().eq("protocol_id", editingProtocolId);
    } else {
      const { data } = await supabase.from("protocols").insert([{ name, species }]).select().single();
      protocolId = data.id;
    }

    await supabase.from("protocol_drugs").insert(drugs.map(d => ({ protocol_id: protocolId, ...d })));
    setName(""); setSpecies(""); setDrugs([]); setEditingProtocolId(null);
    fetchProtocols();
  }

  function startEdit(p) {
    setEditingProtocolId(p.id);
    setName(p.name);
    setSpecies(p.species || "");
    setDrugs(p.protocol_drugs || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProtocol(id) {
    if (!window.confirm("Delete protocol?")) return;
    await supabase.from("protocol_drugs").delete().eq("protocol_id", id);
    await supabase.from("protocols").delete().eq("id", id);
    fetchProtocols();
  }

  const filtered = protocols.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <h1>Protocols</h1>

      {/* 1. ADD / EDIT FORM SECTION */}
      <div className="card">
        <h3>{editingProtocolId ? "Edit Protocol" : "Add Protocol"}</h3>
        <input placeholder="Protocol name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Species" value={species} onChange={e => setSpecies(e.target.value)} />

        <h4 style={{ marginTop: "20px" }}>Add Drug</h4>
        <div style={{ display: "grid", gap: "8px" }}>
          <input placeholder="Drug name" value={drugName} onChange={e => setDrugName(e.target.value)} />
          <input placeholder="mg/kg" value={mgPerKg} onChange={e => setMgPerKg(e.target.value)} />
          <input placeholder="mg/ml" value={mgPerMl} onChange={e => setMgPerMl(e.target.value)} />
        </div>
        <button style={{ marginTop: "10px", background: "#5b8fb9" }} onClick={addDrug}>Add Drug</button>

        {drugs.map((d, i) => (
          <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
            <span>{d.drug_name} — {d.mg_per_kg} mg/kg</span>
            <button onClick={() => setDrugs(drugs.filter((_, idx) => idx !== i))} style={{ background: "#e74c3c", width: "auto" }}>Remove</button>
          </div>
        ))}

        <button style={{ marginTop: "20px", background: "#27ae60" }} onClick={saveProtocol}>
          {editingProtocolId ? "Save Changes" : "Save Protocol"}
        </button>
      </div>

      {/* 2. THE GREY AREA CONTAINER (Matches History Section) */}
      <div style={{ 
        marginTop: "40px", 
        background: "#f8f9fb", 
        padding: "20px", 
        borderRadius: "20px", 
        border: "1px solid #eee" 
      }}>
        <h3 style={{ marginBottom: "20px" }}>Protocols</h3>
        
        <input 
          placeholder="Search protocols..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ marginBottom: "20px" }}
        />

        {/* INDIVIDUAL SHADOW BOX CARDS */}
        {filtered.map(p => (
          <div key={p.id} style={{
            background: "white",
            padding: "20px",
            borderRadius: "15px",
            marginBottom: "15px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            border: "1px solid #eee"
          }}>
            <strong style={{ fontSize: "18px", display: "block", marginBottom: "10px" }}>{p.name}</strong>
            
            <div style={{ fontSize: "15px", color: "#333", lineHeight: "1.6" }}>
              {p.protocol_drugs?.map((d, i) => (
                <div key={i}>{d.drug_name}: {d.mg_per_kg} mg/kg</div>
              ))}
            </div>

            <div style={btnRow}>
              <button style={blueBtn} onClick={() => startEdit(p)}>Edit</button>
              <button style={redBtn} onClick={() => deleteProtocol(p.id)}>Delete</button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No protocols found.</p>}
      </div>
    </div>
  );
}