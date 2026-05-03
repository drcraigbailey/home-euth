import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function Sedation() {
  // ✅ FIXED PARAM (THIS WAS WRONG BEFORE)
  const { id } = useParams();

  const navigate = useNavigate();

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

  // ✅ SINGLE CONTROLLED LOAD
  useEffect(() => {
    init();
  }, [id]);

  async function init() {
    console.log("Sedation init running with ID:", id);

    const { data: patientsData } = await supabase.from("patients").select("*");
    const { data: protocolsData } = await supabase.from("protocols").select("*");
    const { data: stockData } = await supabase
      .from("stock")
      .select("*")
      .eq("archived", false);

    const pData = patientsData || [];

    setPatients(pData);
    setProtocols(protocolsData || []);
    setStock(stockData || []);

    // ✅ APPLY ROUTE PATIENT CLEANLY
    if (id) {
      const selected = pData.find(p => String(p.id) === String(id));

      if (selected) {
        setPatientId(selected.id);
        setWeight(selected.weight || "");
        setPatientSearch(selected.name);
        setTab("calculator");
      } else {
        console.warn("Patient not found for ID:", id);
      }
    }

    await fetchHistory(pData);
  }

  async function fetchHistory(patientsList) {
    const { data } = await supabase
      .from("sedation_records")
      .select("*")
      .order("created_at", { ascending: false });

    const map = {};
    patientsList.forEach(p => {
      map[p.id] = p.name;
    });

    const enriched = (data || []).map(h => ({
      ...h,
      patient_name: map[h.patient_id] || "Unknown"
    }));

    setHistory(enriched);
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
        drug: d.drug_name,
        ml: Number(ml.toFixed(2))
      };
    });

    setResults(calc);
  }

  async function save() {
    if (!patientId) return alert("Select patient");

    await supabase.from("sedation_records").insert([
      {
        patient_id: patientId,
        protocol_id: protocolId || null,
        weight: Number(weight),
        results
      }
    ]);

    setResults([]);
    init();
  }

  function saveAndConsent() {
    if (!patientId) return alert("Select patient");
    navigate(`/patient/${patientId}`);
  }

  function startEdit(h) {
    setEditingId(h.id);
    setEditResults(h.results || []);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditResults([]);
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
    init();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record?")) return;
    await supabase.from("sedation_records").delete().eq("id", id);
    init();
  }

  async function addStock() {
    await supabase.from("stock").insert([{
      drug: drugName,
      batch,
      expiry,
      total_ml: Number(qty),
      mg_per_ml: Number(conc),
      archived: false
    }]);

    setDrugName("");
    setBatch("");
    setExpiry("");
    setQty("");
    setConc("");

    init();
  }

  async function archiveStock(id) {
    await supabase.from("stock").update({ archived: true }).eq("id", id);
    init();
  }

  async function deleteStock(id) {
    if (!window.confirm("Delete stock?")) return;
    await supabase.from("stock").delete().eq("id", id);
    init();
  }

  const filteredStock = stock.filter(s =>
    (s.batch || "").toLowerCase().includes(stockSearch.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    (h.patient_name || "").toLowerCase().includes(historySearch.toLowerCase())
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

          <input
            placeholder="Search patient..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setShowPatientResults(true);
            }}
          />

          {showPatientResults && (
            <div>
              {patients
                .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                .slice(0, 5)
                .map(p => (
                  <div key={p.id}
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

          <button onClick={calculate}>Calculate</button>

          {results.map((r, i) => (
            <div key={i}>{r.drug}: {r.ml} ml</div>
          ))}

          {results.length > 0 && (
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button style={{ flex: 1 }} onClick={save}>Save</button>
              <button style={{ flex: 1, background: "#27ae60" }} onClick={saveAndConsent}>
                Consent
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "stock" && (
        <div className="card">
          <h3>Stock</h3>
          {filteredStock.map(s => (
            <div key={s.id}>
              {s.drug} | {s.batch} | {s.total_ml} ml
            </div>
          ))}
        </div>
      )}

      {tab === "calculator" && (
        <div className="card">
          <h3>History</h3>

          {filteredHistory.map(h => (
            <div key={h.id}>
              <strong>{h.patient_name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}