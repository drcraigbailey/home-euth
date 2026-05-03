import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PatientDetail() {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);

  const [editMode, setEditMode] = useState(false);

  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    fetchPatient();
  }, []);

  async function fetchPatient() {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setPatient(data);

    if (data) {
      setEditName(data.name || "");
      setEditSpecies(data.species || "");
      setEditWeight(data.weight || "");
      setEditNotes(data.notes || "");
    }
  }

  async function updatePatient() {
    const { error } = await supabase
      .from("patients")
      .update({
        name: editName,
        species: editSpecies,
        weight: Number(editWeight),
        notes: editNotes
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setSavedMessage("✅ Saved");
    setEditMode(false);

    fetchPatient();

    // auto clear message
    setTimeout(() => setSavedMessage(""), 2000);
  }

  return (
    <div className="page">
      <h1>{patient?.name || "Patient"}</h1>

      {/* 🔥 DISPLAY MODE */}
      {!editMode && (
        <div className="card">
          <h3>Patient Details</h3>

          <p><strong>Species:</strong> {patient?.species}</p>
          <p><strong>Weight:</strong> {patient?.weight} kg</p>

          {/* 🔥 NOTES DISPLAY */}
          <div style={{ marginTop: "15px" }}>
            <strong>Notes:</strong>
            <div
              style={{
                marginTop: "5px",
                padding: "10px",
                background: "#f8f9fb",
                borderRadius: "10px",
                minHeight: "60px"
              }}
            >
              {patient?.notes || "No notes yet"}
            </div>
          </div>

          <button
            style={{ marginTop: "15px" }}
            onClick={() => setEditMode(true)}
          >
            Edit
          </button>

          {savedMessage && (
            <div style={{ marginTop: "10px", color: "green" }}>
              {savedMessage}
            </div>
          )}
        </div>
      )}

      {/* 🔥 EDIT MODE */}
      {editMode && (
        <div className="card">
          <h3>Edit Patient</h3>

          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Name"
          />

          <input
            value={editSpecies}
            onChange={(e) => setEditSpecies(e.target.value)}
            placeholder="Species"
          />

          <input
            type="number"
            step="0.1"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            placeholder="Weight"
          />

          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Patient notes..."
            rows={5}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #ddd"
            }}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={updatePatient}>Save</button>
            <button
              onClick={() => setEditMode(false)}
              style={{ background: "#aaa" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}