import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");      
  const [postcode, setPostcode] = useState(""); 

  useEffect(() => { fetchClients(); }, []);

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
    const { error } = await supabase.from("clients").insert([
      { name: firstName, surname, phone, email, address, city, postcode }
    ]);
    if (!error) { clearFields(); fetchClients(); }
  }

  const filtered = (clients || []).filter(c => {
    const fullName = `${c.name || ""} ${c.surname || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div className="page">
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
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={addClient} style={{ flex: 2, background: "#5499c7", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Add Client</button>
            <button onClick={clearFields} style={{ flex: 1, background: "#f39c12", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <input placeholder="Search client by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ marginTop: "20px", background: "#f8f9fb", padding: "20px", borderRadius: "20px", border: "1px solid #eee" }}>
        <h3>Active Clients</h3>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: "15px", cursor: "pointer", display: "block" }} onClick={() => navigate(`/client/${c.id}`)}>
            <strong style={{ fontSize: '18px' }}>{c.name} {c.surname}</strong><br />
            <span style={{ color: '#7f8c8d' }}>{c.phone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}