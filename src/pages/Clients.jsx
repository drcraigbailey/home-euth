// Clients.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

// Styling constants
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

const redBtn = { 
  flex: 1, 
  background: "#e74c3c", 
  color: "white", 
  border: "none", 
  borderRadius: "12px", 
  padding: "10px", 
  cursor: "pointer",
  fontWeight: "600"
};

export default function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Modal State for Delete Confirmation
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => { 
    checkAdminStatus();
    fetchClients(); 
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

  async function addClient() {
    if (!firstName || !surname) return;

    const isInfoMissing = !phone || !email || !address || !city || !postcode;
    if (isInfoMissing) {
      const proceed = window.confirm("More info is needed (Phone, Email, etc). Save anyway?");
      if (!proceed) return;
    }

    const { data, error } = await supabase.from("clients").insert([
      { name: firstName, surname, phone, email, address, city, postcode }
    ]).select().single();

    if (!error) {
      setNewClient({ id: data.id, fullName: `${data.name} ${data.surname}` });
      setFirstName(""); setSurname(""); setPhone(""); setEmail("");
      setAddress(""); setCity(""); setPostcode("");
      fetchClients();
    }
  }

  async function confirmDeleteClient() {
    if (!isAdmin) return alert("Access Denied: Only administrators can delete clients.");
    if (!clientToDelete) return;

    const { error } = await supabase.from("clients").delete().eq("id", clientToDelete.id);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setClientToDelete(null);
      fetchClients();
    }
  }

  async function addPet() {
    if (!petName || !newClient) return;
    const { error } = await supabase.from("patients").insert([
      { name: petName, species: petSpecies, weight: Number(petWeight), client_id: newClient.id }
    ]);
    if (!error) {
      alert("Complete!");
      setPetName(""); setPetSpecies(""); setPetWeight("");
      setNewClient(null); 
    }
  }

  const filtered = (clients || []).filter(c => {
    const fullName = `${c.name || ""} ${c.surname || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1>Clients</h1>
      
      <div className="card">
        <h3>Add New Client</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} />
          </div>
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </div>
          <button onClick={addClient} style={{ background: "#5499c7", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" }}>Add Client</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <input placeholder="Search name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ marginTop: "20px", background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
        <h3 style={{ marginBottom: "20px" }}>Active Clients</h3>
        {filtered.map(c => (
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
                    setClientToDelete(c);
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
      </div>

      {/* POP-UP MODAL FOR ADDING A PET */}
      {newClient && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setNewClient(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setNewClient(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "#eee", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold" }}>X</button>
            
            <h2 style={{ marginTop: 0, color: "#27ae60", paddingRight: "30px" }}>Client Created!</h2>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "15px" }}>Would you like to register a pet for <strong>{newClient.fullName}</strong> now?</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input placeholder="Pet Name" value={petName} onChange={(e) => setPetName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" }} />
              <input placeholder="Species" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" }} />
              <input placeholder="Weight (kg)" type="number" step="0.1" value={petWeight} onChange={(e) => setPetWeight(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" }} />
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={addPet} style={{ flex: 1, background: "#27ae60", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Save Pet</button>
                <button onClick={() => setNewClient(null)} style={{ flex: 1, background: "#f39c12", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Skip for now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL FOR CONFIRMING CLIENT DELETION */}
      {clientToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setClientToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete client <strong>{clientToDelete.name} {clientToDelete.surname}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteClient} style={{ flex: 1, background: "#e74c3c", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Yes, Delete</button>
              <button onClick={() => setClientToDelete(null)} style={{ flex: 1, background: "#95a5a6", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}