import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

const DRUG_MAP = {
  ketamine: ["ket", "ketamine"],
  butorphanol: ["but", "butorphanol"],
  dexmedetomidine: ["dex", "dexmedetomidine", "medetomidine"],
  acp: ["acp", "acepromazine"],
  zoletil: ["zoletil", "zol", "tiletamine"],
  pentobarbital: ["pent", "pentobarbital", "euth", "euthatal", "somcare", "pento", "euthanasia"]
};

function normaliseDrugName(name) {
  if (!name) return "";
  const clean = name.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(DRUG_MAP)) {
    if (aliases.some(a => clean.includes(a))) return key;
  }
  return clean;
}

const btnStyle = { padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "details"); 
  const [isAdmin, setIsAdmin] = useState(false);

  const [patient, setPatient] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  const [protocols, setProtocols] = useState([]);
  const [stock, setStock] = useState([]);
  const [protocolId, setProtocolId] = useState("");
  const [calcResults, setCalcResults] = useState([]);
  const [pentoMgMl, setPentoMgMl] = useState("200");
  const [pentoWaste, setPentoWaste] = useState("0.05");
  const [sedationHistory, setSedationHistory] = useState([]);

  const [allProducts, setAllProducts] = useState([]);
  const [patientProcedures, setPatientProcedures] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [procedurePrice, setProcedurePrice] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");

  const [consentHistory, setConsentHistory] = useState([]);
  const [consentName, setConsentName] = useState("");
  const sigPadRef = useRef(null);

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
    async function loadAllData() {
      setIsLoading(true);
      await Promise.all([
        checkAdmin(), fetchPatient(), fetchConsentHistory(), fetchProducts(),
        fetchProcedures(), fetchAppointments(), fetchProtocols(), fetchStock(), fetchSedationHistory()
      ]);
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    loadAllData();
  }, [id]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

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

  async function fetchSedationHistory() {
    const { data } = await supabase.from("sedation_records").select("*").eq("patient_id", id).order("created_at", { ascending: false });
    setSedationHistory(data || []);
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

  async function fetchProtocols() {
    const { data } = await supabase.from("protocols").select("*, protocol_drugs (*)");
    setProtocols(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase.from("stock").select("*");
    setStock(data || []);
  }

  async function updatePatient() {
    const payload = { ...editData, age_years: Number(editData.age_years) || null, age_months: Number(editData.age_months) || null, weight: Number(editData.weight) };
    const { error } = await supabase.from("patients").update(payload).eq("id", id);
    if (!error) { setEditMode(false); fetchPatient(); } else alert(error.message);
  }

  async function toggleDeceased() {
    const newStatus = !patient.is_deceased;
    if (newStatus && !window.confirm(`Mark ${patient.name} as Deceased?`)) return;
    const { error } = await supabase.from("patients").update({ is_deceased: newStatus }).eq("id", id);
    if (!error) fetchPatient();
  }

  function getStockForDrug(drug) {
    return stock.filter(s => normaliseDrugName(s.drug) === normaliseDrugName(drug) && s.total_ml > 0 && !s.is_archived);
  }

  function handleProtocolChange(e) {
    const newId = e.target.value;
    setProtocolId(newId);
    if (!newId || !patient?.weight) {
      setCalcResults([]);
      return;
    }
    const proto = protocols.find(p => String(p.id) === String(newId));
    if (proto && proto.protocol_drugs) {
      const calc = proto.protocol_drugs.map(d => ({
        drug: normaliseDrugName(d.drug_name),
        label: d.drug_name,
        ml: Number(((d.mg_per_kg * patient.weight) / d.mg_per_ml).toFixed(3)),
        waste: 0.05,
        batchId: "",
        batchName: ""
      }));
      setCalcResults(calc);
    }
  }

  function updateDose(i, val) {
    const updated = [...calcResults];
    updated[i].ml = val === "" ? "" : parseFloat(val) || 0;
    setCalcResults(updated);
  }

  function updateWaste(i, val) {
    const updated = [...calcResults];
    updated[i].waste = val === "" ? "" : parseFloat(val) || 0;
    setCalcResults(updated);
  }

  function updateBatch(i, val) {
    const updated = [...calcResults];
    updated[i].batchId = val;
    setCalcResults(updated);
  }

  async function saveDosing() {
    if (!patient?.weight) return;
    
    const toSave = [...calcResults];
    
    if (pentoVolume > 0) {
      toSave.push({
        drug: "pentobarbital",
        label: "Pentobarbital",
        ml: pentoVolume,
        waste: Number(pentoWaste) || 0,
        batchId: null 
      });
    }

    if (toSave.length === 0) return alert("Select a protocol or enter a pentobarbital dose to save.");

    const missingBatches = toSave.some(r => r.drug !== "pentobarbital" && !r.batchId);
    if (missingBatches && !window.confirm("Some drugs have no batch selected. Save anyway?")) return;

    const { error } = await supabase.from("sedation_records").insert([{ 
      patient_id: id, 
      protocol_id: protocolId || null, 
      weight: patient.weight, 
      results: toSave 
    }]);

    if (!error) {
      for (const r of toSave) {
        const totalUsed = (parseFloat(r.ml) || 0) + (parseFloat(r.waste) || 0);
        if (r.batchId && totalUsed > 0) {
          const current = stock.find(s => String(s.id) === String(r.batchId));
          if (current) {
            await supabase.from("stock").update({ total_ml: Math.max(0, current.total_ml - totalUsed) }).eq("id", current.id);
          }
        }
      }
      alert("Doses successfully recorded!");
      setCalcResults([]);
      setProtocolId("");
      fetchStock();
      fetchSedationHistory(); 
    } else {
      alert("Error saving doses: " + error.message);
    }
  }

  const pentoVolume = patient?.weight && pentoMgMl ? Number(((150 * patient.weight) / Number(pentoMgMl)).toFixed(3)) : 0;

  function handleProductSelect(e) {
    const prodId = e.target.value; setSelectedProductId(prodId);
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) setProcedurePrice(prod.price);
  }

  async function addProcedure() {
    if (!selectedProductId) return alert("Please select a procedure.");
    const prod = allProducts.find(p => p.id === selectedProductId);
    const payload = { patient_id: id, product_id: selectedProductId, product_name: prod.name, price: Number(procedurePrice), notes: procedureNotes, is_paid: false };
    const { error } = await supabase.from("patient_procedures").insert([payload]);
    if (!error) { setSelectedProductId(""); setProcedurePrice(""); setProcedureNotes(""); fetchProcedures(); }
  }

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

  async function saveConsent(andSedate = false) {
    if (!consentName) return alert("Enter name");
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return alert("Please sign");
    const { error } = await supabase.from("consent_records").insert([{ patient_id: id, name: consentName, signature: sigPadRef.current.toDataURL() }]);
    if (!error) {
      sigPadRef.current.clear(); setConsentName(""); fetchConsentHistory();
      if (andSedate) setActiveTab("dosing");
    }
  }

  async function deleteConsent(consentId) {
    if (!window.confirm("Delete this consent?")) return;
    await supabase.from("consent_records").delete().eq("id", consentId);
    fetchConsentHistory();
  }

  async function saveAppointment() {
    if (!aptDate || !aptUserId) return alert("Date and User are required");
    const payload = { user_id: aptUserId, date: aptDate, time_range: aptTime, entry_type: aptType, client_id: patient?.client_id || null, patient_id: id, title: aptTitle, notes: aptNotes };
    if (isEditingApt) await supabase.from("diary_entries").update(payload).eq("id", editAptId);
    else await supabase.from("diary_entries").insert([payload]);
    resetAptForm(); fetchAppointments();
  }

  async function deleteAppointment(aptId) {
    if (!window.confirm("Delete this appointment?")) return;
    await supabase.from("diary_entries").delete().eq("id", aptId);
    fetchAppointments();
  }

  function startEditApt(apt) {
    setIsEditingApt(true); setEditAptId(apt.id); setAptUserId(apt.user_id); setAptDate(apt.date); setAptTime(apt.time_range || ""); setAptType(apt.entry_type || "Consultation"); setAptTitle(apt.title || ""); setAptNotes(apt.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAptForm() { setIsEditingApt(false); setEditAptId(null); setAptTime(""); setAptType("Consultation"); setAptTitle(""); setAptNotes(""); }

  const currentSpeciesKey = editData.species?.toLowerCase().trim() || "";
  const activeBreeds = BREED_MAP[currentSpeciesKey] || [];
  const totalCost = patientProcedures.reduce((sum, p) => sum + Number(p.price), 0);
  const amountDue = patientProcedures.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.price), 0);

  const TABS = [
    { id: "details", label: "Details" },
    { id: "dosing", label: "Dosing Calc" },
    { id: "procedures", label: "Procedures" },
    { id: "consent", label: "Consent" },
    { id: "appointments", label: "Appointments" },
    { id: "files", label: "Files" },
    { id: "emails", label: "Emails/SMS" }
  ];

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <style>
          {`
            @keyframes pawWalk {
              0% { opacity: 0; transform: translateY(5px); }
              25% { opacity: 1; transform: translateY(0); }
              50% { opacity: 0; transform: translateY(-5px); }
              100% { opacity: 0; }
            }
          `}
        </style>
        <div style={{ position: "relative", width: "100px", height: "120px", marginBottom: "10px" }}>
          <svg viewBox="0 0 512 512" width="35" height="35" fill="#5b8fb9" style={{ position: "absolute", bottom: "10px", left: "10px", transform: "rotate(-15deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "0s", opacity: 0 }}><path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/></svg>
          <svg viewBox="0 0 512 512" width="35" height="35" fill="#5b8fb9" style={{ position: "absolute", top: "40px", right: "15px", transform: "rotate(15deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "0.5s", opacity: 0 }}><path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/></svg>
          <svg viewBox="0 0 512 512" width="35" height="35" fill="#5b8fb9" style={{ position: "absolute", top: "0px", left: "20px", transform: "rotate(-5deg)", animation: "pawWalk 1.5s infinite linear", animationDelay: "1s", opacity: 0 }}><path d="M226.5 92.9c14.3 7.3 22.9 23 22.9 39.1 0 16.1-8.6 31.8-22.9 39.1-14.3 7.3-33.8 7.3-48.1 0-14.3-7.3-22.9-23-22.9-39.1 0-16.1 8.6-31.8 22.9-39.1 14.3-7.3 33.8-7.3 48.1 0zm98.6-39.1c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-147 197.8c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm195.8 0c-14.3 7.3-22.9 23-22.9 39.1 0 16.1 8.6 31.8 22.9 39.1 14.3 7.3 33.8 7.3 48.1 0 14.3-7.3 22.9-23 22.9-39.1 0-16.1-8.6-31.8-22.9-39.1-14.3-7.3-33.8-7.3-48.1 0zm-87.4-42.5c-48.6-25.1-115.5-25.1-164.1 0-24.1 12.4-38.6 39-38.6 66.5 0 27.5 14.5 54.1 38.6 66.5 24.3 12.5 56.6 15.3 84.8 8.6 28.2-6.7 54.2-22.7 78.5-47.5 24.3 24.8 50.3 40.8 78.5 47.5 28.2 6.7 60.5 3.9 84.8-8.6 24.1-12.4 38.6-39 38.6-66.5 0-27.5-14.5-54.1-38.6-66.5-48.6-25.1-115.5-25.1-164.1 0z"/></svg>
        </div>
        <p style={{ marginTop: "10px", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Patient Data...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 10px 0" }}>{patient?.name || "Patient"}</h1>
        {patient?.is_deceased ? (
          <div style={{ display: "inline-block", background: "#7f8c8d", color: "white", padding: "5px 15px", borderRadius: "15px", fontSize: "14px", fontWeight: "bold" }}>🕊️ Deceased</div>
        ) : (
          <div style={{ display: "inline-block", background: "#27ae60", color: "white", padding: "5px 15px", borderRadius: "15px", fontSize: "14px", fontWeight: "bold" }}>Alive</div>
        )}
      </div>

      {/* SCROLLABLE MINI MENU */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", background: "white", padding: "10px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto", whiteSpace: "nowrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} style={{ ...btnStyle, padding: "10px 20px", background: activeTab === tab.id ? '#5b8fb9' : 'transparent', color: activeTab === tab.id ? 'white' : '#666' }} onClick={() => setActiveTab(tab.id)}>
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
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={toggleDeceased} style={{ background: patient?.is_deceased ? "#95a5a6" : "#e74c3c", color: "white", padding: "6px 10px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                  {patient?.is_deceased ? "Unmark Deceased" : "Mark Deceased"}
                </button>
                <button onClick={() => setEditMode(true)} style={{ background: "#5b8fb9", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                  Edit
                </button>
              </div>
            ) : (
              <button onClick={() => { setEditMode(false); fetchPatient(); }} style={{ background: "#f39c12", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "12px" }}>Cancel</button>
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

      {/* ================= TAB 2: DOSING CALC ================= */}
      {activeTab === "dosing" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Dosing Calculator</h3>
            {patient?.weight && <span style={{ background: "#27ae60", color: "white", padding: "5px 10px", borderRadius: "10px", fontWeight: "bold" }}>{patient.weight} kg</span>}
          </div>

          {!patient?.weight && (
            <div style={{ background: "#fdf3f2", color: "#e74c3c", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontWeight: "bold" }}>
              ⚠️ Please set patient weight in the Details tab first.
            </div>
          )}

          {/* SEDATION PROTOCOL */}
          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", color: "#5b8fb9" }}>1. Sedation Protocol</h4>
          <select value={protocolId} onChange={handleProtocolChange} style={inputStyle} disabled={!patient?.weight}>
            <option value="">-- Select Protocol --</option>
            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {calcResults.map((r, i) => (
            <div key={i} style={{ padding: "12px", background: "#f8f9fb", borderRadius: "10px", marginTop: "10px", border: "1px solid #eee" }}>
              <strong>{r.label}</strong>
              <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: "#666" }}>Dose (ml)</label><input type="number" step="0.01" value={r.ml} onChange={e => updateDose(i, e.target.value)} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: "#666" }}>Waste (ml)</label><input type="number" step="0.01" value={r.waste} onChange={e => updateWaste(i, e.target.value)} style={inputStyle} /></div>
              </div>
              <select value={r.batchId} onChange={e => updateBatch(i, e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                <option value="">-- Select Stock Batch --</option>
                {getStockForDrug(r.drug).map(s => <option key={s.id} value={s.id}>{s.batch} ({s.total_ml} ml left)</option>)}
              </select>
            </div>
          ))}

          {/* PENTOBARBITAL CALC - BATCH REMOVED */}
          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", marginTop: "25px", color: "#5b8fb9" }}>2. Pentobarbital (150 mg/kg)</h4>
          <div style={{ padding: "12px", background: "#fdf3f2", borderRadius: "10px", border: "1px solid #fadbd8" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#666" }}>Stock Conc. (mg/ml)</label>
                <input type="number" value={pentoMgMl} onChange={e => setPentoMgMl(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} disabled={!patient?.weight} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#666" }}>Calculated Vol (ml)</label>
                <input readOnly value={pentoVolume} style={{ ...inputStyle, background: "#eee", fontWeight: "bold", marginBottom: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#666" }}>Waste (ml)</label>
                <input type="number" step="0.01" value={pentoWaste} onChange={e => setPentoWaste(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} disabled={!patient?.weight} />
              </div>
            </div>
          </div>

          <button onClick={saveDosing} style={{ ...btnStyle, width: "100%", background: "#27ae60", color: "white", marginTop: "20px" }} disabled={!patient?.weight}>
            Record Doses & Deduct from Stock
          </button>
          
          {/* DOSING HISTORY DISPLAY */}
          {sedationHistory.length > 0 && (
            <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "15px", marginTop: "30px", border: "1px solid #eee" }}>
              <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#2c3e50" }}>Dosing History</h3>
              {sedationHistory.map(h => (
                <div key={h.id} style={{ ...whiteShadowBox, marginBottom: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "5px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "bold" }}>
                      {new Date(h.created_at).toLocaleString('en-GB')}
                    </span>
                    <span style={{ fontSize: "12px", color: "#3498db", fontWeight: "bold" }}>
                      Weight: {h.weight} kg
                    </span>
                  </div>
                  {h.results?.map((r, idx) => (
                    <div key={idx} style={{ fontSize: "14px", color: "#333", marginBottom: "4px" }}>
                      <strong>{r.label || r.drug}</strong>: {r.ml} ml {r.waste > 0 ? <span style={{color: "#7f8c8d", fontSize: "12px"}}>(+ {r.waste} ml waste)</span> : ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PROCEDURES ================= */}
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
                <div style={{ fontSize: "18px", fontWeight: "bold", color: amountDue > 0 ? "#e74c3c" : "#27ae60", marginBottom: "5px" }}>Amount Due: £{amountDue.toFixed(2)}</div>
                
                {totalCost > 0 && amountDue > 0 && <button onClick={markAllPaid} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>Mark Invoice Paid</button>}
                {totalCost > 0 && amountDue === 0 && <button onClick={unmarkAllPaid} style={{ background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>Unmark Invoice</button>}
              </div>
            </div>
            
            {patientProcedures.length === 0 && <p style={{ color: "#666" }}>No procedures added yet.</p>}
            
            {patientProcedures.map(proc => (
              <div key={proc.id} style={{ background: proc.is_paid ? "#f0fdf4" : "white", padding: "15px", borderRadius: "12px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", border: proc.is_paid ? "1px solid #bbf7d0" : "1px solid #eee", opacity: proc.is_paid ? 0.7 : 1 }}>
                <div>
                  <strong style={{ display: "block", fontSize: "16px", textDecoration: proc.is_paid ? "line-through" : "none" }}>{proc.product_name}</strong>
                  {proc.notes && <span style={{ color: "#7f8c8d", fontSize: "14px" }}>{proc.notes}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <strong style={{ fontSize: "16px" }}>£{Number(proc.price).toFixed(2)}</strong>
                  <button onClick={() => deleteProcedure(proc.id)} style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold" }}>X</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 4: CONSENT ================= */}
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

      {/* ================= TAB 5: APPOINTMENTS ================= */}
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
                        <span style={{ background: `${badgeColor}22`, color: badgeColor, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>{apt.entry_type}</span>
                        <span style={{ color: "#333", fontWeight: "bold", fontSize: "14px" }}>{new Date(apt.date).toLocaleDateString('en-GB')} {apt.time_range && `| ${apt.time_range}`}</span>
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

      {/* ================= TAB 6: FILES ================= */}
      {activeTab === "files" && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h3 style={{ color: "#2c3e50" }}>Documents & Files</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>File upload and document storage module will go here.</p>
          <button style={{ ...btnStyle, background: "#bdc3c7", color: "white", cursor: "not-allowed" }}>Upload File (Coming Soon)</button>
        </div>
      )}

      {/* ================= TAB 7: EMAILS ================= */}
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