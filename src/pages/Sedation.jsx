import { useEffect, useState } from "react";
import { supabase } from "../supabase";

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

const btnRow = {
  display: "flex",
  gap: "10px",
  marginTop: "10px"
};

const blueBtn = {
  flex: 1,
  background: "#5b8fb9",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer"
};

const redBtn = {
  flex: 1,
  background: "#e74c3c",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer"
};

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

  const [historySearch, setHistorySearch] = useState("");

  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editHistoryResults, setEditHistoryResults] = useState([]);

  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockData, setEditStockData] = useState({});

  useEffect(() => {
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
  }, []);

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("*");
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

  async function calculate() {
    if (!protocolId || !weight) return alert("Select protocol + weight");

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
        batchId: ""
      };
    });

    setResults(calc);
  }

  function updateDose(i, val) {
    const updated = [...results];
    updated[i].ml = parseFloat(val) || 0;
    setResults(updated);
  }

  function updateBatch(i, val) {
    const updated = [...results];
    updated[i].batchId = val;
    setResults(updated);
  }

  async function save() {
    await supabase.from("sedation_records").insert([
      { patient_id: patientId, protocol_id: protocolId, weight, results }
    ]);
    setResults([]);
    fetchHistory();
  }

  function getStockForDrug(drug) {
    return stock.filter(s =>
      normaliseDrugName(s.drug) === normaliseDrugName(drug) &&
      s.total_ml > 0
    );
  }

  async function addStock() {
    await supabase.from("stock").insert([
      {
        drug: drugName,
        batch,
        expiry,
        total_ml: Number(qty),
        mg_per_ml: conc ? Number(conc) : null,
        archived: false
      }
    ]);

    setDrugName("");
    setBatch("");
    setExpiry("");
    setQty("");
    setConc("");
    fetchStock();
  }

  async function deleteStock(id) {
    if (!window.confirm("Delete stock?")) return;
    await supabase.from("stock").delete().eq("id", id);
    fetchStock();
  }

  function startEditStock(s) {
    setEditingStockId(s.id);
    setEditStockData({ ...s });
  }

  async function saveEditStock(id) {
    await supabase.from("stock").update(editStockData).eq("id", id);
    setEditingStockId(null);
    fetchStock();
  }

  function startEditHistory(h) {
    setEditingHistoryId(h.id);
    setEditHistoryResults(h.results || []);
  }

  function updateHistoryDose(i, val) {
    const updated = [...editHistoryResults];
    updated[i].ml = parseFloat(val) || 0;
    setEditHistoryResults(updated);
  }

  async function saveEditHistory(id) {
    await supabase
      .from("sedation_records")
      .update({ results: editHistoryResults })
      .eq("id", id);

    setEditingHistoryId(null);
    fetchHistory();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record?")) return;
    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory();
  }

  const filteredHistory = history.filter(h =>
    (h.patients?.name || "").toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="page">
      <h1>Sedation</h1>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => setTab("calculator")}>Calculator</button>
        <button onClick={() => setTab("stock")}>Stock</button>
      </div>

      {tab === "calculator" && (
        <div className="card">
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">Select patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select value={protocolId} onChange={e => setProtocolId(e.target.value)}>
            <option value="">Select protocol</option>
            {protocols.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight" />

          <button onClick={calculate}>Calculate</button>

          {results.map((r, i) => (
            <div key={i}>
              {r.label}
              <input value={r.ml} onChange={e => updateDose(i, e.target.value)} />
              <select value={r.batchId} onChange={e => updateBatch(i, e.target.value)}>
                <option value="">Batch</option>
                {getStockForDrug(r.drug).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.batch} ({s.total_ml} ml)
                  </option>
                ))}
              </select>
            </div>
          ))}

          {results.length > 0 && <button onClick={save}>Save</button>}

          <div className="card">
            <h3>History</h3>

            <input
              placeholder="Search..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
            />

            {filteredHistory.map(h => (
              <div key={h.id}>
                <strong>{h.patients?.name}</strong>

                {editingHistoryId === h.id ? (
                  <>
                    {editHistoryResults.map((r, i) => (
                      <input
                        key={i}
                        value={r.ml}
                        onChange={e => updateHistoryDose(i, e.target.value)}
                      />
                    ))}

                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => saveEditHistory(h.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingHistoryId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {h.results?.map((r, i) => (
                      <div key={i}>{r.drug}: {r.ml} ml</div>
                    ))}

                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => startEditHistory(h)}>Edit</button>
                      <button style={redBtn} onClick={() => deleteRow(h.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "stock" && (
        <div className="card">
          <input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Drug" />
          <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Batch" />
          <input value={qty} onChange={e => setQty(e.target.value)} placeholder="ml" />

          <button onClick={addStock}>Add</button>

          {stock.map(s => (
            <div key={s.id}>
              {editingStockId === s.id ? (
                <>
                  <input
                    value={editStockData.drug}
                    onChange={e => setEditStockData({ ...editStockData, drug: e.target.value })}
                  />

                  <div style={btnRow}>
                    <button style={blueBtn} onClick={() => saveEditStock(s.id)}>Save</button>
                    <button style={redBtn} onClick={() => setEditingStockId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  {s.drug} | {s.total_ml} ml

                  <div style={btnRow}>
                    <button style={blueBtn} onClick={() => startEditStock(s)}>Edit</button>
                    <button style={redBtn} onClick={() => deleteStock(s.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}