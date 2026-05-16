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

const blueBtn = { background: "#5b8fb9", color: "white", border: "none", borderRadius: "12px", padding: "12px", cursor: "pointer", fontWeight: "bold" };
const greenBtn = { background: "#27ae60", color: "white", border: "none", borderRadius: "12px", padding: "12px", cursor: "pointer", fontWeight: "bold" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" };
const drugResultStyle = { padding: "12px", background: "#f8f9fb", borderRadius: "10px", marginTop: "15px", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "8px" };

export default function Sedation() {
  const [protocols, setProtocols] = useState([]);
  const [stock, setStock] = useState([]);

  // Calculator State
  const [protocolId, setProtocolId] = useState("");
  const [weight, setWeight] = useState("");
  const [results, setResults] = useState([]);

  // Temporary 24hr History
  const [localHistory, setLocalHistory] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0); 
    fetchProtocols();
    fetchStock();
    loadTemporaryHistory();
  }, []);

  async function fetchProtocols() {
    const { data } = await supabase.from("protocols").select(`*, protocol_drugs (*)`).order("name");
    setProtocols(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase.from("stock").select("*");
    setStock(data || []);
  }

  function loadTemporaryHistory() {
    const stored = JSON.parse(localStorage.getItem('temp_sedation_history') || '[]');
    const valid = stored.filter(r => Date.now() - r.timestamp < 24 * 60 * 60 * 1000);
    if (stored.length !== valid.length) {
      localStorage.setItem('temp_sedation_history', JSON.stringify(valid));
    }
    setLocalHistory(valid);
  }

  function getStockForDrug(drug) {
    return stock.filter(s => normaliseDrugName(s.drug) === normaliseDrugName(drug) && s.total_ml > 0 && !s.is_archived);
  }

  async function calculate() {
    if (!protocolId || !weight) return alert("Select a protocol and enter a weight.");
    const proto = protocols.find(p => String(p.id) === String(protocolId));
    if (!proto || !proto.protocol_drugs) return;

    const calc = proto.protocol_drugs.map(d => ({
      drug: normaliseDrugName(d.drug_name), 
      label: d.drug_name,
      ml: Number(((d.mg_per_kg * Number(weight)) / d.mg_per_ml).toFixed(3)),
      waste: 0.05, 
      batchName: "" 
    }));
    setResults(calc);
  }

  function updateDose(i, val) {
    const updated = [...results];
    updated[i].ml = val === "" ? "" : parseFloat(val) || 0;
    setResults(updated);
  }

  function saveToTemporaryHistory() {
    const protoName = protocols.find(p => String(p.id) === String(protocolId))?.name || "Custom";
    const newRecord = {
      id: Date.now(),
      protocolName: protoName,
      weight,
      results: [...results],
      timestamp: Date.now()
    };
    
    const updatedHistory = [newRecord, ...localHistory];
    localStorage.setItem('temp_sedation_history', JSON.stringify(updatedHistory));
    setLocalHistory(updatedHistory);
    
    setResults([]);
    setProtocolId("");
    setWeight("");
    alert("Doses saved temporarily to your browser.");
  }

  function clearHistory() {
    if(window.confirm("Clear all temporary calculation history?")) {
      localStorage.removeItem('temp_sedation_history');
      setLocalHistory([]);
    }
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>Sedation Calculator</h1>
      <p style={{color: "#666", marginBottom: "20px", textAlign: "center"}}>
        Enter weight and select a protocol to generate drug volumes. Records saved here are temporary and will clear from your browser after 24 hours. They do not permanently deduct from stock.
      </p>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <select value={protocolId} onChange={e => setProtocolId(e.target.value)} style={inputStyle}>
          <option value="">-- Select Protocol --</option>
          {protocols.map(p => <option key={p.id} value={p.id}>{p.name} {p.species ? `(${p.species})` : ""}</option>)}
        </select>

        <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Patient Weight (kg)" style={inputStyle} />
        
        <button onClick={calculate} style={{ ...blueBtn, width: "100%" }}>Calculate Doses</button>

        {results.map((r, i) => (
          <div key={i} style={drugResultStyle}>
            <strong style={{ fontSize: "16px", color: "#2c3e50" }}>{r.label}</strong>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#666" }}>Calculated Dose (ml)</label>
                <input type="number" step="0.01" value={r.ml} onChange={e => updateDose(i, e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }} />
              </div>
            </div>
            
            <select value={r.batchName} onChange={e => {
              const updated = [...results];
              updated[i].batchName = e.target.value;
              setResults(updated);
            }} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }}>
              <option value="">-- Reference Batch (Optional) --</option>
              {getStockForDrug(r.drug).map(s => <option key={s.id} value={s.batch}>{s.batch} ({s.total_ml} ml in stock)</option>)}
            </select>
          </div>
        ))}

        {results.length > 0 && (
          <button onClick={saveToTemporaryHistory} style={{ ...greenBtn, marginTop: "10px", width: "100%" }}>
            Save Temporary Record
          </button>
        )}
      </div>

      {localHistory.length > 0 && (
        <div style={{ marginTop: "30px", background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Recent Calculations (24h)</h3>
            <button onClick={clearHistory} style={{ background: "transparent", color: "#e74c3c", border: "1px solid #e74c3c", padding: "5px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Clear All</button>
          </div>
          
          {localHistory.map(h => (
            <div key={h.id} style={{ background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", border: "1px solid #eee", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong>{h.protocolName}</strong>
                <span style={{ background: "#27ae60", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>{h.weight} kg</span>
              </div>
              <div style={{ fontSize: "12px", color: "#95a5a6", marginBottom: "10px" }}>
                Calculated on {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
              
              {h.results.map((r, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "4px 0", borderTop: "1px solid #f1f1f1" }}>
                  <span style={{ color: "#333" }}>{r.label}</span>
                  <strong>{r.ml} ml</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}