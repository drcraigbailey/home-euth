// ClientDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Loader from "../Loader";
import tombIcon from '../assets/tomb.png'; 

// --- STYLING CONSTANTS ---
const greyBox = { background: "#f8f9fb", padding: "25px", borderRadius: "20px", marginTop: "20px" };
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const btnRow = { display: "flex", gap: "10px", marginTop: "20px", width: "100%" };

// Updated properties to lock text to a single line (whiteSpace: "nowrap")
const standardBtnProps = { 
  borderRadius: "8px", 
  border: "none", 
  cursor: "pointer", 
  fontWeight: "bold", 
  padding: "10px 14px", 
  fontSize: "13px", 
  boxSizing: "border-box", 
  textAlign: "center", 
  whiteSpace: "nowrap", 
  minWidth: "100px" 
};

const blueBtn   = { background: "#5b8fb9", color: "white", ...standardBtnProps };
const redBtn    = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn  = { background: "#27ae60", color: "white", ...standardBtnProps };
const yellowBtn = { background: "#f39c12", color: "white", ...standardBtnProps };
const greyBtn   = { background: "#95a5a6", color: "white", ...standardBtnProps };
const expandBtnStyle = { ...standardBtnProps, background: "#ecf0f1", color: "#2c3e50", width: "100%", marginTop: "10px", padding: "12px" };

const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };

