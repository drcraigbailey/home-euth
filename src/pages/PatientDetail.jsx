import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PatientDetail() {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchPatient();
    fetchHistory();
  }, []);

  async function fetchPatient() {
    const { data } = await supabase
      .from("patients")
      .select("*, clients(name)")
      .eq("id", id)
      .single();

    setPatient(data);
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from("sedation_records")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false });

    setHistory(data || []);
  }

  return (
    <div className="page">
      <h1>{patient?.name}</h1>

      <div className="card">
        <strong>{patient?.species}</strong><br />
        Weight: {patient?.weight} kg<br />
        Owner: {patient?.clients?.name}
      </div>

      <div className="card">
        <h3>Sedation History</h3>

        {history.length === 0 && <p>No sedation records</p>}

        {history.map((h) => (
          <div key={h.id} className="output-row">
            <strong>{new Date(h.created_at).toLocaleString()}</strong>

            {h.results?.map((r, i) => (
              <div key={i}>
                {r.drug}: {r.ml} ml
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}