import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Protocol() {
  const [protocols, setProtocols] = useState([]);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");

  const [editingProtocolId, setEditingProtocolId] = useState(null);

  // 🔥 NEW: drug builder
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
      .select(`
        *,
        protocol_drugs (*)
      `)
      .order("name");

    setProtocols(data || []);
  }

  // 🔥 ADD DRUG TO TEMP LIST
  function addDrug() {
    if (!drugName || !mgPerKg || !mgPerMl) {
      alert("Fill all drug fields");
      return;
    }

    setDrugs([
      ...drugs,
      {
        drug_name: drugName,
        mg_per_kg: Number(mgPerKg),
        mg_per_ml: Number(mgPerMl)
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

  // 🔥 SAVE PROTOCOL + DRUGS
  async function saveProtocol() {
    if (!name) {
      alert("Protocol name required");
      return;
    }

    let protocolId = editingProtocolId;

    if (editingProtocolId) {
      await supabase
        .from("protocols")
        .update({ name, species })
        .eq("id", editingProtocolId);

      // delete old drugs
      await supabase
        .from("protocol_drugs")
        .delete()
        .eq("protocol_id", editingProtocolId);
    } else {
      const { data } = await supabase
        .from("protocols")
        .insert([{ name, species }])
        .select()
        .single();

      protocolId = data.id;
    }

    // insert drugs
    if (drugs.length > 0) {
      const rows = drugs.map(d => ({
        protocol_id: protocolId,
        ...d
      }));

      await supabase.from("protocol_drugs").insert(rows);
    }

    // reset
    setName("");
    setSpecies("");
    setDrugs([]);
    setEditingProtocolId(null);

    fetchProtocols();
  }

  // 🔥 EDIT
  function startEdit(p) {
    setEditingProtocolId(p.id);
    setName(p.name || "");
    setSpecies(p.species || "");
    setDrugs(p.protocol_drugs || []);
  }

  // 🔥 DELETE
  async function deleteProtocol(id) {
    if (!window.confirm("Delete protocol?")) return;

    await supabase.from("protocols").delete().eq("id", id);
    await supabase.from("protocol_drugs").delete().eq("protocol_id", id);

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

        {/* 🔥 DRUG BUILDER */}
        <h4 style={{ marginTop: "15px" }}>Add Drug</h4>

        <div style={{ display: "grid", gap: "6px" }}>
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

        <button style={{ marginTop: "8px" }} onClick={addDrug}>
          Add Drug
        </button>

        {/* 🔥 DRUG LIST */}
        {drugs.map((d, i) => (
          <div key={i} style={{ marginTop: "8px" }}>
            {d.drug_name} — {d.mg_per_kg} mg/kg
            <button
              onClick={() => removeDrug(i)}
              style={{ marginLeft: "10px", background: "#e74c3c" }}
            >
              Remove
            </button>
          </div>
        ))}

        <button style={{ marginTop: "15px" }} onClick={saveProtocol}>
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