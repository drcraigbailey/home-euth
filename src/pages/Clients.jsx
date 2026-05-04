import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

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

  const [newClient, setNewClient] = useState(null); 
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petWeight, setPetWeight] = useState("");

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    if (newClient && petFormRef.current) {
      petFormRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [newClient]);

  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("*").order("surname");
    if (!error) setClients(data || []);
  }

  // 🔥 ADD CLIENT WITH "SAVE ANYWAY" ALERT
  async function addClient() {
    if (!firstName || !surname) return;

    const isInfoMissing = !phone || !email || !address || !city || !postcode;
    if (isInfoMissing) {
      const proceed = window.confirm("More info is needed (Phone, Email, etc). Save anyway or click cancel to go back?");
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

  // 🔥 UPDATED DELETE WITH ERROR ALERT[cite: 4]
  async function deleteClient(clientId) {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (error) {
      alert("Error: " + error.message);
    } else {
      fetchClients();
    }
  }

  // 🔥 ADD PET WITH "COMPLETE" ALERT
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
          <button onClick={addClient} style={{ background: "#5499c7", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "600" }}>Add Client</button>
        </div>
      </div>

      {newClient && (
        <div ref={petFormRef} className="card" style={{ marginTop: "20px", border: "2px solid #27ae60", background: "#fafffb" }}>
          <h3 style={{ color: "#27ae60" }}>Add Pet for {newClient.fullName}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="Pet Name" value={petName} onChange={(e) => setPetName(e.target.value)} />
            <input placeholder="Species" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} />
            <input placeholder="Weight" value={petWeight} onChange={(e) => setPetWeight(e.target.value)} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={addPet} style={{ flex: 1, background: "#27ae60", color: "white", padding: "12px", borderRadius: "8px", border: "none" }}>Save Pet</button>
              <button onClick={() => { alert("Complete!"); setNewClient(null); }} style={{ flex: 1, background: "#f39c12", color: "white", padding: "12px", borderRadius: "8px", border: "none" }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "20px" }}>
        <input placeholder="Search name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ marginTop: "20px", background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
        <h3>Active Clients</h3>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => navigate(`/client/${c.id}`)}>
            <div>
              <strong>{c.name} {c.surname}</strong><br />
              <span style={{ color: '#7f8c8d' }}>{c.phone}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} style={{ background: "#e74c3c", color: "white", padding: "8px 15px", borderRadius: "8px", border: "none" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}