const GENDER_OPTIONS = ["Male (Entire)", "Male (Neutered)", "Female (Entire)", "Female (Spayed)", "Unknown"];

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
  const [alertMessage, setAlertMessage] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

  // Extra Patient Info State
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [breed, setBreed] = useState("");
  const [colour, setColour] = useState("");
  const [gender, setGender] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [microchip, setMicrochip] = useState("");

  const [editName, setEditName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");      
  const [editPostcode, setEditPostcode] = useState(""); 

  // Modal State for Patient Deletion
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Search & Expand States
  const [patientSearch, setPatientSearch] = useState("");
  const [expandPatients, setExpandPatients] = useState(false);

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
    const { data } = await supabase.from("patients").select("*").eq("client_id", id).order("created_at", { ascending: false });
    setPatients(data || []);
  }

  async function addPatient() {
    if (!name.trim() || !species.trim() || !weight) {
      setAlertMessage("Please enter all patient details (Name, Species, and Weight) before adding.");
      return;
    }
    if (!isValidWeight(weight)) {
      setAlertMessage("Weight must be a valid number.");
      return;
    }

    const payload = {
      name: name.trim(),
      species: species.trim(),
      weight: Number(weight),
      client_id: id,
      breed: breed.trim() || null,
      colour: colour.trim() || null,
      gender: gender || null,
      age_years: ageYears ? Number(ageYears) : null,
      age_months: ageMonths ? Number(ageMonths) : null,
      microchip: microchip.trim() || null
    };

    const { error } = await supabase.from("patients").insert([payload]);
    
    if (!error) { 
      setName(""); setSpecies(""); setWeight(""); 
      setBreed(""); setColour(""); setGender("");
      setAgeYears(""); setAgeMonths(""); setMicrochip("");
      setShowMoreInfo(false);
      fetchPatients(); 
    } else {
      setAlertMessage("Error adding patient: " + error.message);
    }
  }

  async function confirmDeletePatient() {
    if (!isAdmin) {
      setAlertMessage("Access Denied: Only administrators can delete patients.");
      return;
    }
    if (!patientToDelete) return;

    // --- CASCADE CLEANUP: Prevent Orphaned Records ---
    await supabase.from("sedation_records").delete().eq("patient_id", patientToDelete.id);
    await supabase.from("patient_procedures").delete().eq("patient_id", patientToDelete.id);
    await supabase.from("consent_records").delete().eq("patient_id", patientToDelete.id);
    await supabase.from("diary_entries").delete().eq("patient_id", patientToDelete.id);

    // Delete Patient File
    const { error } = await supabase.from("patients").delete().eq("id", patientToDelete.id);
    
    if (!error) {
      setPatientToDelete(null);
      fetchPatients();
    } else {
      setAlertMessage("Error: " + error.message);
    }
  }

  async function updateClient() {
    const { error } = await supabase.from("clients").update({ name: editName, surname: editSurname, phone: editPhone, email: editEmail, address: editAddress, city: editCity, postcode: editPostcode }).eq("id", id);
    if (!error) { setIsEditing(false); fetchClient(); }
  }

  const googleMapsUrl = client?.address ? `https://maps.google.com/?q=$${encodeURIComponent(`${client.address}, ${client.city || ""} ${client.postcode || ""}`)}` : null;

  // Search and limit derivation
  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()));
  const dispPatients = (expandPatients || patientSearch.trim()) ? filteredPatients : filteredPatients.slice(0, 10);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h3 style={{ margin: 0 }}>Client Information</h3>
          {!isEditing && (
            <div style={{ display: "flex", flex: 1, minWidth: "140px", justifyContent: "flex-end" }}>
              <button className="compact-edit-details-btn" onClick={() => setIsEditing(true)} style={{ ...blueBtn, width: "120px", minWidth: "120px", padding: "8px 10px", flex: "0 0 120px" }}>Edit Details</button>
            </div>
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
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", width: "100%" }}>
              <button onClick={updateClient} style={{ ...greenBtn, flex: 1 }}>Save Changes</button>
              <button onClick={() => { setIsEditing(false); fetchClient(); }} style={{ ...redBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD PATIENT FORM --- */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>Add Patient</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} style={inputStyle} />
        <input type="number" step="0.1" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} />
        
        {/* Toggle Button */}
        <button type="button" onClick={() => setShowMoreInfo(!showMoreInfo)} style={{ ...blueBtn, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", background: "#f8f9fb", color: "#5b8fb9", border: "1px solid #5b8fb9" }}>
          <span>{showMoreInfo ? "Hide additional information" : "Add more information"}</span>
          <span>{showMoreInfo ? "^" : "v"}</span>
        </button>

        {/* Expanded Info */}
        {showMoreInfo && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", border: "1px solid #e1e7ec", borderRadius: "10px", background: "#f8f9fb", marginBottom: "10px" }}>
            <input placeholder="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            <input placeholder="Colour" value={colour} onChange={(e) => setColour(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option value="">Gender</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input placeholder="Age (years)" type="number" min="0" value={ageYears} onChange={(e) => setAgeYears(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
              <input placeholder="Age (months)" type="number" min="0" max="11" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <input placeholder="Microchip" value={microchip} onChange={(e) => setMicrochip(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
        )}

        <button onClick={addPatient} style={{ ...blueBtn, width: "100%" }}>Add Patient</button>
      </div>

      {/* --- PATIENT LIST --- */}
      <div style={greyBox}>
        <h3 style={{ marginBottom: "15px", marginTop: 0 }}>Patient List</h3>
        
        {patients.length > 0 && (
          <input 
            placeholder="Search this client's patients..." 
            value={patientSearch} 
            onChange={(e) => setPatientSearch(e.target.value)} 
            style={inputStyle} 
          />
        )}

        {dispPatients.map((p) => (
          <div key={p.id} style={whiteShadowBox}>
            <div onClick={() => navigate(`/patient/${p.id}`)} style={{ cursor: "pointer" }}>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
                {p.name}
                {p.is_deceased && <img src={tombIcon} alt="Deceased" style={{ width: "20px", height: "20px", marginLeft: "8px", verticalAlign: "middle" }} />}
              </span>
              <span style={{ fontSize: "18px", color: "#7f8c8d" }}> ({client?.surname || ""})</span>
              <div style={{ color: "#7f8c8d", marginTop: "8px", fontSize: "16px" }}>
                {p.species} – {p.weight} kg
              </div>
            </div>
            <div style={btnRow}>
              {p.is_deceased ? (
                <button 
                  style={{ ...blueBtn, flex: 1 }} 
                  onClick={(e) => { e.stopPropagation(); navigate(`/patient/${p.id}`, { state: { activeTab: "details" } }); }}
                >
                  Details
                </button>
              ) : (
                <button 
                  style={{ ...greenBtn, flex: 1 }} 
                  onClick={(e) => { e.stopPropagation(); navigate(`/patient/${p.id}`, { state: { activeTab: "dosing" } }); }}
                >
                  Sedate
                </button>
              )}
              {isAdmin && (
                <button 
                  style={{ ...redBtn, flex: 1 }} 
                  onClick={(e) => { e.stopPropagation(); setPatientToDelete(p); }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        
        {patients.length === 0 && <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No patients found.</p>}
        {patients.length > 0 && filteredPatients.length === 0 && <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No patients match your search.</p>}

        {patients.length > 10 && !patientSearch.trim() && (
          <button onClick={() => setExpandPatients(!expandPatients)} style={expandBtnStyle}>
            {expandPatients ? "Show Less" : `Show All (${patients.length})`}
          </button>
        )}
      </div>

      {/* POP-UP MODAL FOR PATIENT DELETION */}
      {patientToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setPatientToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete patient <strong>{patientToDelete.name}</strong>? All records, invoices, and drug logs linked to this profile will be cleared.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmDeletePatient} style={{ ...redBtn, flex: 1 }}>Yes, Delete</button>
              <button onClick={() => setPatientToDelete(null)} style={{ ...greyBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setAlertMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>Notice</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {alertMessage}
            </p>
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

    </div>
  );
}