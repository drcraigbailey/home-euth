// Clients.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";

// --- STYLING CONSTANTS ---
const whiteShadowBox = {
  background: "white",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "15px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  border: "1px solid #eee",
  cursor: "pointer"
};

const btnRow = { 
  display: "flex", 
  gap: "10px", 
  marginTop: "15px" 
};

// Strict uniform button properties copied from Admin Dashboard layout
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };

const primaryBlueBtn = { background: "#5499c7", color: "white", ...standardBtnProps };
const redBtn         = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn       = { background: "#27ae60", color: "white", ...standardBtnProps };
const yellowBtn      = { background: "#f39c12", color: "white", ...standardBtnProps };
const greyBtn        = { background: "#95a5a6", color: "white", ...standardBtnProps };
const blueBtn        = { background: "#3498db", color: "white", ...standardBtnProps };
const expandBtnStyle = { ...standardBtnProps, background: "#ecf0f1", color: "#2c3e50", width: "100%", marginTop: "10px", padding: "12px" };

const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };

const SPECIES_OPTIONS = ["Dog", "Cat", "Rabbit", "Small Mammal", "Bird", "Reptile", "Equine"];
const GENDER_OPTIONS = ["Male (Entire)", "Male (Neutered)", "Female (Entire)", "Female (Spayed)", "Unknown"];

