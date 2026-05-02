import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    loadPatient();
  }, [id]);

  async function loadPatient() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    setPatient(data);
    if (data) {
      setName(data.name || "");
      setSpecies(data.species || "");
      setWeight(data.weight || "");
    }
  }

  async function updatePatient() {
    await supabase
      .from("patients")
      .update({ name, species, weight })
      .eq("id", id);

    navigate(-1);
  }

  async function deletePatient() {
    await supabase.from("patients").delete().eq("id", id);
    navigate(-1);
  }

  if (!patient) return <p>Loading...</p>;

  return (
    <div className="page">
      <h2>Edit Patient</h2>

      <div className="card">
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        />
        <input
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <button onClick={updatePatient}>Save</button>
        <button
          onClick={deletePatient}
          style={{ background: "#c0392b", marginTop: "10px" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}