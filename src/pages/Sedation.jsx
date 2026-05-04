import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useLocation } from "react-router-dom";

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
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const yellowBtn = { flex: 1, background: "#f39c12", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
// Added greenBtn style[cite: 8]
const greenBtn = { flex: 1, background: "#27ae60", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const drugResultStyle = { marginBottom: "15px", display: "flex", flexDirection: "column", gap: "5px" };

const greyBox = { 
  background: "#f8f9fb", 
  padding: "20px", 
  borderRadius: "20px", 
  border: "1px solid #eee",
  marginTop: "20px"
};

export default function Sedation() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [qty, setQty] = useState("");

  const [historySearch, setHistorySearch] = useState("");
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editHistoryResults, setEditHistoryResults] = useState([]);

  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockData, setEditStockData] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0); 
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
  }, []);

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("*");
    const list = data || [];
    setPatients(list);
    setFilteredPatients(list);

    const incomingId = location.state?.incomingPatientId;
    if (incomingId && list.length > 0) {
      const p = list.find(pat => String(pat.id) === String(incomingId));
      if (p) selectPatient(p);
    }
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
    if (patientId) setPatientId(""); 
    const filtered = patients.filter(p => (p.name || "").toLowerCase().includes(value.toLowerCase()));
    setFilteredPatients(filtered);
  }

  function selectPatient(p) {
    setPatientId(p.id);
    setPatientSearch(p.name);
    setFilteredPatients([]);
    setWeight(p.weight || p.weight_kg || ""); 
    setTab("calculator");
    window.scrollTo(0, 0); 
  }

  function goToConsent() {
    if (!patientId) return alert("Select a patient first");
    navigate(`/patient/${patientId}`); 
  }

  async function calculate() {
    if (!protocolId || !weight) return alert("Select protocol + weight");
    const { data } = await supabase.from("protocol_drugs").select("*").eq("protocol_id", protocolId);
    const calc = data.map(d => ({
      drug: normaliseDrugName(d.drug_name),
      label: d.drug_name,
      ml: Number(((d.mg_per_kg * Number(weight)) / d.mg_per_ml).toFixed(3)),
      batchId: ""
    }));
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
    if (missingBatches && !window.confirm("No batch selected. Stock won't be deducted. Save anyway?")) return;

    const { error } = await supabase.from("sedation_records").insert([{ patient_id: patientId, protocol_id: protocolId, weight, results }]);
    if (error) return alert("Error saving: " + error.message);

    for (const r of results) {
      if (r.batchId && r.ml > 0) {
        const current = stock.find(s => String(s.id) === String(r.batchId));
        if (current) {
          const newVol = Math.max(0, current.total_ml - r.ml);
          await supabase.from("stock").update({ total_ml: newVol }).eq("id", current.id);
        }
      }
    }
    setResults([]);
    fetchHistory();
    fetchStock(); 
  }

  function getStockForDrug(drug) {
    return stock.filter(s => normaliseDrugName(s.drug) === normaliseDrugName(drug) && s.total_ml > 0 && !s.is_archived);
  }

  async function addStock() {
    if (!drugName.trim() || !batch.trim() || !qty.trim()) return alert("Fill all stock fields");
    await supabase.from("stock").insert([{ drug: drugName.trim(), batch: batch.trim(), total_ml: Number(qty), is_archived: false }]);
    setDrugName(""); setBatch(""); setQty(""); fetchStock();
  }

  async function archiveStock(id) {
    if (window.confirm("Archive this bottle?")) {
      await supabase.from("stock").update({ is_archived: true }).eq("id", id);
      fetchStock();
    }
  }

  async function deleteStock(id) {
    if (window.confirm("Delete stock completely?")) {
      await supabase.from("stock").delete().eq("id", id);
      fetchStock();
    }
  }

  function startEditStock(s) { setEditingStockId(s.id); setEditStockData({ ...s }); }
  async function saveEditStock(id) { await supabase.from("stock").update(editStockData).eq("id", id); setEditingStockId(null); fetchStock(); }

  function startEditHistory(h) { setEditingHistoryId(h.id); setEditHistoryResults(h.results || []); }

  async function saveEditHistory(id) {
    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (!original) return;

    for (let i = 0; i < editHistoryResults.length; i++) {
      const oldR = original.results[i];
      const newR = editHistoryResults[i];

      if (oldR && oldR.batchId) {
        const diff = oldR.ml - newR.ml; 
        if (diff !== 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", oldR.batchId).single();
          if (currentStock) {
            await supabase.from("stock").update({ total_ml: currentStock.total_ml + diff }).eq("id", oldR.batchId);
          }
        }
      }
    }

    await supabase.from("sedation_records").update({ results: editHistoryResults }).eq("id", id);
    setEditingHistoryId(null);
    fetchHistory();
    fetchStock();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record? This will return drug volumes to stock.")) return;

    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (original && original.results) {
      for (const r of original.results) {
        if (r.batchId && r.ml > 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", r.batchId).single();
          if (currentStock) {
            await supabase.from("stock").update({ total_ml: currentStock.total_ml + r.ml }).eq("id", r.batchId);
          }
        }
      }
    }

    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory();
    fetchStock();
  }

  const filteredHistory = history.filter(h => (h.patients?.name || "").toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <div className="page">
      <h1>Sedation</h1>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setTab("calculator")}>Calculator</button>
        <button onClick={() => setTab("stock")}>Stock</button>
      </div>

      {tab === "calculator" && (
        <>
          <div className="card">
            <div style={{ position: "relative" }}>
              <input placeholder="Search patient..." value={patientSearch} onChange={e => handlePatientSearch(e.target.value)} style={{ borderColor: patientId ? "#27ae60" : "#eee" }} />
              {patientSearch && filteredPatients.length > 0 && !patientId && (
                <div style={{ position: "absolute", background: "white", border: "1px solid #ccc", width: "100%", zIndex: 10 }}>
                  {filteredPatients.map(p => (
                    <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}>{p.name}</div>
                  ))}
                </div>
              )}
            </div>

            <select value={protocolId} onChange={e => setProtocolId(e.target.value)} style={{ marginTop: "10px" }}>
              <option value="">Select protocol</option>
              {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight (kg)" style={{ marginTop: "10px" }} />
            <button onClick={calculate} style={{ marginTop: "10px" }}>Calculate</button>

            {results.map((r, i) => (
              <div key={i} style={{ ...drugResultStyle, padding: "12px", background: "#f8f9fb", borderRadius: "10px", marginTop: "10px", border: "1px solid #eee" }}>
                <strong>{r.label}</strong>
                <input value={r.ml} onChange={e => updateDose(i, e.target.value)} />
                <select value={r.batchId} onChange={e => updateBatch(i, e.target.value)}>
                  <option value="">Batch</option>
                  {getStockForDrug(r.drug).map(s => <option key={s.id} value={s.id}>{s.batch} ({s.total_ml} ml)</option>)}
                </select>
              </div>
            ))}

            {results.length > 0 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                {/* Updated Save button to green and Consent button to yellow[cite: 8] */}
                <button onClick={save} style={greenBtn}>Save</button>
                <button onClick={goToConsent} style={yellowBtn}>Consent</button>
              </div>
            )}
          </div>

          <div style={greyBox}>
            <input 
              placeholder="Search history..." 
              value={historySearch} 
              onChange={e => setHistorySearch(e.target.value)} 
              style={{ background: "white" }} 
            />
          </div>

          <div style={greyBox}>
            <h3 style={{ marginBottom: "20px" }}>History List</h3>
            
            {filteredHistory.map(h => (
              <div key={h.id} className="card" style={{ marginBottom: "15px" }}>
                <strong style={{ fontSize: "18px", display: "block", marginBottom: "10px" }}>
                  {h.patients?.name} 
                  <span style={{ color: "#7f8c8d", fontSize: "14px", fontWeight: "normal", marginLeft: "5px" }}>
                    ({h.patients?.clients?.surname || "No Client"})
                  </span>
                </strong>
                {editingHistoryId === h.id ? (
                  <>
                    {editHistoryResults.map((r, i) => (
                      <div key={i} style={{ marginBottom: "5px" }}>
                        {r.drug}: <input value={r.ml} onChange={e => { const u = [...editHistoryResults]; u[i].ml = parseFloat(e.target.value); setEditHistoryResults(u); }} />
                      </div>
                    ))}
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => saveEditHistory(h.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingHistoryId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "15px", color: "#333", lineHeight: "1.6" }}>
                      {h.results?.map((r, i) => <div key={i}>{r.drug}: {r.ml} ml</div>)}
                    </div>
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => startEditHistory(h)}>Edit</button>
                      <button style={redBtn} onClick={() => deleteRow(h.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredHistory.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No history found.</p>}
          </div>
        </>
      )}

      {tab === "stock" && (
        <>
          <div className="card">
            <h3>Add Stock</h3>
            <input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Drug" />
            <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Batch" />
            <input value={qty} onChange={e => setQty(e.target.value)} placeholder="Total ml" />
            <button onClick={addStock}>Add Stock</button>
          </div>

          <div style={greyBox}>
             <input placeholder="Search stock..." style={{ background: "white" }} />
          </div>

          <div style={greyBox}>
            <h3 style={{ marginBottom: "20px" }}>Stock List</h3>
            {stock.filter(s => !s.is_archived).map(s => (
              <div key={s.id} className="card" style={{ marginBottom: "15px" }}>
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
                    <strong style={{ fontSize: "18px", display: "block", marginBottom: "5px" }}>{s.drug}</strong>
                    <div style={{ color: "#7f8c8d", fontSize: "14px" }}>Batch: {s.batch} | {s.total_ml} ml</div>
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => startEditStock(s)}>Edit</button>
                      <button style={yellowBtn} onClick={() => archiveStock(s.id)}>Archive</button>
                      <button style={redBtn} onClick={() => deleteStock(s.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {stock.filter(s => !s.is_archived).length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No stock available.</p>}
          </div>
        </>
      )}
    </div>
  );
}