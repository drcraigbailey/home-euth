import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

  const [historySearch, setHistorySearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editResults, setEditResults] = useState([]);

  const [drugName, setDrugName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("");
  const [conc, setConc] = useState("");

  useEffect(() => {
    fetchPatients();
    fetchProtocols();
    fetchHistory();
    fetchStock();
  }, []);

  useEffect(() => {
    if (!routePatientId) return;

    const loadPatient = async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("id", routePatientId)
        .single();

      if (!data) return;

      setPatientId(data.id);
      setWeight(data.weight || "");
      setPatientSearch(data.name);
    };

    loadPatient();
  }, [routePatientId]);

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
      .select(`*, patients(name, species, weight)`)
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

  async function calculate() {
    if (!protocolId || !weight) {
      alert("Select protocol + weight");
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
        drug: d.drug_name,
        ml: Number(ml.toFixed(2))
      };
    });

    setResults(calc);
  }

  async function save() {
    await supabase.rpc("use_stock_and_save", {
      p_patient_id: patientId,
      p_protocol_id: protocolId,
      p_weight: Number(weight),
      p_results: results
    });

    setResults([]);
    fetchHistory();
  }

  function startEdit(h) {
    setEditingId(h.id);
    setEditResults(h.results || []);
  }

  function updateEditDose(i, val) {
    const updated = [...editResults];
    updated[i].ml = parseFloat(val) || 0;
    setEditResults(updated);
  }

  async function saveEdit(id) {
    await supabase
      .from("sedation_records")
      .update({ results: editResults })
      .eq("id", id);

    setEditingId(null);
    fetchHistory();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record?")) return;
    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory();
  }

  async function addStock() {
    await supabase.from("stock").insert([{
      drug: drugName,
      batch,
      expiry,
      total_ml: Number(qty),
      mg_per_ml: Number(conc)
    }]);

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
    if (!window.confirm("Delete stock?")) return;
    await supabase.from("stock").delete().eq("id", id);
    fetchStock();
  }

  const filteredStock = stock.filter(s =>
    (s.batch || "").toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <div className="page">
      <h1>Sedation</h1>

      {/* TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setTab("calculator")}>Calculator</button>
        <button onClick={() => setTab("stock")}>Stock</button>
      </div>

      {/* CALCULATOR */}
      {tab === "calculator" && (
        <div className="card">

          <input
            placeholder="Search patient..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setShowPatientResults(true);
            }}
          />

          {showPatientResults && (
            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
              {patients
                .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                .slice(0, 5)
                .map(p => (
                  <div key={p.id}
                    style={{ padding: "8px", cursor: "pointer" }}
                    onClick={() => {
                      setPatientId(p.id);
                      setWeight(p.weight || "");
                      setPatientSearch(p.name);
                      setShowPatientResults(false);
                    }}>
                    {p.name}
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

          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight"
          />

          <button style={{ marginTop: "10px" }} onClick={calculate}>
            Calculate
          </button>

          <div style={{ marginTop: "15px" }}>
            {results.map((r, i) => (
              <div key={i}>{r.drug}: {r.ml} ml</div>
            ))}
          </div>

          {results.length > 0 && (
            <button style={{ marginTop: "15px" }} onClick={save}>
              Save
            </button>
          )}
        </div>
      )}

      {/* STOCK */}
      {tab === "stock" && (
        <div className="card">

          <h3>Add Stock</h3>

          <div style={{ display: "grid", gap: "8px" }}>
            <input placeholder="Drug" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
            <input placeholder="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <input placeholder="Qty ml" value={qty} onChange={(e) => setQty(e.target.value)} />
            <input placeholder="mg/ml" value={conc} onChange={(e) => setConc(e.target.value)} />
          </div>

          <button style={{ marginTop: "10px" }} onClick={addStock}>Add</button>

          <h3 style={{ marginTop: "20px" }}>Stock</h3>

          <input
            placeholder="Search batch..."
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            style={{ marginBottom: "10px" }}
          />

          {filteredStock.map(s => (
            <div key={s.id} style={{ marginBottom: "15px" }}>
              <div>
                {s.drug} | {s.batch} | {s.total_ml} ml
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
                <button onClick={() => archiveStock(s.id)}>Archive</button>
                <button
                  onClick={() => deleteStock(s.id)}
                  style={{ background: "#e74c3c" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY ONLY ON CALCULATOR */}
      {tab === "calculator" && (
        <div className="card">
          <h3>History</h3>

          {history.map(h => (
            <div key={h.id} style={{ marginBottom: "20px" }}>

              <strong>{h.patients?.name}</strong>

              {editingId === h.id ? (
                <>
                  {editResults.map((r, i) => (
                    <div key={i} style={{ marginTop: "5px" }}>
                      {r.drug}
                      <input
                        value={r.ml}
                        onChange={(e) => updateEditDose(i, e.target.value)}
                        style={{ marginLeft: "8px", width: "80px" }}
                      />
                    </div>
                  ))}

                  <button style={{ marginTop: "10px" }} onClick={() => saveEdit(h.id)}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginTop: "8px" }}>
                    {h.results?.map((r, i) => (
                      <div key={i}>{r.drug}: {r.ml}</div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button onClick={() => startEdit(h)}>Edit</button>
                    <button
                      onClick={() => deleteRow(h.id)}
                      style={{ background: "#e74c3c" }}
                    >
                      Delete
                    </button>
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