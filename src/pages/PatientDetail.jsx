import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import SignatureCanvas from "react-signature-canvas";

// Common lists for the dropdowns
const SPECIES_OPTIONS = ["Dog", "Cat", "Rabbit", "Small Mammal", "Bird", "Reptile", "Equine"];

const BREED_MAP = {
  dog: [
    "Mixed Breed", "Labrador Retriever", "Golden Retriever", "French Bulldog", 
    "German Shepherd", "Cocker Spaniel", "Staffordshire Bull Terrier", 
    "Jack Russell Terrier", "Shih Tzu", "Chihuahua", "Pug", "Border Collie", 
    "Dachshund", "Poodle", "Greyhound", "Lurcher"
  ],
  cat: [
    "Domestic Shorthair", "Domestic Longhair", "British Shorthair", "Ragdoll", 
    "Siamese", "Bengal", "Maine Coon", "Persian", "Sphynx", "Burmese"
  ],
  rabbit: [
    "Mixed Breed", "Mini Lop", "Netherland Dwarf", "Lionhead", 
    "French Lop", "Dutch", "Flemish Giant", "Rex"
  ],
  "small mammal": [
    "Guinea Pig", "Hamster (Syrian)", "Hamster (Dwarf)", "Rat", 
    "Mouse", "Chinchilla", "Ferret", "Gerbil", "Degu"
  ]
};

const COMMON_COLOURS = [
  "Black", "White", "Brown", "Chocolate", "Tan", "Black & White", "Brown & White",
  "Tabby", "Tortoiseshell", "Calico", "Brindle", "Fawn", "Blue/Grey", "Ginger", 
  "Cream", "Tricolour", "Merle", "Roan", "Agouti"
];

