import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import SignatureCanvas from "react-signature-canvas";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [consentHistory, setConsentHistory] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [consentName, setConsentName] = useState("");
  const sigPadRef = useRef(null);

  // 🔥 FIXED: runs when patient changes
  useEffect(() => {
    fetchPatient();
    fetchConsentHistory();

    // 🔥 SCROLL TO TOP
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });

  }, [id]);

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
  }

  async function fetchConsentHistory() {
    const { data } = await supabase
      .from("consent_records")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false });

    setConsentHistory(data || []);
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

    setEditMode(false);
    fetchPatient();
  }

  function clearSignature() {
    sigPadRef.current.clear();
  }

  async function insertConsent() {
    const signature = sigPadRef.current.toDataURL();

    const { error } = await supabase
      .from("consent_records")
      .insert([
        {
          patient_id: id,
          name: consentName,
          signature: signature
        }
      ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveConsent() {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty())
      return alert("Please sign");

    const ok = await insertConsent();
    if (!ok) return;

    sigPadRef.current.clear();
    setConsentName("");
    fetchConsentHistory();
  }

  async function saveAndReturn() {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty())
      return alert("Please sign");

    const ok = await insertConsent();
    if (!ok) return;

    navigate(`/sedation/${id}`);
  }

  async function deleteConsent(consentId) {
    if (!window.confirm("Delete this consent?")) return;

    await supabase
      .from("consent_records")
      .delete()
      .eq("id", consentId);

    fetchConsentHistory();
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

          <div style={{ marginTop: "10px" }}>
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

          <button
            style={{ marginTop: "15px" }}
            onClick={() => setEditMode(true)}
          >
            Edit
          </button>
        </div>
      )}

      {/* EDIT MODE */}
      {editMode && (
        <div className="card">
          <h3>Edit Patient</h3>

          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <input value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} />
          <input value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />

          <textarea
            rows={5}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes..."
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
        <h3>Consent</h3>

        <div style={{
          fontSize: "14px",
          marginBottom: "10px",
          background: "#f8f9fb",
          padding: "10px",
          borderRadius: "10px"
        }}>
          <p>• I certify that I am the owner or authorized agent of the above-described animal and have the authority to consent to its euthanasia.</p>
          <p>• I understand that euthanasia involves the termination of the animal’s life to prevent further pain or suffering.</p>
          <p>• I have discussed the option of euthanasia with a veterinary surgeon, including alternatives such as monitoring or treatment.</p>
          <p>• I understand the procedure and potential risks involved.</p>
        </div>

        <input
          placeholder="Full name"
          value={consentName}
          onChange={(e) => setConsentName(e.target.value)}
        />

        <div style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          marginTop: "10px"
        }}>
          <SignatureCanvas
            penColor="black"
            canvasProps={{ width: 300, height: 150 }}
            ref={sigPadRef}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={clearSignature}>Clear</button>
          <button onClick={saveConsent}>Save</button>
          <button
            onClick={saveAndReturn}
            style={{ background: "#27ae60", color: "white" }}
          >
            Save & Sedate
          </button>
        </div>
      </div>

      {/* ===================== */}
      {/* CONSENT HISTORY */}
      {/* ===================== */}
      <div className="card">
        <h3>Consent History</h3>

        {consentHistory.map(c => (
          <div key={c.id} style={{
            marginBottom: "15px",
            padding: "10px",
            background: "#f8f9fb",
            borderRadius: "10px"
          }}>
            <strong>{c.name}</strong>

            <div style={{ fontSize: "12px", color: "#666" }}>
              {new Date(c.created_at).toLocaleString()}
            </div>

            <img
              src={c.signature}
              alt="signature"
              style={{ marginTop: "10px", border: "1px solid #ccc" }}
            />

            <button
              style={{ marginTop: "10px", background: "#e74c3c" }}
              onClick={() => deleteConsent(c.id)}
            >
              Delete
            </button>
          </div>
        ))}

        {consentHistory.length === 0 && <p>No consent history</p>}
      </div>
    </div>
  );
}