export default function Clients() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Custom Modal States
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");      
  const [postcode, setPostcode] = useState(""); 

  // Modal State for New Pet
  const [newClient, setNewClient] = useState(null); 
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petColour, setPetColour] = useState("");
  const [petGender, setPetGender] = useState("");
  const [petAgeYears, setPetAgeYears] = useState("");
  const [petAgeMonths, setPetAgeMonths] = useState("");
  const [petMicrochip, setPetMicrochip] = useState("");
  const [showPetMoreInfo, setShowPetMoreInfo] = useState(false);

  // Expand State
  const [expandClients, setExpandClients] = useState(false);

  useEffect(() => { 
    async function loadData() {
      setIsLoading(true);
      await checkAdminStatus();
      await fetchClients(); 
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!data?.is_admin);
    }
  }

  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("*").order("surname");
    if (!error) setClients(data || []);
  }

  async function executeAddClient() {
    const { data, error } = await supabase.from("clients").insert([
      { name: firstName, surname, phone, email, address, city, postcode }
    ]).select().single();

    if (!error) {
      setNewClient({ id: data.id, fullName: `${data.name} ${data.surname}` });
      setFirstName(""); setSurname(""); setPhone(""); setEmail("");
      setAddress(""); setCity(""); setPostcode("");
      fetchClients();
    } else {
      setAlertMessage("Error saving client: " + error.message);
    }
  }

  function addClient() {
    if (!firstName || !surname) return setAlertMessage("First name and Surname are required.");

    const isInfoMissing = !phone || !email || !address || !city || !postcode;
    
    if (isInfoMissing) {
      setConfirmModal({
        title: "Missing Information",
        message: "More info is needed (Phone, Email, etc). Save anyway?",
        confirmText: "Save Anyway",
        confirmColor: "#f39c12",
        onConfirm: () => {
          setConfirmModal(null);
          executeAddClient();
        }
      });
      return;
    }
    
    executeAddClient();
  }

  function handleDeleteClick(c) {
    if (!isAdmin) return setAlertMessage("Access Denied: Only administrators can delete clients.");

    setConfirmModal({
      title: "Confirm Deletion",
      message: `Are you sure you want to permanently delete client ${c.name} ${c.surname}? This action cannot be undone.`,
      confirmText: "Yes, Delete",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        const { error } = await supabase.from("clients").delete().eq("id", c.id);
        if (error) {
          setAlertMessage("Error: " + error.message);
        } else {
          fetchClients();
        }
        setConfirmModal(null);
      }
    });
  }

  async function addPet() {
    if (!petName || !newClient) return setAlertMessage("Please provide a pet name.");
    const patientPayload = {
      name: petName,
      species: petSpecies,
      weight: petWeight ? Number(petWeight) : null,
      breed: petBreed,
      colour: petColour,
      gender: petGender,
      age_years: petAgeYears ? Number(petAgeYears) : null,
      age_months: petAgeMonths ? Number(petAgeMonths) : null,
      microchip: petMicrochip,
      client_id: newClient.id
    };

    const { error } = await supabase.from("patients").insert([
      patientPayload
    ]);
    if (!error) {
      setAlertMessage("Pet added successfully!");
      closePetModal(); 
    } else {
      setAlertMessage(error.message);
    }
  }

  function resetPetForm() {
    setPetName(""); setPetSpecies(""); setPetWeight("");
    setPetBreed(""); setPetColour(""); setPetGender("");
    setPetAgeYears(""); setPetAgeMonths(""); setPetMicrochip("");
    setShowPetMoreInfo(false);
  }

  function closePetModal() {
    resetPetForm();
    setNewClient(null);
  }

  const filtered = (clients || []).filter(c => {
    const fullName = `${c.name || ""} ${c.surname || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const dispClients = (expandClients || search.trim()) ? filtered : filtered.slice(0, 10);

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Clients...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1>Clients</h1>
      
      <div className="card">
        <h3>Add New Client</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            <input placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
          </div>
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            <input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
          </div>
          <button onClick={addClient} style={primaryBlueBtn}>Add Client</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <input placeholder="Search name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
      </div>

      <div style={{ marginTop: "20px", background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
        <h3 style={{ marginBottom: "20px" }}>Active Clients</h3>
        
        {dispClients.map(c => (
          <div 
            key={c.id} 
            style={whiteShadowBox} 
            onClick={() => navigate(`/client/${c.id}`)}
          >
            <div>
              <strong style={{ fontSize: "18px", display: "block", marginBottom: "5px" }}>
                {c.name} {c.surname}
              </strong>
              <div style={{ color: '#7f8c8d', fontSize: "14px" }}>
                {c.phone || "No phone recorded"}
              </div>
            </div>

            {isAdmin && (
              <div style={btnRow}>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDeleteClick(c);
                  }} 
                  style={redBtn}
                >
                  Delete Client
                </button>
              </div>
            )}
          </div>
        ))}
        
        {filtered.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No clients found.</p>}

        {clients.length > 10 && !search.trim() && (
          <button onClick={() => setExpandClients(!expandClients)} style={expandBtnStyle}>
            {expandClients ? "Show Less" : `Show All (${clients.length})`}
          </button>
        )}
      </div>

      {/* POP-UP MODAL FOR ADDING A PET */}
      {newClient && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={closePetModal}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={closePetModal} style={{ position: "absolute", top: "15px", right: "15px", background: "#5b8fb9", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
            
            <h2 style={{ marginTop: 0, color: "#27ae60", paddingRight: "30px" }}>Client Created!</h2>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "15px" }}>Would you like to register a pet for <strong>{newClient.fullName}</strong> now?</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input placeholder="Pet Name" value={petName} onChange={(e) => setPetName(e.target.value)} style={inputStyle} />
              <input list="pet-species-options" placeholder="Species" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} style={inputStyle} />
              <datalist id="pet-species-options">{SPECIES_OPTIONS.map(s => <option key={s} value={s} />)}</datalist>
              <input placeholder="Weight (kg)" type="number" step="0.1" value={petWeight} onChange={(e) => setPetWeight(e.target.value)} style={inputStyle} />

              <button type="button" onClick={() => setShowPetMoreInfo(!showPetMoreInfo)} style={{ ...primaryBlueBtn, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{showPetMoreInfo ? "Hide additional information" : "Add more information"}</span>
                <span>{showPetMoreInfo ? "^" : "v"}</span>
              </button>

              {showPetMoreInfo && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", border: "1px solid #e1e7ec", borderRadius: "10px", background: "#f8f9fb" }}>
                  <input placeholder="Breed" value={petBreed} onChange={(e) => setPetBreed(e.target.value)} style={inputStyle} />
                  <input placeholder="Colour" value={petColour} onChange={(e) => setPetColour(e.target.value)} style={inputStyle} />
                  <select value={petGender} onChange={(e) => setPetGender(e.target.value)} style={inputStyle}>
                    <option value="">Gender</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input placeholder="Age (years)" type="number" min="0" value={petAgeYears} onChange={(e) => setPetAgeYears(e.target.value)} style={inputStyle} />
                    <input placeholder="Age (months)" type="number" min="0" max="11" value={petAgeMonths} onChange={(e) => setPetAgeMonths(e.target.value)} style={inputStyle} />
                  </div>
                  <input placeholder="Microchip" value={petMicrochip} onChange={(e) => setPetMicrochip(e.target.value)} style={inputStyle} />
                </div>
              )}
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "center" }}>
                <button onClick={addPet} style={greenBtn}>Save Pet</button>
                <button onClick={closePetModal} style={yellowBtn}>Skip for now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= GENERIC ALERT MODAL ================= */}
      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setAlertMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>⚠️ Notice</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {alertMessage}
            </p>
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

      {/* ================= GENERIC CONFIRM MODAL ================= */}
      {confirmModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: confirmModal.confirmColor || "#e74c3c", marginTop: 0 }}>⚠️ {confirmModal.title}</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmModal.onConfirm} style={{ ...standardBtnProps, background: confirmModal.confirmColor || "#e74c3c", color: "white" }}>{confirmModal.confirmText || "Confirm"}</button>
              <button onClick={() => setConfirmModal(null)} style={greyBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}