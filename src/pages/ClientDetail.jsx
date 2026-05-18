// ClientDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "../Loader";

// --- STYLING CONSTANTS ---
const greyBox = { background: "#f8f9fb", padding: "25px", borderRadius: "20px", marginTop: "20px" };
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const btnRow = { display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" };

// Strict uniform button properties copied from Admin Dashboard layout
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };

const blueBtn   = { background: "#5b8fb9", color: "white", ...standardBtnProps };
const redBtn    = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn  = { background: "#27ae60", color: "white", ...standardBtnProps };
const yellowBtn = { background: "#f39c12", color: "white", ...standardBtnProps };
const greyBtn   = { background: "#95a5a6", color: "white", ...standardBtnProps };

const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };

function isValidWeight(value) {
  if (!value) return false;
  return /^\d+(\.\d+)?$/.test(value);
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
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

  // Modal State for Patient Deletion
  const [patientToDelete, setPatientToDelete] = useState(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await checkAdminStatus();
      await fetchClient();
      await fetchPatients();
      setIsLoading(false);
    }
    loadData();
  }, [id]);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!data?.is_admin);
    }
  }

  async function fetchClient() {
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    if (data) {
      setClient(data);
      setEditName(data.name || ""); setEditSurname(data.surname || ""); setEditPhone(data.phone || "");
      setEditEmail(data.email || ""); setEditAddress(data.address || ""); setEditCity(data.city || ""); setEditPostcode(data.postcode || "");
    }
  }

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("*").eq("client_id", id);
    setPatients(data || []);
  }

  async function addPatient() {
    if (!name) return;
    if (!isValidWeight(weight)) return alert("⚠️ Weight must be a number");
    const { error } = await supabase.from("patients").insert([{ name, species, weight: Number(weight), client_id: id }]);
    if (!error) { setName(""); setSpecies(""); setWeight(""); fetchPatients(); }
  }

  async function confirmDeletePatient() {
    if (!isAdmin) return alert("Access Denied: Only administrators can delete patients.");
    if (!patientToDelete) return;

    const { error } = await supabase.from("patients").delete().eq("id", patientToDelete.id);
    if (!error) {
      setPatientToDelete(null);
      fetchPatients();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function updateClient() {
    const { error } = await supabase.from("clients").update({ name: editName, surname: editSurname, phone: editPhone, email: editEmail, address: editAddress, city: editCity, postcode: editPostcode }).eq("id", id);
    if (!error) { setIsEditing(false); fetchClient(); }
  }

  const googleMapsUrl = client?.address ? `https://maps.google.com/?q=$${encodeURIComponent(`${client.address}, ${client.city || ""} ${client.postcode || ""}`)}` : null;

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Client File...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>{client?.name} {client?.surname}</h1>

      {/* --- CLIENT INFO CARD --- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>Client Information</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} style={blueBtn}>Edit Details</button>
          ) : (
            <button onClick={() => { setIsEditing(false); fetchClient(); }} style={yellowBtn}>Cancel</button>
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
              <div><label style={{ fontSize: "12px" }}>First Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px" }}>Surname</label><input value={editSurname} onChange={(e) => setEditSurname(e.target.value)} style={inputStyle} /></div>
            </div>
            <label style={{ fontSize: "12px" }}>Phone</label><input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: "12px" }}>Email</label><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: "12px" }}>Address</label><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div><label style={{ fontSize: "12px" }}>City</label><input value={editCity} onChange={(e) => setEditCity(e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px" }}>Postcode</label><input value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} style={inputStyle} /></div>
            </div>
            <button onClick={updateClient} style={{ ...greenBtn, width: "100%", padding: "12px", fontSize: "14px" }}>Save Changes</button>
          </div>
        )}
      </div>

      {/* --- ADD PATIENT FORM --- */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>Add Patient</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} style={inputStyle} />
        <input type="number" step="0.1" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} />
        <button onClick={addPatient} style={blueBtn}>Add Patient</button>
      </div>

      {/* --- PATIENT LIST --- */}
      <div style={greyBox}>
        <h3 style={{ marginBottom: "20px", marginTop: 0 }}>Patient List</h3>
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
              {isAdmin && (
                <button 
                  style={redBtn} 
                  onClick={(e) => { e.stopPropagation(); setPatientToDelete(p); }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {patients.length === 0 && <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No patients found.</p>}
      </div>

      {/* POP-UP MODAL FOR PATIENT DELETION */}
      {patientToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setPatientToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete patient <strong>{patientToDelete.name}</strong>? This action will clear their files permanently.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmDeletePatient} style={redBtn}>Yes, Delete</button>
              <button onClick={() => setPatientToDelete(null)} style={greyBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}