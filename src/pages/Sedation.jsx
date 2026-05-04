import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

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

const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };

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

const yellowBtn = {
  flex: 1,
  background: "#f39c12", 
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer"
};

const drugResultStyle = {
  marginBottom: "15px",
  display: "flex",
  flexDirection: "column",
  gap: "5px"
};

export default function Sedation() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("calculator");

  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");

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
    setFilteredPatients(data || []);
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

  function handlePatientSearch(value) {
    setPatientSearch(value);
    const filtered = patients.filter(p =>
      (p.name || "").toLowerCase().includes(value.toLowerCase())
    );
    setFilteredPatients(filtered);
  }

  function selectPatient(p) {
    setPatientId(p.id);
    setPatientSearch(p.name);
    setFilteredPatients([]);

    const w = p.weight || p.weight_kg || "";
    setWeight(w);
  }

  function goToConsent() {
    if (!patientId) {
      alert("Select a patient first");
      return;
    }
    navigate(`/patient/${patientId}`); 
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
        // 🔥 CHANGED: Increased decimal precision to 3 places
        ml: Number(ml.toFixed(3)),
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
    const missingBatches = results.some(r => !r.batchId);
    if (missingBatches) {
      if (!window.confirm("You have not selected a Batch for all drugs. Stock will only be deducted for selected batches. Save anyway?")) {
        return;
      }
    }

    const { error: saveError } = await supabase.from("sedation_records").insert([
      { patient_id: patientId, protocol_id: protocolId, weight, results }
    ]);

    if (saveError) {
      alert("Error saving record: " + saveError.message);
      return;
    }

    for (const r of results) {
      if (r.batchId && r.ml > 0) {
        const currentStock = stock.find(s => String(s.id) === String(r.batchId));
        
        if (currentStock) {
          let updatedVolume = currentStock.total_ml - r.ml;
          
          if (updatedVolume < 0) updatedVolume = 0; 
          
          await supabase
            .from("stock")
            .update({ total_ml: updatedVolume })
            .eq("id", currentStock.id);
        }
      }
    }

    setResults([]);
    fetchHistory();
    fetchStock(); 
  }

  function getStockForDrug(drug) {
    return stock.filter(s =>
      normaliseDrugName(s.drug) === normaliseDrugName(drug) &&
      s.total_ml > 0 && 
      !s.is_archived
    );
  }

  async function addStock() {
    if (!drugName.trim() || !batch.trim() || !qty.trim()) {
      alert("Please enter a Drug name, Batch number, and quantity (ml).");
      return;
    }

    const { error } = await supabase.from("stock").insert([
      { 
        drug: drugName.trim(), 
        batch: batch.trim(), 
        total_ml: Number(qty),
        is_archived: false
      }
    ]);

    if (error) {
      console.error("Database Error:", error);
      alert("Error adding stock: " + error.message);
      return;
    }

    setDrugName(""); 
    setBatch(""); 
    setQty(""); 
    fetchStock();
  }

  async function archiveStock(id) {
    if (!window.confirm("Archive this bottle? It will be hidden but keep its remaining volume record.")) return;
    
    await supabase.from("stock").update({ is_archived: true }).eq("id", id);
    fetchStock();
  }

  async function deleteStock(id) {
    if (!window.confirm("Delete stock completely? This wipes it from history.")) return;
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

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setTab("calculator")}>Calculator</button>
        <button onClick={() => setTab("stock")}>Stock</button>
      </div>

      {tab === "calculator" && (
        <div className="card">

          <div style={{ position: "relative" }}>
            <input
              placeholder="Search patient..."
              value={patientSearch}
              onChange={e => handlePatientSearch(e.target.value)}
            />
            {patientSearch && filteredPatients.length > 0 && (
              <div style={{ position: "absolute", background: "white", border: "1px solid #ccc", width: "100%", maxHeight: "150px", overflowY: "auto", zIndex: 10 }}>
                {filteredPatients.map(p => (
                  <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: "6px", cursor: "pointer" }}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <select value={protocolId} onChange={e => setProtocolId(e.target.value)}>
            <option value="">Select protocol</option>
            {protocols.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight" />

          <button onClick={calculate}>Calculate</button>

          {results.map((r, i) => (
            <div key={i} style={{ 
              ...drugResultStyle, 
              padding: "12px", 
              background: "#f8f9fb", 
              borderRadius: "10px",
              border: "1px solid #eee"
            }}>
              
              <label style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
                {r.label}
              </label>

              <input value={r.ml} onChange={e => updateDose(i, e.target.value)} />
              <select value={r.batchId} onChange={e => updateBatch(i, e.target.value)}>
                <option value="">Batch</option>
                {getStockForDrug(r.drug).map(s => (
                  <option key={s.id} value={s.id}>{s.batch} ({s.total_ml} ml)</option>
                ))}
              </select>
            </div>
          ))}

          {results.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={save} style={blueBtn}>Save</button>
              <button onClick={goToConsent} style={{ ...blueBtn, background: "#27ae60" }}>
                Consent
              </button>
            </div>
          )}

          <div style={{ marginTop: "40px" }}>
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
                      <div key={i}>
                        {r.drug}
                        <input value={r.ml} onChange={e => updateHistoryDose(i, e.target.value)} />
                      </div>
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

          <button onClick={addStock}>Add Stock</button>

          {stock.filter(s => !s.is_archived).map(s => (
            <div key={s.id} style={{ marginBottom: "15px" }}>
              {editingStockId === s.id ? (
                <>
                  <input value={editStockData.drug} onChange={e => setEditStockData({ ...editStockData, drug: e.target.value })} />
                  <div style={btnRow}>
                    <button style={blueBtn} onClick={() => saveEditStock(s.id)}>Save</button>
                    <button style={redBtn} onClick={() => setEditingStockId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div>{s.drug}</div>
                  <div>Batch: {s.batch} | {s.total_ml} ml</div>
                  <div style={btnRow}>
                    <button style={blueBtn} onClick={() => startEditStock(s)}>Edit</button>
                    <button style={yellowBtn} onClick={() => archiveStock(s.id)}>Archive</button>
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