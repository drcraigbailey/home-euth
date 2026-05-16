import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import SignatureCanvas from "react-signature-canvas";

const SPECIES_OPTIONS = ["Dog", "Cat", "Rabbit", "Small Mammal", "Bird", "Reptile", "Equine"];
const BREED_MAP = {
  dog: ["Mixed Breed", "Labrador Retriever", "Golden Retriever", "French Bulldog", "German Shepherd", "Cocker Spaniel", "Staffordshire Bull Terrier", "Jack Russell Terrier", "Shih Tzu", "Chihuahua", "Pug", "Border Collie", "Dachshund", "Poodle", "Greyhound", "Lurcher"],
  cat: ["Domestic Shorthair", "Domestic Longhair", "British Shorthair", "Ragdoll", "Siamese", "Bengal", "Maine Coon", "Persian", "Sphynx", "Burmese"],
  rabbit: ["Mixed Breed", "Mini Lop", "Netherland Dwarf", "Lionhead", "French Lop", "Dutch", "Flemish Giant", "Rex"],
  "small mammal": ["Guinea Pig", "Hamster (Syrian)", "Hamster (Dwarf)", "Rat", "Mouse", "Chinchilla", "Ferret", "Gerbil", "Degu"]
};
const COMMON_COLOURS = ["Black", "White", "Brown", "Chocolate", "Tan", "Black & White", "Brown & White", "Tabby", "Tortoiseshell", "Calico", "Brindle", "Fawn", "Blue/Grey", "Ginger", "Cream", "Tricolour", "Merle", "Roan", "Agouti"];
const GENDER_OPTIONS = ["Male (Entire)", "Male (Neutered)", "Female (Entire)", "Female (Spayed)", "Unknown"];

