import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

// --- STYLING CONSTANTS ---
const greyBox = { background: "#f8f9fb", padding: "25px", borderRadius: "20px", marginTop: "20px" };
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const btnRow = { display: "flex", gap: "10px", marginTop: "20px" };
const greenBtn = { flex: 1, background: "#27ae60", color: "white", border: "none", borderRadius: "12px", padding: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "12px", padding: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" };

function isValidWeight(value) {
  if (!value) return false;
  return /^\d+(\.\d+)?$/.test(value);
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [patients, setPatients] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

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
  }, [id]);

  async function fetchClient() {
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    if (data) {
      setClient(data);
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
    const { data } = await supabase.from("patients").select("*").eq("client_id", id);
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
    const { error } = await supabase.from("clients").update({ 
      name: editName, surname: editSurname, phone: editPhone, email: editEmail, 
      address: editAddress, city: editCity, postcode: editPostcode 
    }).eq("id", id);
    if (!error) { setIsEditing(false); fetchClient(); }
  }

  const googleMapsUrl = client?.address 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.address}, ${client.city} ${client.postcode}`)}`
    : null;

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>{client ? `${client.name} ${client.surname}` : "Loading..."}</h1>

      {/* --- CLIENT INFO CARD --- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>Client Information</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} style={{ padding: "8px 20px", width: "auto" }}>Edit Details</button>
          ) : (
            <button onClick={() => { setIsEditing(false); fetchClient(); }} style={{ background: "#f39c12", color: "white", padding: "8px 20px", width: "auto", border: "none", borderRadius: "8px" }}>Cancel</button>
          )}
        </div>

        {!isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p><strong>Name:</strong> {client?.name} {client?.surname}</p>
            <p><strong>Phone:</strong> {client?.phone ? <a href={`tel:${client.phone}`} style={{ color: "#3498db", textDecoration: "none" }}>{client.phone}</a> : "None"}</p>
            <p><strong>Email:</strong> {client?.email ? <a href={`mailto:${client.email}`} style={{ color: "#3498db", textDecoration: "none" }}>{client.email}</a> : "None"}</p>
            
            <p style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <strong>Address:</strong> {client?.address || "None"}
              {googleMapsUrl && (
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", cursor: "pointer" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#5b8fb9"/>
                  </svg>
                </a>
              )}
            </p>
            <p><strong>City:</strong> {client?.city || "None"}</p>
            <p><strong>Postcode:</strong> {client?.postcode || "None"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div><label style={{ fontSize: "12px" }}>First Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><label style={{ fontSize: "12px" }}>Surname</label><input value={editSurname} onChange={(e) => setEditSurname(e.target.value)} /></div>
            </div>
            <label style={{ fontSize: "12px" }}>Phone</label><input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <label style={{ fontSize: "12px" }}>Email</label><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <label style={{ fontSize: "12px" }}>Address</label><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div><label style={{ fontSize: "12px" }}>City</label><input value={editCity} onChange={(e) => setEditCity(e.target.value)} /></div>
              <div><label style={{ fontSize: "12px" }}>Postcode</label><input value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} /></div>
            </div>
            <button onClick={updateClient} style={{ background: "#27ae60", color: "white", padding: "12px", border: "none", borderRadius: "8px", fontWeight: "600" }}>Save Changes</button>
          </div>
        )}
      </div>

      {/* --- ADD PATIENT FORM --- */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>Add Patient</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} />
        <input type="number" step="0.1" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <button onClick={addPatient} style={{ marginTop: "10px" }}>Add Patient</button>
      </div>

      {/* --- PATIENT LIST --- */}
      <div style={greyBox}>
        <h3 style={{ marginBottom: "20px" }}>Patient List</h3>
        {patients.map((p) => (
          <div key={p.id} style={whiteShadowBox}>
            <div onClick={() => navigate(`/patient/${p.id}`)} style={{ cursor: "pointer" }}>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>{p.name} </span>
              <span style={{ fontSize: "18px", color: "#7f8c8d" }}>({client?.surname || ""})</span>
              <div style={{ color: "#7f8c8d", marginTop: "8px", fontSize: "16px" }}>
                {p.species} – {p.weight} kg
              </div>
            </div>
            <div style={btnRow}>
              <button 
                style={greenBtn} 
                onClick={(e) => { e.stopPropagation(); navigate(`/patient/${p.id}`, { state: { activeTab: "dosing" } }); }}
              >
                Sedate
              </button>
              <button 
                style={redBtn} 
                onClick={(e) => { e.stopPropagation(); deletePatient(p.id); }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {patients.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No patients found.</p>}
      </div>
    </div>
  );
}