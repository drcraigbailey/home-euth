import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function Sedation() {
  const { patientId: routePatientId } = useParams();
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

  // stock form
  const [drugName, setDrugName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("");
  const [conc, setConc] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: patientsData } = await supabase.from("patients").select("*");
    setPatients(patientsData || []);

    const { data: protocolsData } = await supabase.from("protocols").select("*");
    setProtocols(protocolsData || []);

    const { data: stockData } = await supabase
      .from("stock")
      .select("*")
      .eq("archived", false);

    setStock(stockData || []);

    await fetchHistory(patientsData || []);
  }

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

  async function fetchHistory(patientsList = patients) {
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
    fetchHistory();
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
    fetchHistory();
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete record?")) return;
    await supabase.from("sedation_records").delete().eq("id", id);
    fetchHistory();
  }

  // 🔥 STOCK FUNCTIONS
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

    loadData();
  }

  async function archiveStock(id) {
    await supabase.from("stock").update({ archived: true }).eq("id", id);
    loadData();
  }

  async function deleteStock(id) {
    if (!window.confirm("Delete stock?")) return;
    await supabase.from("stock").delete().eq("id", id);
    loadData();
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

      {/* 🔥 STOCK UI RESTORED */}
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
            <div
              key={s.id}
              style={{
                marginBottom: "15px",
                padding: "15px",
                background: "#f8f9fb",
                borderRadius: "12px"
              }}
            >
              <div>
                {s.drug} | {s.batch} | {s.total_ml} ml
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button style={{ flex: 1 }} onClick={() => archiveStock(s.id)}>
                  Archive
                </button>
                <button
                  style={{ flex: 1, background: "#e74c3c" }}
                  onClick={() => deleteStock(s.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY */}
      {tab === "calculator" && (
        <div className="card">
          <h3>History</h3>

          <input
            placeholder="Search history..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />

          {filteredHistory.map(h => (
            <div key={h.id} style={{
              marginTop: "15px",
              padding: "15px",
              background: "#f8f9fb",
              borderRadius: "12px"
            }}>
              <strong>{h.patient_name}</strong>

              {editingId === h.id ? (
                <>
                  {editResults.map((r, i) => (
                    <div key={i}>
                      {r.drug}
                      <input
                        value={r.ml}
                        onChange={(e) => updateEditDose(i, e.target.value)}
                      />
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button style={{ flex: 1 }} onClick={() => saveEdit(h.id)}>Save</button>
                    <button style={{ flex: 1 }} onClick={cancelEdit}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  {h.results?.map((r, i) => (
                    <div key={i}>{r.drug}: {r.ml}</div>
                  ))}

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button style={{ flex: 1 }} onClick={() => startEdit(h)}>Edit</button>
                    <button style={{ flex: 1, background: "#e74c3c" }} onClick={() => deleteRow(h.id)}>
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