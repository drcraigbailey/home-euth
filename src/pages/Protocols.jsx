import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Protocols() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [drugs, setDrugs] = useState([
    { drug_name: "", mg_per_kg: "", mg_per_ml: "" }
  ]);

  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    fetchProtocols();
  }, []);

  async function fetchProtocols() {
    const { data } = await supabase
      .from("protocols")
      .select(`*, protocol_drugs(*)`)
      .order("created_at", { ascending: false });

    setProtocols(data || []);
  }

  function updateDrug(index, field, value) {
    const updated = [...drugs];
    updated[index][field] = value;
    setDrugs(updated);
  }

  function addDrug() {
    setDrugs([...drugs, { drug_name: "", mg_per_kg: "", mg_per_ml: "" }]);
  }

  async function saveProtocol() {
    const { data: protocol } = await supabase
      .from("protocols")
      .insert([{ name, notes }])
      .select()
      .single();

    const drugRows = drugs.map(d => ({
      ...d,
      protocol_id: protocol.id
    }));

    await supabase.from("protocol_drugs").insert(drugRows);

    setName("");
    setNotes("");
    setDrugs([{ drug_name: "", mg_per_kg: "", mg_per_ml: "" }]);

    fetchProtocols();
  }

  async function deleteProtocol(id) {
    if (!confirm("Delete protocol?")) return;

    await supabase.from("protocol_drugs").delete().eq("protocol_id", id);
    await supabase.from("protocols").delete().eq("id", id);

    fetchProtocols();
  }

  return (
    <div className="page">
      <h1>Protocols</h1>

      {/* CREATE */}
      <div className="card">
        <input
          placeholder="Protocol name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {drugs.map((d, i) => (
          <div key={i}>
            <input
              placeholder="Drug name"
              value={d.drug_name}
              onChange={(e) => updateDrug(i, "drug_name", e.target.value)}
            />

            <input
              placeholder="mg/kg"
              value={d.mg_per_kg}
              onChange={(e) => updateDrug(i, "mg_per_kg", e.target.value)}
            />

            <input
              placeholder="mg/ml"
              value={d.mg_per_ml}
              onChange={(e) => updateDrug(i, "mg_per_ml", e.target.value)}
            />
          </div>
        ))}

        <button onClick={addDrug}>+ Add Drug</button>
        <button onClick={saveProtocol}>Save Protocol</button>
      </div>

      {/* HISTORY */}
      <div className="card">
        <h3>Saved Protocols</h3>

        {protocols.map(p => (
          <div key={p.id} className="output-row">
            <strong>{p.name}</strong>

            {p.protocol_drugs?.map((d, i) => (
              <div key={i}>
                {d.drug_name} — {d.mg_per_kg} mg/kg
              </div>
            ))}

            <button onClick={() => deleteProtocol(p.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}