import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Protocol() {
  const [protocols, setProtocols] = useState([]);

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
    const { data, error } = await supabase
      .from("protocols")
      .select(`*, protocol_drugs (*)`)
      .order("name");

    if (error) {
      console.error("FETCH ERROR:", error);
      return;
    }

    setProtocols(data || []);
  }

  // 🔥 ADD DRUG (FIXED)
  function addDrug() {
    const mgKg = parseFloat(mgPerKg);
    const mgMl = parseFloat(mgPerMl);

    if (!drugName.trim()) {
      alert("Drug name required");
      return;
    }

    if (isNaN(mgKg) || isNaN(mgMl)) {
      alert("mg/kg and mg/ml must be valid numbers");
      return;
    }

    setDrugs(prev => [
      ...prev,
      {
        drug_name: drugName.trim(),
        mg_per_kg: mgKg,
        mg_per_ml: mgMl
      }
    ]);

    setDrugName("");
    setMgPerKg("");
    setMgPerMl("");
  }

  function removeDrug(index) {
    const updated = [...drugs];
    updated.splice(index, 1);
    setDrugs(updated);
  }

  // 🔥 SAVE PROTOCOL (FIXED HARD)
  async function saveProtocol() {
    if (!name.trim()) {
      alert("Protocol name required");
      return;
    }

    if (drugs.length === 0) {
      alert("Add at least one drug");
      return;
    }

    let protocolId = editingProtocolId;

    // 🔥 TRY WITH SPECIES FIRST
    let insertResult = await supabase
      .from("protocols")
      .insert([{ name, species }])
      .select()
      .single();

    // 🔥 FALLBACK IF SPECIES COLUMN DOESN’T EXIST
    if (insertResult.error) {
      console.warn("Retrying without species:", insertResult.error);

      insertResult = await supabase
        .from("protocols")
        .insert([{ name }])
        .select()
        .single();
    }

    if (insertResult.error) {
      console.error("SAVE ERROR:", insertResult.error);
      alert(insertResult.error.message);
      return;
    }

    protocolId = insertResult.data.id;

    // 🔥 INSERT DRUGS (FILTER CLEAN DATA ONLY)
    const cleanDrugs = drugs.filter(
      d => !isNaN(d.mg_per_kg) && !isNaN(d.mg_per_ml)
    );

    const { error: drugError } = await supabase
      .from("protocol_drugs")
      .insert(
        cleanDrugs.map(d => ({
          protocol_id: protocolId,
          ...d
        }))
      );

    if (drugError) {
      console.error("DRUG SAVE ERROR:", drugError);
      alert(drugError.message);
      return;
    }

    // RESET
    setName("");
    setSpecies("");
    setDrugs([]);
    setEditingProtocolId(null);

    fetchProtocols();
  }

  function startEdit(p) {
    setEditingProtocolId(p.id);
    setName(p.name || "");
    setSpecies(p.species || "");
    setDrugs(p.protocol_drugs || []);
  }

  async function deleteProtocol(id) {
    if (!window.confirm("Delete protocol?")) return;

    await supabase.from("protocol_drugs").delete().eq("protocol_id", id);
    await supabase.from("protocols").delete().eq("id", id);

    fetchProtocols();
  }

  return (
    <div className="page">
      <h1>Protocols</h1>

      {/* FORM */}
      <div className="card">
        <h3>{editingProtocolId ? "Edit Protocol" : "Add Protocol"}</h3>

        <input
          placeholder="Protocol name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        />

        <h4 style={{ marginTop: "15px" }}>Add Drug</h4>

        <div style={{ display: "grid", gap: "8px" }}>
          <input
            placeholder="Drug name"
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
          />
          <input
            placeholder="mg/kg"
            value={mgPerKg}
            onChange={(e) => setMgPerKg(e.target.value)}
          />
          <input
            placeholder="mg/ml"
            value={mgPerMl}
            onChange={(e) => setMgPerMl(e.target.value)}
          />
        </div>

        <button style={{ marginTop: "10px" }} onClick={addDrug}>
          Add Drug
        </button>

        {/* DRUG LIST */}
        {drugs
          .filter(d => !isNaN(d.mg_per_kg) && !isNaN(d.mg_per_ml))
          .map((d, i) => (
            <div key={i} style={{ marginTop: "10px" }}>
              {d.drug_name} — {d.mg_per_kg} mg/kg

              <button
                onClick={() => removeDrug(i)}
                style={{
                  marginLeft: "10px",
                  background: "#e74c3c"
                }}
              >
                Remove
              </button>
            </div>
          ))}

        <button style={{ marginTop: "20px" }} onClick={saveProtocol}>
          {editingProtocolId ? "Update Protocol" : "Add Protocol"}
        </button>
      </div>

      {/* LIST */}
      <div className="card">
        <h3>Protocols</h3>

        {protocols.map(p => (
          <div key={p.id} style={{ marginBottom: "20px" }}>
            <strong>{p.name}</strong>

            {p.protocol_drugs?.map((d, i) => (
              <div key={i}>
                {d.drug_name} — {d.mg_per_kg} mg/kg
              </div>
            ))}

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => startEdit(p)}>Edit</button>

              <button
                onClick={() => deleteProtocol(p.id)}
                style={{ background: "#e74c3c" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}