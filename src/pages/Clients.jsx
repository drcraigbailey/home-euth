import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  // 🔥 SPLIT NAME PROPERLY
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

      {/* ADD CLIENT */}
      <div className="card">
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

        <button onClick={addClient}>Add Client</button>
      </div>

      {/* SEARCH */}
      <div className="card">
        <input
          placeholder="Search client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* CLIENT LIST */}
      <div className="card">
        {filtered.map(c => (
          <div
            key={c.id}
            className="output-row"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/client/${c.id}`)}
          >
            <strong>{c.name} {c.surname}</strong><br />
            {c.phone}
          </div>
        ))}
      </div>
    </div>
  );
}