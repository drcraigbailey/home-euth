import { useEffect, useState } from "react";
import { supabase } from "../supabase";

// 🔥 DRUG NORMALISATION MAP
const DRUG_MAP = {
  ketamine: ["ket", "ketamine"],
  butorphanol: ["but", "butorphanol"],
  dexmedetomidine: ["dex", "dexmedetomidine", "medetomidine"],
  acp: ["acp", "acepromazine"],
  zoletil: ["zoletil", "zol", "tiletamine"]
};

function normaliseDrugName(name) {
  if (!name) return "";
  const clean = name.toLowerCase().trim();

  for (const [key, aliases] of Object.entries(DRUG_MAP)) {
    if (aliases.some(a => clean.includes(a))) return key;
  }

  return clean;
}

export default function Sedation() {
  const [tab, setTab] = useState("calculator");

  const [patients, setPatients] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [history, setHistory] = useState([]);
  const [stock, setStock] = useState([]);

  const [patientId, setPatientId] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [weight, setWeight] = useState("");

  const [results, setResults] = useState([]);

  const [drugName, setDrugName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("");
  const [conc, setConc] = useState("");

  // 🔥 NEW SEARCH STATE
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
  }, []);

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select("*, clients(surname)");
    setPatients(data || []);
  }

  async function fetchProtocols() {
    const { data } = await supabase.from("protocols").select("*");
    setProtocols(data || []);
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from("sedation_records")
      .select(`*, patients(name, species, clients(surname))`)
      .order("created_at", { ascending: false });

    setHistory(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase.from("stock").select("*");
    setStock(data || []);
  }

  function handlePatient(e) {
    const id = e.target.value;
    setPatientId(id);

    const p = patients.find(x => String(x.id) === id);
    if (p) setWeight(p.weight || "");
  }

  async function calculate() {
    if (!protocolId || !weight) {
      alert("Select protocol and ensure weight is set");
      return;
    }

    const { data } = await supabase
      .from("protocol_drugs")
      .select("*")
      .eq("protocol_id", protocolId);

    const calc = data.map(d => {
      const mg = d.mg_per_kg * Number(weight);
      const ml = mg / d.mg_per_ml;

      return {
        drug: normaliseDrugName(d.drug_name),
        label: d.drug_name,
        ml: Number(ml.toFixed(2)),
        manual: false,
        batchId: ""
      };
    });

    setResults(calc);
  }

  function updateDose(index, value) {
    const updated = [...results];
    updated[index].ml = value;
    updated[index].manual = true;
    setResults(updated);
  }

  function updateBatch(index, batchId) {
    const updated = [...results];
    updated[index].batchId = batchId;
    setResults(updated);
  }

  async function save() {
    if (!patientId || !protocolId || results.length === 0) {
      alert("Missing data");
      return;
    }

    for (const r of results) {
      if (!r.batchId) {
        alert(`Select batch for ${r.label || r.drug}`);
        return;
      }
    }

    console.log("SENDING TO FUNCTION:", results);

    const { error } = await supabase.rpc("use_stock_and_save", {
      p_patient_id: patientId,
      p_protocol_id: protocolId,
      p_weight: Number(weight),
      p_results: results
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Saved successfully");

    setResults([]);
    fetchHistory();
    fetchStock();
  }

  async function deleteRow(id) {
    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory();
  }

  function getStockForDrug(drug) {
    const target = normaliseDrugName(drug);

    return stock.filter(s => {
      const stockName = normaliseDrugName(s.drug);
      return stockName === target;
    });
  }

  // 🔥 FILTERED HISTORY
  const filteredHistory = history.filter(h => {
    const search = historySearch.toLowerCase();

    return (
      h.patients?.name?.toLowerCase().includes(search) ||
      h.patients?.species?.toLowerCase().includes(search) ||
      h.patients?.clients?.surname?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="page">
      <h1>Sedation</h1>

      <div className="card">
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button onClick={() => setTab("calculator")}>Calculator</button>
          <button onClick={() => setTab("stock")}>Stock</button>
        </div>

        {tab === "calculator" && (
          <>
            <select value={patientId} onChange={handlePatient}>
              <option value="">Select patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species})
                </option>
              ))}
            </select>

            <select value={protocolId} onChange={(e) => setProtocolId(e.target.value)}>
              <option value="">Select protocol</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Weight"
            />

            <button onClick={calculate}>Calculate</button>

            {results.map((r, i) => (
              <div key={i} className="output-row">
                <strong>{r.label || r.drug}</strong>

                <input
                  type="number"
                  step="0.01"
                  value={r.ml}
                  onChange={(e) =>
                    updateDose(i, parseFloat(e.target.value) || 0)
                  }
                  style={{ width: "70px", marginLeft: "10px" }}
                />

                ml

                <select
                  value={r.batchId}
                  onChange={(e) => updateBatch(i, e.target.value)}
                >
                  <option value="">Select batch</option>

                  {getStockForDrug(r.drug).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.drug} | Batch: {s.batch || "—"} | {s.total_ml?.toFixed(2)} ml
                    </option>
                  ))}
                </select>

                {r.manual && <span style={{ color: "orange" }}> manual</span>}
              </div>
            ))}

            {results.length > 0 && (
              <button onClick={save}>Save to History</button>
            )}
          </>
        )}
      </div>

      {tab === "calculator" && (
        <div className="card">
          <h3>History</h3>

          {/* 🔥 SEARCH INPUT */}
          <input
            placeholder="Search patient, species, or client..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{ marginBottom: "10px", width: "100%" }}
          />

          {filteredHistory.map(h => (
            <div key={h.id} className="output-row">
              <strong>
                {h.patients?.name} ({h.patients?.species}) – {h.patients?.clients?.surname}
              </strong>

              {h.results?.map((r, i) => (
                <div key={i}>
                  {r.drug}: {r.ml} ml
                </div>
              ))}

              <button onClick={() => deleteRow(h.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}