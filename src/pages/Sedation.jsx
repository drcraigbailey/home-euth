import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  const { patientId: routePatientId } = useParams();

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
  const [stockSearch, setStockSearch] = useState("");

  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
  }, []);

  // 🔥 AUTO LOAD PATIENT FROM ROUTE
  useEffect(() => {
    if (!routePatientId) return;

    const loadPatient = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*, clients(surname)")
        .eq("id", routePatientId)
        .single();

      if (error || !data) {
        console.error("Failed to load patient:", error);
        return;
      }

      setPatientId(data.id);
      setWeight(data.weight || "");
      setPatientSearch(
        `${data.name} (${data.species}) – ${data.clients?.surname || ""}`
      );
    };

    loadPatient();
  }, [routePatientId]);

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
    const { data } = await supabase
      .from("stock")
      .select("*")
      .eq("archived", false);

    setStock(data || []);
  }

  const filteredPatients = patients.filter(p => {
    const search = patientSearch.toLowerCase();

    return (
      p.name?.toLowerCase().includes(search) ||
      p.clients?.surname?.toLowerCase().includes(search)
    );
  });

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

  async function addStock() {
    if (!drugName.trim() || !qty) {
      alert("Drug name and quantity required");
      return;
    }

    const payload = {
      drug: drugName.trim(),
      batch: batch || null,
      expiry: expiry || null,
      total_ml: Number(qty),
      mg_per_ml: conc ? Number(conc) : null
    };

    const { error } = await supabase.from("stock").insert([payload]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setDrugName("");
    setBatch("");
    setExpiry("");
    setQty("");
    setConc("");

    fetchStock();
  }

  async function archiveStock(id) {
    await supabase.from("stock").update({ archived: true }).eq("id", id);
    fetchStock();
  }

  async function deleteStock(id) {
    if (!window.confirm("Permanently delete this stock?")) return;
    await supabase.from("stock").delete().eq("id", id);
    fetchStock();
  }

  function getStockForDrug(drug) {
    const target = normaliseDrugName(drug);

    return stock.filter(s => {
      const stockName = normaliseDrugName(s.drug);
      return stockName === target;
    });
  }

  const filteredHistory = history.filter(h => {
    const search = historySearch.toLowerCase();

    return (
      h.patients?.name?.toLowerCase().includes(search) ||
      h.patients?.species?.toLowerCase().includes(search) ||
      h.patients?.clients?.surname?.toLowerCase().includes(search)
    );
  });

  const filteredStock = stock.filter(s =>
    (s.batch || "").toLowerCase().includes(stockSearch.toLowerCase())
  );

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
            <input
              placeholder="Search patient or client..."
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                setShowPatientResults(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (patientSearch.length > 0) setShowPatientResults(true);
              }}
              style={{ marginBottom: "10px" }}
            />

            {showPatientResults && (
              <div style={{ maxHeight: "180px", overflowY: "auto", background: "white", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: "10px" }}>
                {filteredPatients.slice(0, 6).map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setPatientId(p.id);
                      setWeight(p.weight || "");
                      setPatientSearch(`${p.name} (${p.clients?.surname || ""})`);
                      setShowPatientResults(false);
                    }}
                    style={{ cursor: "pointer", padding: "10px", borderBottom: "1px solid #eee" }}
                  >
                    <strong>{p.name}</strong> ({p.species}) – {p.clients?.surname}
                  </div>
                ))}
              </div>
            )}

            <select value={protocolId} onChange={(e) => setProtocolId(e.target.value)}>
              <option value="">Select protocol</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight" />

            <button onClick={calculate}>Calculate</button>

            {results.map((r, i) => (
              <div key={i} className="output-row">
                <strong>{r.label || r.drug}</strong>

                <input type="number" step="0.01" value={r.ml}
                  onChange={(e) => updateDose(i, parseFloat(e.target.value) || 0)}
                  style={{ width: "70px", marginLeft: "10px" }}
                />

                ml

                <select value={r.batchId} onChange={(e) => updateBatch(i, e.target.value)}>
                  <option value="">Select batch</option>
                  {getStockForDrug(r.drug).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.drug} | Batch: {s.batch || "—"} | {s.total_ml?.toFixed(2)} ml
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {results.length > 0 && (
              <button onClick={save}>Save to History</button>
            )}
          </>
        )}

        {tab === "stock" && (
          <>
            <div className="card">
              <h3>Current Stock</h3>

              <input
                placeholder="Search batch number..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />

              {filteredStock.map(s => (
                <div key={s.id} className="output-row">
                  <strong>{s.drug}</strong><br />
                  Batch: {s.batch} <br />
                  {s.total_ml} ml

                  <button onClick={() => archiveStock(s.id)}>Archive</button>
                  <button onClick={() => deleteStock(s.id)}>Delete</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {tab === "calculator" && (
        <div className="card">
          <h3>History</h3>

          <input
            placeholder="Search..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />

          {filteredHistory.map(h => (
            <div key={h.id} className="output-row">
              <strong>{h.patients?.name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}