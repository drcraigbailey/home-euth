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

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("surname");

    setClients(data || []);
  }

  async function addClient() {
    if (!firstName || !surname) return;

    await supabase.from("clients").insert([
      {
        name: firstName,
        surname: surname,
        phone,
        email,
        address
      }
    ]);

    setFirstName("");
    setSurname("");
    setPhone("");
    setEmail("");
    setAddress("");

    fetchClients();
  }

  const filtered = clients.filter(c =>
    `${c.name} ${c.surname}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1>Clients</h1>

      {/* 1. ADD CLIENT SECTION */}
      <div className="card">
        <h3>Add New Client</h3>
        <input
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          placeholder="Surname"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button style={{ marginTop: "10px" }} onClick={addClient}>Add Client</button>
      </div>

      {/* 2. SEARCH SECTION */}
      <div className="card" style={{ marginTop: "20px" }}>
        <input
          placeholder="Search client by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 3. CLIENT LIST (THE GREY CONTAINER) */}
      <div style={{ 
        marginTop: "20px", 
        background: "#f8f9fb", 
        padding: "20px", 
        borderRadius: "20px", 
        border: "1px solid #eee" 
      }}>
        <h3 style={{ marginBottom: "20px" }}>Active Clients</h3>

        {filtered.map(c => (
          /* INDIVIDUAL WHITE SHADOW BOX CARDS */
          <div
            key={c.id}
            style={{ 
              background: "white",
              padding: "20px",
              borderRadius: "15px",
              marginBottom: "15px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              border: "1px solid #eee",
              cursor: "pointer"
            }}
            onClick={() => navigate(`/client/${c.id}`)}
          >
            <strong style={{ fontSize: '18px' }}>{c.name} {c.surname}</strong><br />
            <span style={{ color: '#7f8c8d' }}>{c.phone}</span>
          </div>
        ))}

        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No clients found.
          </p>
        )}
      </div>
    </div>
  );
}