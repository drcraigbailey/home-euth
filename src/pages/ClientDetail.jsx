import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [patients, setPatients] = useState([]);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    fetchClient();
    fetchPatients();
  }, []);

  async function fetchClient() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    setClient(data);

    if (data) {
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditAddress(data.address || "");
    }
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("client_id", id);

    setPatients(data || []);
  }

  async function addPatient() {
    if (!name) return;

    await supabase.from("patients").insert([
      {
        name,
        species,
        weight,
        client_id: id
      }
    ]);

    setName("");
    setSpecies("");
    setWeight("");

    fetchPatients();
  }

  async function deletePatient(patientId) {
    const confirmDelete = window.confirm("Delete this patient?");
    if (!confirmDelete) return;

    await supabase.from("patients").delete().eq("id", patientId);
    fetchPatients();
  }

  async function updateClient() {
    await supabase
      .from("clients")
      .update({
        name: editName,
        phone: editPhone,
        email: editEmail,
        address: editAddress
      })
      .eq("id", id);

    fetchClient();
  }

  async function deleteClient() {
    const confirmDelete = window.confirm("Delete this client AND all pets?");
    if (!confirmDelete) return;

    await supabase.from("patients").delete().eq("client_id", id);
    await supabase.from("clients").delete().eq("id", id);

    window.location.href = "/";
  }

  return (
    <div className="page">
      <h1>{client?.name || "Client"}</h1>

      <div className="card">
        <h3>Edit Client</h3>

        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
        <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" />

        <button onClick={updateClient}>Save Changes</button>

        <button
          onClick={deleteClient}
          style={{ background: "#e74c3c", marginTop: "10px" }}
        >
          Delete Client
        </button>
      </div>

      <div className="card">
        <h3>Add Patient</h3>

        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} />
        <input placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} />

        <button onClick={addPatient}>Add Patient</button>
      </div>

      <div className="card">
        <h3>Patients</h3>

        {patients.map((p) => (
          <div
            key={p.id}
            className="output-row"
            onClick={() => navigate(`/patient/${p.id}`)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div>
              <strong>{p.name}</strong><br />
              {p.species} – {p.weight} kg
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePatient(p.id);
              }}
              style={{
                width: "auto",
                padding: "8px 12px",
                background: "#e74c3c"
              }}
            >
              Delete
            </button>
          </div>
        ))}

        {patients.length === 0 && <p>No patients yet</p>}
      </div>
    </div>
  );
}