const btnStyle = { padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("details"); 
  const [isAdmin, setIsAdmin] = useState(false);

  const [patient, setPatient] = useState(null);
  
  // Tab 1: Details
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Tab 2: Procedures
  const [allProducts, setAllProducts] = useState([]);
  const [patientProcedures, setPatientProcedures] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [procedurePrice, setProcedurePrice] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");

  // Tab 3: Consent
  const [consentHistory, setConsentHistory] = useState([]);
  const [consentName, setConsentName] = useState("");
  const sigPadRef = useRef(null);

  // Tab 4: Appointments
  const [profiles, setProfiles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isEditingApt, setIsEditingApt] = useState(false);
  const [editAptId, setEditAptId] = useState(null);
  const [aptUserId, setAptUserId] = useState("");
  const [aptDate, setAptDate] = useState(new Date().toISOString().split("T")[0]);
  const [aptTime, setAptTime] = useState("");
  const [aptType, setAptType] = useState("Consultation");
  const [aptTitle, setAptTitle] = useState("");
  const [aptNotes, setAptNotes] = useState("");

  useEffect(() => {
    checkAdmin();
    fetchPatient();
    fetchConsentHistory();
    fetchProducts();
    fetchProcedures();
    fetchAppointments();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      const adminStatus = !!profile?.is_admin;
      setIsAdmin(adminStatus);

      if (adminStatus) {
        const { data: allProfiles } = await supabase.from("profiles").select("*");
        setProfiles(allProfiles || []);
      } else {
        setProfiles([profile]);
      }
      setAptUserId(session.user.id);
    }
  }

  async function fetchPatient() {
    const { data } = await supabase.from("patients").select("*").eq("id", id).single();
    if (data) { setPatient(data); setEditData(data); }
  }

  async function fetchConsentHistory() {
    const { data } = await supabase.from("consent_records").select("*").eq("patient_id", id).order("created_at", { ascending: false });
    setConsentHistory(data || []);
  }

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    setAllProducts(data || []);
  }

  async function fetchProcedures() {
    const { data } = await supabase.from("patient_procedures").select("*").eq("patient_id", id).order("created_at", { ascending: false });
    setPatientProcedures(data || []);
  }

  async function fetchAppointments() {
    const { data } = await supabase.from("diary_entries").select("*").eq("patient_id", id).order("date", { ascending: false });
    setAppointments(data || []);
  }

  // --- DETAILS LOGIC ---
  async function updatePatient() {
    const payload = { ...editData, age_years: Number(editData.age_years) || null, age_months: Number(editData.age_months) || null, weight: Number(editData.weight) };
    const { error } = await supabase.from("patients").update(payload).eq("id", id);
    if (!error) { setEditMode(false); fetchPatient(); } else alert(error.message);
  }

  // --- PROCEDURES LOGIC ---
  function handleProductSelect(e) {
    const prodId = e.target.value; setSelectedProductId(prodId);
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) setProcedurePrice(prod.price);
  }

  async function addProcedure() {
    if (!selectedProductId) return alert("Please select a procedure.");
    const prod = allProducts.find(p => p.id === selectedProductId);
    const payload = { 
      patient_id: id, product_id: selectedProductId, product_name: prod.name, 
      price: Number(procedurePrice), notes: procedureNotes, is_paid: false 
    };
    const { error } = await supabase.from("patient_procedures").insert([payload]);
    if (!error) { setSelectedProductId(""); setProcedurePrice(""); setProcedureNotes(""); fetchProcedures(); }
  }

  // SINGLE MARK ALL PAID FUNCTION
  async function markAllPaid() {
    const { error } = await supabase.from("patient_procedures").update({ is_paid: true }).eq("patient_id", id).eq("is_paid", false);
    if (!error) fetchProcedures();
  }

  async function unmarkAllPaid() {
    if (!window.confirm("Unmark invoice as paid?")) return;
    const { error } = await supabase.from("patient_procedures").update({ is_paid: false }).eq("patient_id", id).eq("is_paid", true);
    if (!error) fetchProcedures();
  }

  async function deleteProcedure(procId) {
    if (!window.confirm("Remove this procedure?")) return;
    await supabase.from("patient_procedures").delete().eq("id", procId);
    fetchProcedures();
  }

  // --- CONSENT LOGIC ---
  async function saveConsent(andSedate = false) {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return alert("Please sign");
    
    const { error } = await supabase.from("consent_records").insert([{ patient_id: id, name: consentName, signature: sigPadRef.current.toDataURL() }]);
    if (!error) {
      sigPadRef.current.clear(); setConsentName(""); fetchConsentHistory();
      if (andSedate) navigate("/sedation", { state: { incomingPatientId: id } });
    }
  }

  async function deleteConsent(consentId) {
    if (!window.confirm("Delete this consent?")) return;
    await supabase.from("consent_records").delete().eq("id", consentId);
    fetchConsentHistory();
  }

  // --- APPOINTMENTS LOGIC ---
  async function saveAppointment() {
    if (!aptDate || !aptUserId) return alert("Date and User are required");
    
    const payload = {
      user_id: aptUserId,
      date: aptDate,
      time_range: aptTime,
      entry_type: aptType,
      client_id: patient?.client_id || null, 
      patient_id: id, 
      title: aptTitle,
      notes: aptNotes
    };

    if (isEditingApt) {
      await supabase.from("diary_entries").update(payload).eq("id", editAptId);
    } else {
      await supabase.from("diary_entries").insert([payload]);
    }
    
    resetAptForm();
    fetchAppointments();
  }

  async function deleteAppointment(aptId) {
    if (!window.confirm("Delete this appointment?")) return;
    await supabase.from("diary_entries").delete().eq("id", aptId);
    fetchAppointments();
  }

  function startEditApt(apt) {
    setIsEditingApt(true);
    setEditAptId(apt.id);
    setAptUserId(apt.user_id);
    setAptDate(apt.date);
    setAptTime(apt.time_range || "");
    setAptType(apt.entry_type || "Consultation");
    setAptTitle(apt.title || "");
    setAptNotes(apt.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAptForm() {
    setIsEditingApt(false);
    setEditAptId(null);
    setAptTime("");
    setAptType("Consultation");
    setAptTitle("");
    setAptNotes("");
  }


  // Variables for rendering
  const currentSpeciesKey = editData.species?.toLowerCase().trim() || "";
  const activeBreeds = BREED_MAP[currentSpeciesKey] || [];
  
  // Calculate Totals
  const totalCost = patientProcedures.reduce((sum, p) => sum + Number(p.price), 0);
  const amountDue = patientProcedures.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.price), 0);

  const TABS = [
    { id: "details", label: "Details" },
    { id: "procedures", label: "Procedures" },
    { id: "consent", label: "Consent" },
    { id: "appointments", label: "Appointments" },
    { id: "files", label: "Files" },
    { id: "emails", label: "Emails/SMS" }
  ];

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>{patient?.name || "Patient"}</h1>

      {/* SCROLLABLE MINI MENU */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", background: "white", padding: "10px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto", whiteSpace: "nowrap" }}>
        {TABS.map(tab => (
          <button 
            key={tab.id}
            style={{ ...btnStyle, padding: "10px 20px", background: activeTab === tab.id ? '#5b8fb9' : 'transparent', color: activeTab === tab.id ? 'white' : '#666' }} 
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: DETAILS ================= */}
      {activeTab === "details" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Patient Info</h3>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} style={{ padding: "8px 15px", borderRadius: "8px" }}>Edit</button>
            ) : (
              <button onClick={() => { setEditMode(false); fetchPatient(); }} style={{ background: "#f39c12", color: "white", padding: "8px 15px", border: "none", borderRadius: "8px" }}>Cancel</button>
            )}
          </div>

          {!editMode ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <p><strong>Species:</strong> {patient?.species || "N/A"}</p>
                <p><strong>Breed:</strong> {patient?.breed || "N/A"}</p>
                <p><strong>Colour:</strong> {patient?.colour || "N/A"}</p>
                <p><strong>Gender:</strong> {patient?.gender || "N/A"}</p>
                <p><strong>Age:</strong> {patient?.age_years || 0}y {patient?.age_months || 0}m</p>
                <p><strong>Weight:</strong> {patient?.weight ? `${patient.weight} kg` : "N/A"}</p>
                <p style={{ gridColumn: "1 / -1" }}><strong>Microchip:</strong> {patient?.microchip || "N/A"}</p>
              </div>
              <div style={{ marginTop: "15px" }}>
                <strong>Notes:</strong>
                <div style={{ marginTop: "5px", padding: "15px", background: "#f8f9fb", borderRadius: "10px", minHeight: "50px" }}>
                  {patient?.notes || "No notes"}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input placeholder="Name" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} style={inputStyle} />
              <input list="species-options" placeholder="Species" value={editData.species} onChange={(e) => setEditData({...editData, species: e.target.value, breed: ""})} style={inputStyle} />
              <datalist id="species-options">{SPECIES_OPTIONS.map(s => <option key={s} value={s} />)}</datalist>
              <input list="breed-options" placeholder="Breed" value={editData.breed} onChange={(e) => setEditData({...editData, breed: e.target.value})} style={inputStyle} />
              <datalist id="breed-options">{activeBreeds.map(b => <option key={b} value={b} />)}</datalist>
              <input list="colour-options" placeholder="Colour" value={editData.colour} onChange={(e) => setEditData({...editData, colour: e.target.value})} style={inputStyle} />
              <datalist id="colour-options">{COMMON_COLOURS.map(c => <option key={c} value={c} />)}</datalist>
              <input list="gender-options" placeholder="Gender" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})} style={inputStyle} />
              <datalist id="gender-options">{GENDER_OPTIONS.map(g => <option key={g} value={g} />)}</datalist>
              <input placeholder="Microchip" value={editData.microchip} onChange={(e) => setEditData({...editData, microchip: e.target.value})} style={inputStyle} />
              
              <div style={{ display: "flex", gap: "10px" }}>
                <input placeholder="Age (Yrs)" type="number" value={editData.age_years || ""} onChange={(e) => setEditData({...editData, age_years: e.target.value})} style={inputStyle} />
                <input placeholder="Age (Mos)" type="number" value={editData.age_months || ""} onChange={(e) => setEditData({...editData, age_months: e.target.value})} style={inputStyle} />
              </div>

              <input placeholder="Weight (kg)" type="number" step="0.01" value={editData.weight || ""} onChange={(e) => setEditData({...editData, weight: e.target.value})} style={inputStyle} />
              <textarea rows={4} placeholder="Notes..." value={editData.notes || ""} onChange={(e) => setEditData({...editData, notes: e.target.value})} style={inputStyle} />
              
              <button onClick={updatePatient} style={{ ...btnStyle, background: "#27ae60", color: "white" }}>Save Changes</button>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PROCEDURES ================= */}
      {activeTab === "procedures" && (
        <>
          <div className="card">
            <h3>Add Procedure</h3>
            <select value={selectedProductId} onChange={handleProductSelect} style={inputStyle}>
              <option value="">-- Select Product/Procedure --</option>
              {allProducts.map(p => <option key={p.id} value={p.id}>{p.name} (£{p.price})</option>)}
            </select>
            
            {selectedProductId && (
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="number" step="0.01" placeholder="Price (£)" value={procedurePrice} onChange={e => setProcedurePrice(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Optional Notes..." value={procedureNotes} onChange={e => setProcedureNotes(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
              </div>
            )}
            <button onClick={addProcedure} style={{ ...btnStyle, width: "100%", background: "#3498db", color: "white" }}>Add to Invoice</button>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
              <h3 style={{ margin: 0 }}>Visit Summary</h3>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: "14px", color: "#7f8c8d" }}>Total Cost: £{totalCost.toFixed(2)}</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: amountDue > 0 ? "#e74c3c" : "#27ae60", marginBottom: "5px" }}>
                  Amount Due: £{amountDue.toFixed(2)}
                </div>
                
                {/* GLOBAL INVOICE BUTTONS */}
                {totalCost > 0 && amountDue > 0 && (
                  <button onClick={markAllPaid} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>
                    Mark Invoice Paid
                  </button>
                )}
                {totalCost > 0 && amountDue === 0 && (
                  <button onClick={unmarkAllPaid} style={{ background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>
                    Unmark Invoice
                  </button>
                )}
              </div>
            </div>
            
            {patientProcedures.length === 0 && <p style={{ color: "#666" }}>No procedures added yet.</p>}
            
            {patientProcedures.map(proc => (
              <div key={proc.id} style={{ 
                background: proc.is_paid ? "#f0fdf4" : "white", padding: "15px", borderRadius: "12px", marginBottom: "10px", 
                display: "flex", justifyContent: "space-between", alignItems: "center", border: proc.is_paid ? "1px solid #bbf7d0" : "1px solid #eee", opacity: proc.is_paid ? 0.7 : 1
              }}>
                <div>
                  <strong style={{ display: "block", fontSize: "16px", textDecoration: proc.is_paid ? "line-through" : "none" }}>{proc.product_name}</strong>
                  {proc.notes && <span style={{ color: "#7f8c8d", fontSize: "14px" }}>{proc.notes}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <strong style={{ fontSize: "16px" }}>£{Number(proc.price).toFixed(2)}</strong>
                  {/* Keep only the Delete button individually */}
                  <button onClick={() => deleteProcedure(proc.id)} style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold" }}>X</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 3: CONSENT ================= */}
      {activeTab === "consent" && (
        <>
          <div className="card">
            <h3>Euthanasia Consent</h3>
            <div style={{ fontSize: "14px", marginBottom: "15px", background: "#fdf3f2", borderLeft: "4px solid #e74c3c", padding: "10px", borderRadius: "5px" }}>
              <p>I certify that I am the owner or authorized agent of the above-described animal and have the authority to consent to its euthanasia.</p>
              <p>I understand the procedure and potential risks involved.</p>
            </div>
            <input placeholder="Signatory Full Name" value={consentName} onChange={(e) => setConsentName(e.target.value)} style={inputStyle} />
            <div style={{ border: "1px solid #ccc", borderRadius: "10px", marginTop: "10px", background: "white" }}>
              <SignatureCanvas penColor="black" canvasProps={{ width: 300, height: 150, className: "sigCanvas" }} ref={sigPadRef} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button onClick={() => sigPadRef.current.clear()} style={{ ...btnStyle, flex: 1 }}>Clear</button>
              <button onClick={() => saveConsent(false)} style={{ ...btnStyle, flex: 1, background: "#3498db", color: "white" }}>Save</button>
              <button onClick={() => saveConsent(true)} style={{ ...btnStyle, flex: 1, background: "#27ae60", color: "white" }}>Save & Sedate</button>
            </div>
          </div>
          {consentHistory.length > 0 && (
            <div className="card" style={{ marginTop: "20px" }}>
              <h3>Consent History</h3>
              {consentHistory.map(c => (
                <div key={c.id} style={{ marginBottom: "15px", padding: "15px", background: "#f8f9fb", borderRadius: "10px", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{c.name}</strong><span style={{ fontSize: "12px", color: "#666" }}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <img src={c.signature} alt="signature" style={{ marginTop: "15px", border: "1px solid #ccc", background: "white", borderRadius: "5px", width: "100%", maxWidth: "300px" }} />
                  <button style={{ marginTop: "10px", background: "#e74c3c", color: "white", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer" }} onClick={() => deleteConsent(c.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= TAB 4: APPOINTMENTS ================= */}
      {activeTab === "appointments" && (
        <>
          {isAdmin && (
            <div className="card" style={{ border: isEditingApt ? "2px solid #f39c12" : "none" }}>
              <h3 style={{ marginTop: 0 }}>{isEditingApt ? "Edit Appointment" : "Schedule Appointment"}</h3>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="date" value={aptDate} onChange={e => setAptDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Time (e.g. 14:00)" value={aptTime} onChange={e => setAptTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <select value={aptType} onChange={e => setAptType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  <option value="Consultation">Consultation</option>
                  <option value="Euthanasia">Euthanasia</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
                <select value={aptUserId} onChange={e => setAptUserId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
                </select>
              </div>

              <input placeholder="Custom Title (Optional)" value={aptTitle} onChange={e => setAptTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Notes / Details..." rows={2} value={aptNotes} onChange={e => setAptNotes(e.target.value)} style={inputStyle} />
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={saveAppointment} style={{ ...btnStyle, flex: 1, background: "#27ae60", color: "white" }}>
                  {isEditingApt ? "Update Appointment" : "Add to Diary"}
                </button>
                {isEditingApt && <button onClick={resetAptForm} style={{ ...btnStyle, flex: 1, background: "#e74c3c", color: "white" }}>Cancel</button>}
              </div>
            </div>
          )}

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Appointment History</h3>
            {appointments.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No appointments found.</p>}
            
            {appointments.map(apt => {
              const isEuth = apt.entry_type === "Euthanasia";
              const badgeColor = isEuth ? "#f39c12" : "#95a5a6";

              return (
                <div key={apt.id} style={{ ...whiteShadowBox, borderLeft: `6px solid ${badgeColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span style={{ background: `${badgeColor}22`, color: badgeColor, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                          {apt.entry_type}
                        </span>
                        <span style={{ color: "#333", fontWeight: "bold", fontSize: "14px" }}>
                          {new Date(apt.date).toLocaleDateString('en-GB')} {apt.time_range && `| ${apt.time_range}`}
                        </span>
                      </div>
                      
                      {apt.title && <strong style={{ fontSize: "16px", color: "#333", display: "block" }}>{apt.title}</strong>}
                      {apt.notes && <div style={{ color: "#666", fontSize: "14px", marginTop: "5px" }}>{apt.notes}</div>}
                    </div>

                    {isAdmin && (
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => startEditApt(apt)} style={{ background: "#5b8fb9", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                        <button onClick={() => deleteAppointment(apt.id)} style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= TAB 5: FILES ================= */}
      {activeTab === "files" && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h3 style={{ color: "#2c3e50" }}>Documents & Files</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>File upload and document storage module will go here.</p>
          <button style={{ ...btnStyle, background: "#bdc3c7", color: "white", cursor: "not-allowed" }}>Upload File (Coming Soon)</button>
        </div>
      )}

      {/* ================= TAB 6: EMAILS ================= */}
      {activeTab === "emails" && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h3 style={{ color: "#2c3e50" }}>Emails & SMS</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>Communication logs and direct messaging module will go here.</p>
          <button style={{ ...btnStyle, background: "#bdc3c7", color: "white", cursor: "not-allowed" }}>Compose Message (Coming Soon)</button>
        </div>
      )}

    </div>
  );
}