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

// Global button and container styles
const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const yellowBtn = { flex: 1, background: "#f39c12", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const greenBtn = { flex: 1, background: "#27ae60", color: "white", border: "none", borderRadius: "12px", padding: "10px", cursor: "pointer" };
const drugResultStyle = { marginBottom: "15px", display: "flex", flexDirection: "column", gap: "5px" };

const greyBox = { 
  background: "#f8f9fb", 
  padding: "20px", 
  borderRadius: "20px", 
  border: "1px solid #eee",
  marginTop: "20px"
};

const whiteShadowBox = {
  background: "white",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "15px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  border: "1px solid #eee"
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
  const [expiryDate, setExpiryDate] = useState(""); // NEW DATE FIELD

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
    
    // Waste is always pre-set to 0.05 when calculating
    const calc = data.map(d => ({
      drug: normaliseDrugName(d.drug_name),
      label: d.drug_name,
      ml: Number(((d.mg_per_kg * Number(weight)) / d.mg_per_ml).toFixed(3)),
      waste: 0.05, 
      batchId: ""
    }));
    setResults(calc);
  }

  function updateDose(i, val) {
    const updated = [...results];
    updated[i].ml = val === "" ? "" : parseFloat(val) || 0;
    setResults(updated);
  }

  function updateWaste(i, val) {
    const updated = [...results];
    updated[i].waste = val === "" ? "" : parseFloat(val) || 0;
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

    // Ensure waste is handled as a number and defaults to 0.05 if somehow cleared
    const formattedResults = results.map(r => ({
      ...r,
      waste: r.waste !== "" ? parseFloat(r.waste) : 0.05
    }));

    const { error } = await supabase.from("sedation_records").insert([{ patient_id: patientId, protocol_id: protocolId, weight, results: formattedResults }]);
    if (error) return alert("Error saving: " + error.message);

    for (const r of formattedResults) {
      const totalUsed = (parseFloat(r.ml) || 0) + (parseFloat(r.waste) || 0);
      if (r.batchId && totalUsed > 0) {
        const current = stock.find(s => String(s.id) === String(r.batchId));
        if (current) {
          const newVol = Math.max(0, current.total_ml - totalUsed);
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
    await supabase.from("stock").insert([{ 
      drug: drugName.trim(), 
      batch: batch.trim(), 
      total_ml: Number(qty), 
      expiry_date: expiryDate || null, 
      is_archived: false 
    }]);
    setDrugName(""); setBatch(""); setQty(""); setExpiryDate(""); fetchStock();
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

  function startEditStock(s) { 
    setEditingStockId(s.id); 
    setEditStockData({ ...s }); 
  }
  
  async function saveEditStock(id) { 
    await supabase.from("stock").update({
      drug: editStockData.drug,
      batch: editStockData.batch,
      total_ml: Number(editStockData.total_ml),
      expiry_date: editStockData.expiry_date || null
    }).eq("id", id); 
    setEditingStockId(null); 
    fetchStock(); 
  }

  function startEditHistory(h) { 
    setEditingHistoryId(h.id); 
    // Always pre-set waste to 0.05 for old history records that might not have it
    const prefilledResults = (h.results || []).map(r => ({
      ...r,
      waste: r.waste !== undefined ? r.waste : 0.05
    }));
    setEditHistoryResults(prefilledResults); 
  }

  async function saveEditHistory(id) {
    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (!original) return;

    for (let i = 0; i < editHistoryResults.length; i++) {
      const oldR = original.results[i];
      const newR = editHistoryResults[i];

      if (oldR && oldR.batchId) {
        const oldWaste = oldR.waste !== undefined ? parseFloat(oldR.waste) : 0.05;
        const newWaste = newR.waste !== "" ? parseFloat(newR.waste) : 0.05;

        const oldTotal = (parseFloat(oldR.ml) || 0) + oldWaste;
        const newTotal = (parseFloat(newR.ml) || 0) + newWaste;
        const diff = oldTotal - newTotal; 
        
        if (diff !== 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", oldR.batchId).single();
          if (currentStock) {
            await supabase.from("stock").update({ total_ml: currentStock.total_ml + diff }).eq("id", oldR.batchId);
          }
        }
      }
    }

    // Ensure we save the waste value properly
    const finalResultsToSave = editHistoryResults.map(r => ({
      ...r,
      waste: r.waste !== "" ? parseFloat(r.waste) : 0.05
    }));

    await supabase.from("sedation_records").update({ results: finalResultsToSave }).eq("id", id);
    setEditingHistoryId(null);
    fetchHistory();
    fetchStock();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record? This will return drug volumes to stock.")) return;

    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (original && original.results) {
      for (const r of original.results) {
        const wasteVal = r.waste !== undefined ? parseFloat(r.waste) : 0.05;
        const totalToReturn = (parseFloat(r.ml) || 0) + wasteVal;
        
        if (r.batchId && totalToReturn > 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", r.batchId).single();
          if (currentStock) {
            await supabase.from("stock").update({ total_ml: currentStock.total_ml + totalToReturn }).eq("id", r.batchId);
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
              <input placeholder="Search patient..." value={patientSearch} onChange={e => handlePatientSearch(e.target.value)} style={{ borderColor: patientId ? "#27ae60" : undefined }} />
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
            <button onClick={calculate} style={{ marginTop: "10px", width: "100%" }}>Calculate</button>

            {results.map((r, i) => (
              <div key={i} style={{ ...drugResultStyle, padding: "12px", background: "#f8f9fb", borderRadius: "10px", marginTop: "10px", border: "1px solid #eee" }}>
                <strong>{r.label}</strong>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "2px" }}>Dose (ml)</label>
                    <input value={r.ml} onChange={e => updateDose(i, e.target.value)} style={{ width: "100%", boxSizing: "border-box", margin: 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "2px" }}>Waste (ml)</label>
                    <input value={r.waste} onChange={e => updateWaste(i, e.target.value)} style={{ width: "100%", boxSizing: "border-box", margin: 0 }} />
                  </div>
                </div>
                <select value={r.batchId} onChange={e => updateBatch(i, e.target.value)} style={{ marginTop: "5px" }}>
                  <option value="">Batch</option>
                  {getStockForDrug(r.drug).map(s => <option key={s.id} value={s.id}>{s.batch} ({s.total_ml} ml)</option>)}
                </select>
              </div>
            ))}

            {results.length > 0 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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
              style={{ background: "white", margin: 0 }} 
            />
          </div>

          <div style={greyBox}>
            <h3 style={{ marginBottom: "20px" }}>History List</h3>
            
            {filteredHistory.map(h => (
              <div key={h.id} style={whiteShadowBox}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ fontSize: "18px", display: "block", marginBottom: "10px" }}>
                    {h.patients?.name} 
                    <span style={{ color: "#7f8c8d", fontSize: "14px", fontWeight: "normal", marginLeft: "5px" }}>
                      ({h.patients?.clients?.surname || "No Client"})
                    </span>
                  </strong>
                </div>
                {editingHistoryId === h.id ? (
                  <>
                    {editHistoryResults.map((r, i) => (
                      <div key={i} style={{ marginBottom: "5px", display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ width: "80px", fontWeight: "bold" }}>{r.drug}:</span>
                        <input style={{ width: "60px", padding: "8px", margin: 0 }} value={r.ml} onChange={e => { const u = [...editHistoryResults]; u[i].ml = e.target.value === "" ? "" : parseFloat(e.target.value) || 0; setEditHistoryResults(u); }} placeholder="ml" />
                        <span style={{ fontSize: "12px", color: "#666" }}>waste:</span>
                        <input style={{ width: "60px", padding: "8px", margin: 0 }} value={r.waste} onChange={e => { const u = [...editHistoryResults]; u[i].waste = e.target.value === "" ? "" : parseFloat(e.target.value) || 0; setEditHistoryResults(u); }} placeholder="waste" />
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
                      {h.results?.map((r, i) => (
                        <div key={i}>
                          {r.drug}: {r.ml} ml <span style={{ color: "#7f8c8d", fontSize: "13px" }}>(+ {r.waste !== undefined ? r.waste : 0.05} ml waste)</span>
                        </div>
                      ))}
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
            <input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Drug" style={{ marginBottom: "10px" }} />
            <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Batch" style={{ marginBottom: "10px" }} />
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Total ml" style={{ flex: 1, margin: 0 }} />
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={{ flex: 1, margin: 0 }} />
            </div>
            <button onClick={addStock} style={{ width: "100%" }}>Add Stock</button>
          </div>

          <div style={greyBox}>
             <input placeholder="Search stock..." style={{ background: "white", margin: 0 }} />
          </div>

          <div style={greyBox}>
            <h3 style={{ marginBottom: "20px" }}>Stock List</h3>
            {stock.filter(s => !s.is_archived).map(s => (
              <div key={s.id} style={whiteShadowBox}>
                {editingStockId === s.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input placeholder="Drug Name" value={editStockData.drug} onChange={e => setEditStockData({ ...editStockData, drug: e.target.value })} style={{ margin: 0 }} />
                    <input placeholder="Batch Number" value={editStockData.batch} onChange={e => setEditStockData({ ...editStockData, batch: e.target.value })} style={{ margin: 0 }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input placeholder="Total ml" type="number" value={editStockData.total_ml} onChange={e => setEditStockData({ ...editStockData, total_ml: e.target.value })} style={{ flex: 1, margin: 0 }} />
                      <input type="date" value={editStockData.expiry_date || ""} onChange={e => setEditStockData({ ...editStockData, expiry_date: e.target.value })} style={{ flex: 1, margin: 0 }} />
                    </div>
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => saveEditStock(s.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingStockId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <strong style={{ fontSize: "18px", display: "block", marginBottom: "5px" }}>{s.drug}</strong>
                    <div style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6" }}>
                      Batch: {s.batch} <br/>
                      Amount: {s.total_ml} ml <br/>
                      {s.expiry_date && <span>Date: {s.expiry_date}</span>}
                    </div>
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