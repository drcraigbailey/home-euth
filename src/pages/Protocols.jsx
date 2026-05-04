import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const btnRow = { display: "flex", gap: "10px", marginTop: "15px" };
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer", fontWeight: "500" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer", fontWeight: "500" };

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

  useEffect(() => { fetchProtocols(); }, []);

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

    try {
      // Get current user session for the user_id column
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      let protocolId = editingProtocolId;

      if (editingProtocolId) {
        const { error: upErr } = await supabase
          .from("protocols")
          .update({ name, species, user_id })
          .eq("id", editingProtocolId);
        
        if (upErr) throw upErr;

        const { error: delErr } = await supabase
          .from("protocol_drugs")
          .delete()
          .eq("protocol_id", editingProtocolId);
        
        if (delErr) throw delErr;
      } else {
        const { data, error: insErr } = await supabase
          .from("protocols")
          .insert([{ name, species, user_id }])
          .select()
          .single();
        
        if (insErr) throw insErr;
        protocolId = data.id;
      }

      const { error: drugErr } = await supabase
        .from("protocol_drugs")
        .insert(drugs.map(d => ({ protocol_id: protocolId, ...d })));
      
      if (drugErr) throw drugErr;

      // Reset form and refresh
      setName(""); setSpecies(""); setDrugs([]); setEditingProtocolId(null);
      fetchProtocols();
      alert("Protocol saved successfully!");

    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err.message}. Make sure the 'species' column exists in Supabase!`);
    }
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

      <div className="card">
        <h3>{editingProtocolId ? "Edit Protocol" : "Add Protocol"}</h3>
        <input placeholder="Protocol name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Species" value={species} onChange={e => setSpecies(e.target.value)} />

        <h4 style={{ marginTop: "20px" }}>Add Drug</h4>
        <div style={{ display: "grid", gap: "8px" }}>
          <input placeholder="Drug name" value={drugName} onChange={e => setDrugName(e.target.value)} />
          <div style={{ display: "flex", gap: "8px" }}>
            <input placeholder="mg/kg" value={mgPerKg} onChange={e => setMgPerKg(e.target.value)} style={{flex: 1}} />
            <input placeholder="mg/ml" value={mgPerMl} onChange={e => setMgPerMl(e.target.value)} style={{flex: 1}} />
          </div>
        </div>
        <button style={{ marginTop: "10px", background: "#5b8fb9", color: "white", padding: "12px", borderRadius: "12px", border: "none" }} onClick={addDrug}>Add Drug</button>

        {drugs.map((d, i) => (
          <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fb", padding: "10px", borderRadius: "10px", border: "1px solid #eee" }}>
            <span><strong>{d.drug_name}</strong> — {d.mg_per_kg} mg/kg</span>
            <button onClick={() => setDrugs(drugs.filter((_, idx) => idx !== i))} style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "8px" }}>Remove</button>
          </div>
        ))}

        <button style={{ marginTop: "20px", background: "#27ae60", color: "white", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "bold" }} onClick={saveProtocol}>
          {editingProtocolId ? "Save Changes" : "Save Protocol"}
        </button>
      </div>

      <div style={{ marginTop: "40px", background: "#f8f9fb", padding: "20px", borderRadius: "20px", border: "1px solid #eee" }}>
        <h3>Library</h3>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: "20px" }} />

        {filtered.map(p => (
          <div key={p.id} style={{ background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <strong style={{ fontSize: "18px" }}>{p.name}</strong>
              {p.species && <span style={{fontSize: '12px', background: '#eef2f4', padding: '2px 8px', borderRadius: '10px'}}>{p.species}</span>}
            </div>
            
            <div style={{ fontSize: "15px", color: "#333", margin: "10px 0" }}>
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