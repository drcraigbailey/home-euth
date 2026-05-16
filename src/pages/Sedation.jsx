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

const tabBtnStyle = (isActive) => ({
  flex: 1, padding: "12px", border: "none", borderRadius: "12px", 
  cursor: "pointer", fontWeight: "bold", 
  background: isActive ? "#5b8fb9" : "#eee", color: isActive ? "white" : "#666"
});

export default function Sedation() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("calculator"); // calculator, stock, protocols

  // Calculator State
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [protocolName, setProtocolName] = useState(""); 
  const [weight, setWeight] = useState("");
  const [results, setResults] = useState([]);

  // Stock State
  const [stock, setStock] = useState([]);
  const [stockDrugName, setStockDrugName] = useState("");
  const [batch, setBatch] = useState("");
  const [qty, setQty] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockData, setEditStockData] = useState({});

  // History State
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editHistoryResults, setEditHistoryResults] = useState([]);

  // Protocols Builder State
  const [protocols, setProtocols] = useState([]);
  const [protoSearch, setProtoSearch] = useState("");
  const [protoName, setProtoName] = useState("");
  const [protoSpecies, setProtoSpecies] = useState("");
  const [editingProtoId, setEditingProtoId] = useState(null);
  const [protoDrugs, setProtoDrugs] = useState([]);
  const [protoDrugName, setProtoDrugName] = useState("");
  const [protoMgKg, setProtoMgKg] = useState("");
  const [protoMgMl, setProtoMgMl] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0); 
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
    checkAdminStatus(); 
  }, []);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!profile?.is_admin);
    } else {
      setIsAdmin(false);
    }
  }

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
    // Fetch nested protocol drugs here so they are ready for the builder tab
    const { data } = await supabase.from("protocols").select(`*, protocol_drugs (*)`).order("name");
    setProtocols(data || []);
  }

  async function fetchHistory() {
    const { data } = await supabase.from("sedation_records").select(`*, patients(name, species, clients(surname))`).order("created_at", { ascending: false });
    setHistory(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase.from("stock").select("*");
    setStock(data || []);
  }

  // --- CALCULATOR LOGIC ---
  function handlePatientSearch(value) {
    setPatientSearch(value);
    if (patientId) setPatientId(""); 
    const filtered = patients.filter(p => (p.name || "").toLowerCase().includes(value.toLowerCase()));
    setFilteredPatients(filtered);
  }

  function selectPatient(p) {
    setPatientId(p.id); setPatientSearch(p.name); setFilteredPatients([]);
    setWeight(p.weight || p.weight_kg || ""); setTab("calculator");
  }

  async function calculate() {
    if (!protocolId || !weight) return alert("Select protocol + weight");
    const { data } = await supabase.from("protocol_drugs").select("*").eq("protocol_id", protocolId);
    const calc = data.map(d => ({
      drug: normaliseDrugName(d.drug_name), label: d.drug_name,
      ml: Number(((d.mg_per_kg * Number(weight)) / d.mg_per_ml).toFixed(3)),
      waste: 0.05, batchId: "", batchName: "" 
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
    updated[i].batchName = val;
    const match = getStockForDrug(updated[i].drug).find(s => `${s.batch} (${s.total_ml} ml)` === val);
    updated[i].batchId = match ? match.id : "";
    setResults(updated);
  }

  async function save() {
    const missingBatches = results.some(r => !r.batchId);
    if (missingBatches && !window.confirm("No valid batch selected. Save anyway?")) return;
    const formattedResults = results.map(r => ({ ...r, waste: r.waste !== "" ? parseFloat(r.waste) : 0.05 }));
    const { error } = await supabase.from("sedation_records").insert([{ patient_id: patientId, protocol_id: protocolId, weight, results: formattedResults }]);
    if (!error) {
      for (const r of formattedResults) {
        const totalUsed = (parseFloat(r.ml) || 0) + (parseFloat(r.waste) || 0);
        if (r.batchId && totalUsed > 0) {
          const current = stock.find(s => String(s.id) === String(r.batchId));
          if (current) await supabase.from("stock").update({ total_ml: Math.max(0, current.total_ml - totalUsed) }).eq("id", current.id);
        }
      }
      setResults([]); setProtocolName(""); setProtocolId(""); setWeight(""); fetchHistory(); fetchStock();
    } else alert("Error saving: " + error.message);
  }

  // --- STOCK LOGIC ---
  function getStockForDrug(drug) {
    return stock.filter(s => normaliseDrugName(s.drug) === normaliseDrugName(drug) && s.total_ml > 0 && !s.is_archived);
  }

  async function addStock() {
    if (!stockDrugName.trim() || !batch.trim() || !qty.trim()) return alert("Fill all stock fields");
    await supabase.from("stock").insert([{ drug: stockDrugName.trim(), batch: batch.trim(), total_ml: Number(qty), expiry_date: expiryDate || null, is_archived: false }]);
    setStockDrugName(""); setBatch(""); setQty(""); setExpiryDate(""); fetchStock();
  }

  function startEditStock(s) { setEditingStockId(s.id); setEditStockData({ ...s }); }
  async function saveEditStock(id) { await supabase.from("stock").update({ drug: editStockData.drug, batch: editStockData.batch, total_ml: Number(editStockData.total_ml), expiry_date: editStockData.expiry_date || null }).eq("id", id); setEditingStockId(null); fetchStock(); }
  async function archiveStock(id) { if (window.confirm("Archive this bottle?")) { await supabase.from("stock").update({ is_archived: true }).eq("id", id); fetchStock(); } }
  async function deleteStock(id) { if (window.confirm("Delete stock completely?")) { await supabase.from("stock").delete().eq("id", id); fetchStock(); } }

  // --- HISTORY LOGIC ---
  function startEditHistory(h) { 
    setEditingHistoryId(h.id); 
    const prefilledResults = (h.results || []).map(r => ({ ...r, waste: r.waste !== undefined ? r.waste : 0.05 }));
    setEditHistoryResults(prefilledResults); 
  }

  async function saveEditHistory(id) {
    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (!original) return;
    for (let i = 0; i < editHistoryResults.length; i++) {
      const oldR = original.results[i]; const newR = editHistoryResults[i];
      if (oldR && oldR.batchId) {
        const oldWaste = oldR.waste !== undefined ? parseFloat(oldR.waste) : 0.05;
        const newWaste = newR.waste !== "" ? parseFloat(newR.waste) : 0.05;
        const diff = ((parseFloat(oldR.ml) || 0) + oldWaste) - ((parseFloat(newR.ml) || 0) + newWaste); 
        if (diff !== 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", oldR.batchId).single();
          if (currentStock) await supabase.from("stock").update({ total_ml: currentStock.total_ml + diff }).eq("id", oldR.batchId);
        }
      }
    }
    const finalResultsToSave = editHistoryResults.map(r => ({ ...r, waste: r.waste !== "" ? parseFloat(r.waste) : 0.05 }));
    await supabase.from("sedation_records").update({ results: finalResultsToSave }).eq("id", id);
    setEditingHistoryId(null); fetchHistory(); fetchStock();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record? This will return drug volumes to stock.")) return;
    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", id).single();
    if (original && original.results) {
      for (const r of original.results) {
        const totalToReturn = (parseFloat(r.ml) || 0) + (r.waste !== undefined ? parseFloat(r.waste) : 0.05);
        if (r.batchId && totalToReturn > 0) {
          const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", r.batchId).single();
          if (currentStock) await supabase.from("stock").update({ total_ml: currentStock.total_ml + totalToReturn }).eq("id", r.batchId);
        }
      }
    }
    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory(); fetchStock();
  }

  // --- PROTOCOLS BUILDER LOGIC ---
  function addProtoDrug() {
    const mgKg = parseFloat(protoMgKg); const mgMl = parseFloat(protoMgMl);
    if (!protoDrugName.trim() || isNaN(mgKg) || isNaN(mgMl)) return alert("Fill all drug fields correctly");
    setProtoDrugs(prev => [...prev, { drug_name: protoDrugName.trim(), mg_per_kg: mgKg, mg_per_ml: mgMl }]);
    setProtoDrugName(""); setProtoMgKg(""); setProtoMgMl("");
  }

  async function saveProtocolObj() {
    if (!protoName.trim() || protoDrugs.length === 0) return alert("Enter a name and at least one drug");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;
      let pId = editingProtoId;

      if (editingProtoId) {
        await supabase.from("protocols").update({ name: protoName, species: protoSpecies, user_id }).eq("id", editingProtoId);
        await supabase.from("protocol_drugs").delete().eq("protocol_id", editingProtoId);
      } else {
        const { data } = await supabase.from("protocols").insert([{ name: protoName, species: protoSpecies, user_id }]).select().single();
        pId = data.id;
      }
      await supabase.from("protocol_drugs").insert(protoDrugs.map(d => ({ protocol_id: pId, ...d })));
      
      setProtoName(""); setProtoSpecies(""); setProtoDrugs([]); setEditingProtoId(null);
      fetchProtocols();
      alert("Protocol saved successfully!");
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  }

  function startEditProtocol(p) {
    setEditingProtoId(p.id); setProtoName(p.name); setProtoSpecies(p.species || "");
    setProtoDrugs(p.protocol_drugs || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProtocolObj(id) {
    if (!window.confirm("Delete protocol?")) return;
    await supabase.from("protocol_drugs").delete().eq("protocol_id", id);
    await supabase.from("protocols").delete().eq("id", id);
    fetchProtocols();
  }

  const filteredHistory = history.filter(h => (h.patients?.name || "").toLowerCase().includes(historySearch.toLowerCase()));
  const filteredProtocols = protocols.filter(p => p.name.toLowerCase().includes(protoSearch.toLowerCase()));

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1>Sedation</h1>
      
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button style={tabBtnStyle(tab === "calculator")} onClick={() => setTab("calculator")}>Calculator</button>
        <button style={tabBtnStyle(tab === "stock")} onClick={() => setTab("stock")}>Stock</button>
        <button style={tabBtnStyle(tab === "protocols")} onClick={() => setTab("protocols")}>Protocols</button>
      </div>

      {/* ================= CALCULATOR & HISTORY TAB ================= */}
      {tab === "calculator" && (
        <>
          <div className="card">
            <div style={{ position: "relative" }}>
              <input placeholder="Search patient..." value={patientSearch} onChange={e => handlePatientSearch(e.target.value)} style={{ borderColor: patientId ? "#27ae60" : undefined, width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
              {patientSearch && !patientId && filteredPatients.length > 0 && (
                <div style={{ position: "absolute", background: "white", border: "1px solid #ccc", width: "100%", zIndex: 10 }}>
                  {filteredPatients.map(p => <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}>{p.name}</div>)}
                </div>
              )}
            </div>
            
            <input 
              list="protocol-options" placeholder="Select protocol (Type to search)" value={protocolName} 
              onChange={e => { setProtocolName(e.target.value); const found = protocols.find(p => p.name === e.target.value); setProtocolId(found ? found.id : ""); }} 
              style={{ marginTop: "10px", width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
            />
            <datalist id="protocol-options">{protocols.map(p => <option key={p.id} value={p.name} />)}</datalist>

            <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight (kg)" style={{ marginTop: "10px", width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
            <button onClick={calculate} style={{ ...blueBtn, marginTop: "15px", width: "100%" }}>Calculate</button>

            {results.map((r, i) => (
              <div key={i} style={{ ...drugResultStyle, padding: "12px", background: "#f8f9fb", borderRadius: "10px", marginTop: "15px", border: "1px solid #eee" }}>
                <strong>{r.label}</strong>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: "12px" }}>Dose (ml)</label><input value={r.ml} onChange={e => updateDose(i, e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} /></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: "12px" }}>Waste (ml)</label><input value={r.waste} onChange={e => updateWaste(i, e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} /></div>
                </div>
                <input list={`batch-options-${i}`} placeholder="Select Batch (Type to search)" value={r.batchName || ""} onChange={e => updateBatch(i, e.target.value)} style={{ marginTop: "5px", width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
                <datalist id={`batch-options-${i}`}>{getStockForDrug(r.drug).map(s => <option key={s.id} value={`${s.batch} (${s.total_ml} ml)`} />)}</datalist>
              </div>
            ))}
            {results.length > 0 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={save} style={greenBtn}>Save</button>
                <button onClick={() => { if(!patientId) alert("Select a patient"); else navigate(`/patient/${patientId}`); }} style={yellowBtn}>Consent</button>
              </div>
            )}
          </div>

          <div style={greyBox}><input placeholder="Search history..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} /></div>

          <div style={greyBox}>
            {filteredHistory.map(h => (
              <div key={h.id} style={whiteShadowBox}>
                <strong>{h.patients?.name}</strong>
                {editingHistoryId === h.id ? (
                  <>
                    {editHistoryResults.map((r, i) => (
                      <div key={i} style={{ marginBottom: "5px", display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap", marginTop: "10px" }}>
                        <span style={{ width: "80px", fontWeight: "bold" }}>{r.drug}:</span>
                        <input style={{ width: "60px", padding: "8px", margin: 0, borderRadius: "5px", border: "1px solid #ccc" }} value={r.ml} onChange={e => { const u = [...editHistoryResults]; u[i].ml = e.target.value === "" ? "" : parseFloat(e.target.value) || 0; setEditHistoryResults(u); }} placeholder="ml" />
                        <span style={{ fontSize: "12px", color: "#666" }}>waste:</span>
                        <input style={{ width: "60px", padding: "8px", margin: 0, borderRadius: "5px", border: "1px solid #ccc" }} value={r.waste} onChange={e => { const u = [...editHistoryResults]; u[i].waste = e.target.value === "" ? "" : parseFloat(e.target.value) || 0; setEditHistoryResults(u); }} placeholder="waste" />
                      </div>
                    ))}
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => saveEditHistory(h.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingHistoryId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "14px", marginTop: "5px" }}>{h.results?.map((r, idx) => <div key={idx}>{r.drug}: {r.ml} ml (+ {r.waste} ml waste)</div>)}</div>
                    <div style={btnRow}>
                      {isAdmin && <button style={blueBtn} onClick={() => startEditHistory(h)}>Edit</button>}
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

      {/* ================= STOCK TAB ================= */}
      {tab === "stock" && (
        <>
          <div className="card">
            <h3>Add Stock</h3>
            <input placeholder="Drug" value={stockDrugName} onChange={e => setStockDrugName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" }} />
            <input placeholder="Batch" value={batch} onChange={e => setBatch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="number" placeholder="Total ml" value={qty} onChange={e => setQty(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            </div>
            <button onClick={addStock} style={{ ...blueBtn, marginTop: "15px", width: "100%" }}>Add Stock</button>
          </div>
          <div style={greyBox}>
            {stock.filter(s => !s.is_archived).map(s => (
              <div key={s.id} style={whiteShadowBox}>
                {editingStockId === s.id ? (
                  <>
                    <input value={editStockData.drug} onChange={e => setEditStockData({ ...editStockData, drug: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "10px" }} />
                    <input value={editStockData.batch} onChange={e => setEditStockData({ ...editStockData, batch: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "10px" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="number" value={editStockData.total_ml} onChange={e => setEditStockData({ ...editStockData, total_ml: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                      <input type="date" value={editStockData.expiry_date || ""} onChange={e => setEditStockData({ ...editStockData, expiry_date: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                    </div>
                    <div style={btnRow}>
                      <button style={blueBtn} onClick={() => saveEditStock(s.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingStockId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>{s.drug}</strong><br/>
                    <div style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6" }}>
                      Batch: {s.batch} | {s.total_ml} ml<br/>
                      {s.expiry_date && `Date: ${s.expiry_date}`}
                    </div>
                    {isAdmin && (
                      <div style={btnRow}>
                        <button style={blueBtn} onClick={() => startEditStock(s)}>Edit</button>
                        <button style={yellowBtn} onClick={() => archiveStock(s.id)}>Archive</button>
                        <button style={redBtn} onClick={() => deleteStock(s.id)}>Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {stock.filter(s => !s.is_archived).length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No stock available.</p>}
          </div>
        </>
      )}

      {/* ================= PROTOCOLS TAB ================= */}
      {tab === "protocols" && (
        <>
          <div className="card">
            <h3>{editingProtoId ? "Edit Protocol" : "Add Protocol"}</h3>
            <input placeholder="Protocol name" value={protoName} onChange={e => setProtoName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" }} />
            <input placeholder="Species" value={protoSpecies} onChange={e => setProtoSpecies(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" }} />

            <h4 style={{ marginTop: "20px" }}>Add Drug</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              <input placeholder="Drug name" value={protoDrugName} onChange={e => setProtoDrugName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <input placeholder="mg/kg" value={protoMgKg} onChange={e => setProtoMgKg(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
                <input placeholder="mg/ml" value={protoMgMl} onChange={e => setProtoMgMl(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
              </div>
            </div>
            <button style={{ marginTop: "10px", background: "#5b8fb9", color: "white", padding: "12px", borderRadius: "12px", border: "none", cursor: "pointer" }} onClick={addProtoDrug}>+ Add Drug</button>

            {protoDrugs.map((d, i) => (
              <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fb", padding: "10px", borderRadius: "10px", border: "1px solid #eee" }}>
                <span><strong>{d.drug_name}</strong> — {d.mg_per_kg} mg/kg</span>
                <button onClick={() => setProtoDrugs(protoDrugs.filter((_, idx) => idx !== i))} style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "8px", cursor: "pointer" }}>Remove</button>
              </div>
            ))}

            <button style={{ marginTop: "20px", background: "#27ae60", color: "white", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "bold", width: "100%", cursor: "pointer" }} onClick={saveProtocolObj}>
              {editingProtoId ? "Save Changes" : "Save Protocol"}
            </button>
          </div>

          <div style={greyBox}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Library</h3>
            <input placeholder="Search..." value={protoSearch} onChange={e => setProtoSearch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "20px" }} />

            {filteredProtocols.map(p => (
              <div key={p.id} style={whiteShadowBox}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: "center"}}>
                  <strong style={{ fontSize: "18px" }}>{p.name}</strong>
                  {p.species && <span style={{fontSize: '12px', background: '#eef2f4', padding: '4px 8px', borderRadius: '10px', fontWeight: "bold"}}>{p.species}</span>}
                </div>
                
                <div style={{ fontSize: "15px", color: "#333", margin: "10px 0", background: "#f8f9fb", padding: "10px", borderRadius: "8px" }}>
                  {p.protocol_drugs?.map((d, i) => (
                    <div key={i}>• {d.drug_name}: {d.mg_per_kg} mg/kg</div>
                  ))}
                </div>

                {isAdmin && (
                  <div style={btnRow}>
                    <button style={blueBtn} onClick={() => startEditProtocol(p)}>Edit</button>
                    <button style={redBtn} onClick={() => deleteProtocolObj(p.id)}>Delete</button>
                  </div>
                )}
              </div>
            ))}
            {filteredProtocols.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No protocols found.</p>}
          </div>
        </>
      )}
    </div>
  );
}