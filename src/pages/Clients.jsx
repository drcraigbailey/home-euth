import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

// 🔥 WEIGHT VALIDATION
function isValidWeight(value) {
  if (!value) return false;
  return /^\d+(\.\d+)?$/.test(value);
}

export default function Clients() {
  const navigate = useNavigate();
  const petFormRef = useRef(null); 

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");      
  const [postcode, setPostcode] = useState(""); 

  // Success Tracking State
  const [newClient, setNewClient] = useState(null); 

  // Pet Form State
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petWeight, setPetWeight] = useState("");

  useEffect(() => { 
    fetchClients(); 
  }, []);

  // Auto-scroll to Pet Form when a client is added
  useEffect(() => {
    if (newClient && petFormRef.current) {
      petFormRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [newClient]);

  async function fetchClients() {
    const { data } = await supabase.from("clients").select("*").order("surname");
    setClients(data || []);
  }

  function clearFields() {
    setFirstName(""); setSurname(""); setPhone("");
    setEmail(""); setAddress(""); setCity(""); setPostcode("");
  }

  async function addClient() {
    if (!firstName || !surname) return;

    const { data, error } = await supabase.from("clients").insert([
      { name: firstName, surname, phone, email, address, city, postcode }
    ]).select().single();

    if (!error) {
      setNewClient({ id: data.id, fullName: `${data.name} ${data.surname}` });
      clearFields();
      fetchClients();
    } else {
      alert("Error adding client: " + error.message);
    }
  }

  async function deleteClient(clientId) {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (!error) fetchClients();
  }

  async function addPet() {
    if (!petName || !newClient) return;
    if (!isValidWeight(petWeight)) {
      alert("⚠️ Weight must be a number");
      return;
    }

    const { error } = await supabase.from("patients").insert([
      { name: petName, species: petSpecies, weight: Number(petWeight), client_id: newClient.id }
    ]);

    if (!error) {
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

      {/* 1. ADD CLIENT SECTION */}
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
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={addClient} style={{ flex: 2, background: "#5499c7", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Add Client</button>
            <button onClick={clearFields} style={{ flex: 1, background: "#f39c12", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Clear</button>
          </div>
        </div>
      </div>

      {/* 2. PET ADDITION SECTION */}
      {newClient && (
        <div ref={petFormRef} className="card" style={{ marginTop: "20px", border: "2px solid #27ae60", background: "#fafffb" }}>
          <h3 style={{ color: "#27ae60" }}>Add Pet for {newClient.fullName}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="Pet Name" value={petName} onChange={(e) => setPetName(e.target.value)} />
            <input placeholder="Species" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} />
            <input placeholder="Weight (kg)" value={petWeight} onChange={(e) => setPetWeight(e.target.value)} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={addPet} style={{ flex: 1, background: "#27ae60", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Save Pet</button>
              <button onClick={() => setNewClient(null)} style={{ flex: 1, background: "#f39c12", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEARCH SECTION */}
      <div className="card" style={{ marginTop: "20px" }}>
        <input placeholder="Search client by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* 4. CLIENT LIST */}
      <div style={{ marginTop: "20px", background: "#f8f9fb", padding: "20px", borderRadius: "20px", border: "1px solid #eee" }}>
        <h3>Active Clients</h3>
        {filtered.map(c => (
          <div
            key={c.id}
            className="card"
            style={{ marginBottom: "15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => navigate(`/client/${c.id}`)}
          >
            <div>
              <strong style={{ fontSize: '18px' }}>{c.name} {c.surname}</strong><br />
              <span style={{ color: '#7f8c8d' }}>{c.phone}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }}
              style={{ background: "#e74c3c", color: "white", padding: "8px 15px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}