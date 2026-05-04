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
  
  // Toggle for Edit Mode
  const [isEditing, setIsEditing] = useState(false);

  // Patient Form State
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

  // Client Edit State (matches database columns)[cite: 7]
  const [editName, setEditName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");      
  const [editPostcode, setEditPostcode] = useState(""); 

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

    if (data) {
      setClient(data);
      // Sync edit state with fetched data[cite: 7]
      setEditName(data.name || "");
      setEditSurname(data.surname || "");
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditAddress(data.address || "");
      setEditCity(data.city || "");
      setEditPostcode(data.postcode || "");
    }
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("client_id", id);
    setPatients(data || []);
  }

  async function addPatient() {
    if (!name) return;
    if (!isValidWeight(weight)) {
      alert("⚠️ Weight must be a number");
      return;
    }

    const { error } = await supabase.from("patients").insert([
      { name, species, weight: Number(weight), client_id: id }
    ]);

    if (!error) {
      setName(""); setSpecies(""); setWeight("");
      fetchPatients();
    }
  }

  async function deletePatient(patientId) {
    if (!window.confirm("Delete this patient?")) return;
    await supabase.from("patients").delete().eq("id", patientId);
    fetchPatients();
  }

  async function updateClient() {
    const { error } = await supabase
      .from("clients")
      .update({ 
        name: editName, 
        surname: editSurname,
        phone: editPhone, 
        email: editEmail, 
        address: editAddress,
        city: editCity,      
        postcode: editPostcode 
      })
      .eq("id", id);

    if (!error) {
      setIsEditing(false); // Switch back to view mode[cite: 7]
      fetchClient();
    } else {
      alert("Error updating: " + error.message);
    }
  }

  return (
    <div className="page">
      <h1 style={{ textAlign: "center" }}>
        {client ? `${client.name} ${client.surname}` : "Loading..."}
      </h1>

      {/* --- CLIENT INFO CARD --- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>Client Information</h3>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ padding: "8px 20px", width: "auto" }}
            >
              Edit Details
            </button>
          ) : (
            <button 
              onClick={() => { setIsEditing(false); fetchClient(); }} 
              style={{ 
                background: "#f39c12", // Standard Yellow
                color: "white", 
                padding: "8px 20px", 
                width: "auto",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {!isEditing ? (
          /* VIEW MODE */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p><strong>Name:</strong> {client?.name} {client?.surname}</p>
            
            {/* Clickable Phone Number */}
            <p>
              <strong>Phone:</strong> {client?.phone ? (
                <a href={`tel:${client.phone}`} style={{ color: "#3498db", textDecoration: "none" }}>
                  {client.phone}
                </a>
              ) : "None"}
            </p>

            {/* Clickable Email Address */}
            <p>
              <strong>Email:</strong> {client?.email ? (
                <a href={`mailto:${client.email}`} style={{ color: "#3498db", textDecoration: "none" }}>
                  {client.email}
                </a>
              ) : "None"}
            </p>

            <p><strong>Address:</strong> {client?.address || "None"}</p>
            <p><strong>City:</strong> {client?.city || "None"}</p>
            <p><strong>Postcode:</strong> {client?.postcode || "None"}</p>
          </div>
        ) : (
          /* EDIT MODE */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                    <label style={{ fontSize: "12px", color: "#666" }}>First Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: "12px", color: "#666" }}>Surname</label>
                    <input value={editSurname} onChange={(e) => setEditSurname(e.target.value)} />
                </div>
            </div>
            
            <label style={{ fontSize: "12px", color: "#666" }}>Phone</label>
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            
            <label style={{ fontSize: "12px", color: "#666" }}>Email</label>
            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            
            <label style={{ fontSize: "12px", color: "#666" }}>Address (Line 1)</label>
            <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                    <label style={{ fontSize: "12px", color: "#666" }}>City</label>
                    <input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: "12px", color: "#666" }}>Postcode</label>
                    <input value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} />
                </div>
            </div>
            
            <button 
              onClick={updateClient} 
              style={{ 
                background: "#27ae60", // Standard Green
                color: "white", 
                marginTop: "10px",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* --- ADD PATIENT CARD --- */}
      <div className="card" style={{ marginTop: "20px" }}>
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

      {/* --- PATIENTS LIST --- */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>Patients</h3>
        {patients.map((p) => (
          <div key={p.id} className="output-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
            <div onClick={() => navigate(`/patient/${p.id}`)} style={{ cursor: "pointer" }}>
              <strong>{p.name}</strong><br />
              <span style={{ color: "#7f8c8d" }}>{p.species} – {p.weight} kg</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{ background: "#27ae60", color: "white", padding: "8px 12px", borderRadius: "8px", border: "none" }}
                onClick={(e) => { e.stopPropagation(); navigate("/sedation", { state: { incomingPatientId: p.id } }); }}
              >
                Sedate
              </button>
              <button 
                style={{ background: "#e74c3c", color: "white", padding: "8px 12px", borderRadius: "8px", border: "none" }}
                onClick={(e) => { e.stopPropagation(); deletePatient(p.id); }} 
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}