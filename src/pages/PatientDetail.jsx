import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PatientDetail() {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [consents, setConsents] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [savedMessage, setSavedMessage] = useState("");

  // 🔥 CONSENT
  const [consentName, setConsentName] = useState("");
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    fetchPatient();
  }, []);

  async function fetchPatient() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    setPatient(data);

    if (data) {
      setEditName(data.name || "");
      setEditSpecies(data.species || "");
      setEditWeight(data.weight || "");
      setEditNotes(data.notes || "");
    }

    const { data: consentData } = await supabase
      .from("consent_records")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false });

    setConsents(consentData || []);
  }

  async function updatePatient() {
    await supabase
      .from("patients")
      .update({
        name: editName,
        species: editSpecies,
        weight: Number(editWeight),
        notes: editNotes
      })
      .eq("id", id);

    setSavedMessage("✅ Saved");
    setEditMode(false);
    fetchPatient();

    setTimeout(() => setSavedMessage(""), 2000);
  }

  // 🎨 SIGNATURE PAD
  function startDraw(e) {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setDrawing(true);
  }

  function draw(e) {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearSignature() {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 300, 150);
  }

  // 🔥 SAVE CONSENT
  async function saveConsent(redirect = false) {
    if (!consentName) {
      alert("Enter name");
      return;
    }

    const signature = canvasRef.current.toDataURL();

    const consentText = [
      "I certify that I am the owner or authorized agent of the above-described animal and have the authority to consent to its euthanasia.",
      "I understand that euthanasia involves the termination of the animal’s life to prevent further pain or suffering.",
      "I have discussed the option of euthanasia with a veterinary surgeon, including alternatives such as monitoring or treatment.",
      "I understand the procedure and potential risks involved."
    ].join("\n");

    const { data: lastRecord } = await supabase
      .from("sedation_records")
      .select("id")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    await supabase.from("consent_records").insert([
      {
        patient_id: id,
        sedation_record_id: lastRecord?.id || null,
        name: consentName,
        signature,
        consent_text: consentText
      }
    ]);

    if (lastRecord) {
      await supabase
        .from("sedation_records")
        .update({ consent_signed: true })
        .eq("id", lastRecord.id);
    }

    clearSignature();
    setConsentName("");

    fetchPatient();

    if (redirect) {
      window.location.href = `/sedation/${id}`;
    } else {
      alert("Consent saved");
    }
  }

  // 🔥 DELETE CONSENT
  async function deleteConsent(consentId) {
    if (!window.confirm("Delete this consent record?")) return;

    await supabase
      .from("consent_records")
      .delete()
      .eq("id", consentId);

    fetchPatient();
  }

  return (
    <div className="page">
      <h1>{patient?.name}</h1>

      {/* ===================== */}
      {/* PATIENT DETAILS */}
      {/* ===================== */}
      {!editMode && (
        <div className="card">
          <h3>Patient Details</h3>

          <p><strong>Species:</strong> {patient?.species}</p>
          <p><strong>Weight:</strong> {patient?.weight} kg</p>

          <div style={{ marginTop: "15px" }}>
            <strong>Notes:</strong>
            <div style={{
              marginTop: "5px",
              padding: "10px",
              background: "#f8f9fb",
              borderRadius: "10px"
            }}>
              {patient?.notes || "No notes"}
            </div>
          </div>

          <button onClick={() => setEditMode(true)}>Edit</button>
        </div>
      )}

      {editMode && (
        <div className="card">
          <h3>Edit Patient</h3>

          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <input value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} />
          <input value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />

          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={5}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={updatePatient}>Save</button>
            <button onClick={() => setEditMode(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* CONSENT */}
      {/* ===================== */}
      <div className="card">
        <h3>New Consent</h3>

        <input
          placeholder="Full name"
          value={consentName}
          onChange={(e) => setConsentName(e.target.value)}
        />

        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          style={{ border: "1px solid #ccc", marginTop: "10px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />

        <button onClick={clearSignature}>Clear</button>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={() => saveConsent(false)}>Save Consent</button>
          <button
            onClick={() => saveConsent(true)}
            style={{ background: "#27ae60" }}
          >
            Save & Return
          </button>
        </div>
      </div>

      {/* ===================== */}
      {/* CONSENT HISTORY */}
      {/* ===================== */}
      <div className="card">
        <h3>Consent History</h3>

        {consents.length === 0 && <div>No consents yet</div>}

        {consents.map(c => (
          <div key={c.id} style={{
            borderBottom: "1px solid #eee",
            padding: "10px 0"
          }}>
            <strong>{c.name}</strong>

            <div style={{ fontSize: "12px", color: "#666" }}>
              {new Date(c.created_at).toLocaleString()}
            </div>

            <img
              src={c.signature}
              alt="signature"
              style={{
                marginTop: "10px",
                border: "1px solid #ccc",
                width: "200px"
              }}
            />

            <button
              onClick={() => deleteConsent(c.id)}
              style={{
                marginTop: "8px",
                background: "#e74c3c",
                color: "white"
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}