const GENDER_OPTIONS = [
  "Male (Entire)", "Male (Neutered)", "Female (Entire)", "Female (Spayed)", "Unknown"
];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [consentHistory, setConsentHistory] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editColour, setEditColour] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editMicrochip, setEditMicrochip] = useState("");
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editAgeMonths, setEditAgeMonths] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [consentName, setConsentName] = useState("");
  const sigPadRef = useRef(null);

  useEffect(() => {
    fetchPatient();
    fetchConsentHistory();

    window.scrollTo({
      top: 0,
      behavior: "instant"
    });

  }, [id]);

  async function fetchPatient() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    setPatient(data);

    if (data) {
      setEditName(data.name || "");
      setEditSpecies(data.species || "");
      setEditBreed(data.breed || "");
      setEditColour(data.colour || "");
      setEditGender(data.gender || "");
      setEditMicrochip(data.microchip || "");
      setEditAgeYears(data.age_years || "");
      setEditAgeMonths(data.age_months || "");
      setEditWeight(data.weight || "");
      setEditNotes(data.notes || "");
    }
  }

  async function fetchConsentHistory() {
    const { data } = await supabase
      .from("consent_records")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false });

    setConsentHistory(data || []);
  }

  async function updatePatient() {
    const { error } = await supabase
      .from("patients")
      .update({
        name: editName,
        species: editSpecies,
        breed: editBreed,
        colour: editColour,
        gender: editGender,
        microchip: editMicrochip,
        age_years: editAgeYears ? Number(editAgeYears) : null,
        age_months: editAgeMonths ? Number(editAgeMonths) : null,
        weight: Number(editWeight),
        notes: editNotes
      })
      .eq("id", id);

    if (error) {
      alert("Error saving patient details: " + error.message);
      console.error("Supabase update error:", error);
      return; 
    }

    setEditMode(false);
    fetchPatient();
  }

  function clearSignature() {
    sigPadRef.current.clear();
  }

  async function insertConsent() {
    const signature = sigPadRef.current.toDataURL();

    const { error } = await supabase
      .from("consent_records")
      .insert([
        {
          patient_id: id,
          name: consentName,
          signature: signature
        }
      ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveConsent() {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty())
      return alert("Please sign");

    const ok = await insertConsent();
    if (!ok) return;

    sigPadRef.current.clear();
    setConsentName("");
    fetchConsentHistory();
  }

  async function saveAndReturn() {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty())
      return alert("Please sign");

    const ok = await insertConsent();

    if (!ok) return;

    navigate("/sedation", { state: { incomingPatientId: id } });
  }

  async function deleteConsent(consentId) {
    if (!window.confirm("Delete this consent?")) return;

    await supabase
      .from("consent_records")
      .delete()
      .eq("id", consentId);

    fetchConsentHistory();
  }

  // Handle species change: reset the breed if they change the species to avoid mismatches
  function handleSpeciesChange(e) {
    const newSpecies = e.target.value;
    setEditSpecies(newSpecies);
    setEditBreed(""); // Clear breed when species changes
  }

  // Dynamically determine which breed list to show based on the selected species
  const currentSpeciesKey = editSpecies.toLowerCase().trim();
  const activeBreeds = BREED_MAP[currentSpeciesKey] || [];

  return (
    <div className="page">
      <h1>{patient?.name}</h1>

      {!editMode && (
        <div className="card">
          <h3>Patient Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <p><strong>Species:</strong> {patient?.species || "N/A"}</p>
            <p><strong>Breed:</strong> {patient?.breed || "N/A"}</p>
            <p><strong>Colour:</strong> {patient?.colour || "N/A"}</p>
            <p><strong>Gender:</strong> {patient?.gender || "N/A"}</p>
            <p><strong>Age:</strong> {patient?.age_years || 0} yrs {patient?.age_months || 0} mos</p>
            <p><strong>Weight:</strong> {patient?.weight ? `${patient.weight} kg` : "N/A"}</p>
            <p style={{ gridColumn: "1 / -1" }}><strong>Microchip:</strong> {patient?.microchip || "N/A"}</p>
          </div>

          <div style={{ marginTop: "15px" }}>
            <strong>Notes:</strong>
            <div style={{ marginTop: "5px", padding: "10px", background: "#f8f9fb", borderRadius: "10px" }}>
              {patient?.notes || "No notes"}
            </div>
          </div>

          <button style={{ marginTop: "15px" }} onClick={() => setEditMode(true)}>Edit</button>
        </div>
      )}

      {editMode && (
        <div className="card">
          <h3>Edit Patient</h3>
          
          <input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          
          {/* Species Input with Datalist */}
          <input 
            list="species-options" 
            placeholder="Species (Select or Type)" 
            value={editSpecies} 
            onChange={handleSpeciesChange} 
          />
          <datalist id="species-options">
            {SPECIES_OPTIONS.map(species => <option key={species} value={species} />)}
          </datalist>
          
          {/* Breed Input with Dynamic Datalist */}
          <input 
            list="breed-options" 
            placeholder={activeBreeds.length > 0 ? "Breed (Select or Type)" : "Breed (Type manually)"} 
            value={editBreed} 
            onChange={(e) => setEditBreed(e.target.value)} 
          />
          <datalist id="breed-options">
            {activeBreeds.map(breed => <option key={breed} value={breed} />)}
          </datalist>

          {/* Colour Input with Datalist */}
          <input 
            list="colour-options" 
            placeholder="Colour (Select or Type)" 
            value={editColour} 
            onChange={(e) => setEditColour(e.target.value)} 
          />
          <datalist id="colour-options">
            {COMMON_COLOURS.map(colour => <option key={colour} value={colour} />)}
          </datalist>
          
          {/* Gender Input with Datalist */}
          <input 
            list="gender-options" 
            placeholder="Gender (Select or Type)" 
            value={editGender} 
            onChange={(e) => setEditGender(e.target.value)} 
          />
          <datalist id="gender-options">
            {GENDER_OPTIONS.map(gender => <option key={gender} value={gender} />)}
          </datalist>

          <input placeholder="Microchip Number" value={editMicrochip} onChange={(e) => setEditMicrochip(e.target.value)} />
          
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <input placeholder="Age (Years)" type="number" value={editAgeYears} onChange={(e) => setEditAgeYears(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
            <input placeholder="Age (Months)" type="number" value={editAgeMonths} onChange={(e) => setEditAgeMonths(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
          </div>

          <input placeholder="Weight (kg)" type="number" step="0.01" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
          
          <textarea rows={5} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes..." />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={updatePatient} style={{ flex: 1, background: "#27ae60", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditMode(false)} style={{ flex: 1, background: "#e74c3c", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Consent</h3>
        <div style={{ fontSize: "14px", marginBottom: "10px", background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
          <p>• I certify that I am the owner or authorized agent of the above-described animal and have the authority to consent to its euthanasia.</p>
          <p>• I understand that euthanasia involves the termination of the animal’s life to prevent further pain or suffering.</p>
          <p>• I have discussed the option of euthanasia with a veterinary surgeon, including alternatives such as monitoring or treatment.</p>
          <p>• I understand the procedure and potential risks involved.</p>
        </div>

        <input placeholder="Full name" value={consentName} onChange={(e) => setConsentName(e.target.value)} />

        <div style={{ border: "1px solid #ccc", borderRadius: "10px", marginTop: "10px" }}>
          <SignatureCanvas penColor="black" canvasProps={{ width: 300, height: 150 }} ref={sigPadRef} />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={clearSignature}>Clear</button>
          <button onClick={saveConsent}>Save</button>
          <button onClick={saveAndReturn} style={{ background: "#27ae60", color: "white" }}>
            Save & Sedate
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Consent History</h3>
        {consentHistory.map(c => (
          <div key={c.id} style={{ marginBottom: "15px", padding: "10px", background: "#f8f9fb", borderRadius: "10px" }}>
            <strong>{c.name}</strong>
            <div style={{ fontSize: "12px", color: "#666" }}>{new Date(c.created_at).toLocaleString()}</div>
            <img src={c.signature} alt="signature" style={{ marginTop: "10px", border: "1px solid #ccc" }} />
            <button style={{ marginTop: "10px", background: "#e74c3c", color: "white", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" }} onClick={() => deleteConsent(c.id)}>Delete</button>
          </div>
        ))}
        {consentHistory.length === 0 && <p>No consent history</p>}
      </div>
    </div>
  );
}