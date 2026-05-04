import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

// 🔥 WEIGHT VALIDATION
function isValidWeight(value) {
  if (!value) return false;
  return /^\d+(\.\d+)?$/.test(value);
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [patients, setPatients] = useState([]);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    fetchClient();
    fetchPatients();
  }, []);

  async function fetchClient() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    setClient(data);

    if (data) {
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditAddress(data.address || "");
    }
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("client_id", id);
    setPatients(data || []);
  }

  // Standard Add Patient function[cite: 6]
  async function addPatient() {
    if (!name) return;

    if (!isValidWeight(weight)) {
      alert("⚠️ Weight must be a number in kg (e.g. 10 or 10.5)");
      return;
    }

    const { error } = await supabase.from("patients").insert([
      {
        name,
        species,
        weight: Number(weight),
        client_id: id
      }
    ]);

    if (error) {
      alert("Error adding patient: " + error.message);
      return;
    }

    setName("");
    setSpecies("");
    setWeight("");
    fetchPatients();
  }

  async function deletePatient(patientId) {
    if (!window.confirm("Delete this patient?")) return;
    await supabase.from("patients").delete().eq("id", patientId);
    fetchPatients();
  }

  async function updateClient() {
    await supabase
      .from("clients")
      .update({ name: editName, phone: editPhone, email: editEmail, address: editAddress })
      .eq("id", id);
    fetchClient();
  }

  return (
    <div className="page">
      <h1>{client?.name || "Client"}</h1>

      <div className="card">
        <h3>Edit Client</h3>
        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
        <button onClick={updateClient}>Save Changes</button>
      </div>

      <div className="card">
        <h3>Add Patient</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} />
        <input
          type="number"
          step="0.1"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button onClick={addPatient} style={{ marginTop: "10px" }}>Add Patient</button>
      </div>

      <div className="card">
        <h3>Patients</h3>
        {patients.map((p) => (
          <div key={p.id} className="output-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
            <div onClick={() => navigate(`/patient/${p.id}`)} style={{ cursor: "pointer" }}>
              <strong>{p.name}</strong><br />
              {p.species} – {p.weight} kg
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {/* This button correctly triggers the calculator autofill */}
              <button
                style={{ background: "#27ae60", color: "white", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/sedation", { state: { incomingPatientId: p.id } });
                }}
              >
                Sedate
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); deletePatient(p.id); }} 
                style={{ background: "#e74c3c", color: "white", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {patients.length === 0 && <p>No patients yet</p>}
      </div>
    </div>
  );
}