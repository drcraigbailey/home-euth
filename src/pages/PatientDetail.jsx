// PatientDetail.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import SignatureCanvas from "react-signature-canvas";
import Loader from "../Loader"; 

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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

  // Custom Modal States
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); 
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);

  const [highlightedInvoice, setHighlightedInvoice] = useState(location.state?.targetInvoiceId || null);

  const [patient, setPatient] = useState(null);
  
  // Tab 1: Details
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Tab 2: Dosing Calc
  const [protocols, setProtocols] = useState([]);
  const [stock, setStock] = useState([]);
  const [protocolId, setProtocolId] = useState("");
  const [calcResults, setCalcResults] = useState([]);
  const [sedationHistory, setSedationHistory] = useState([]);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editHistoryResults, setEditHistoryResults] = useState([]);

  // Tab 3: Procedures & Invoices
  const [allProducts, setAllProducts] = useState([]);
  const [patientProcedures, setPatientProcedures] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [procedurePrice, setProcedurePrice] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [editingProcId, setEditingProcId] = useState(null);
  const [editProcPrice, setEditProcPrice] = useState("");
  const [editProcNotes, setEditProcNotes] = useState("");
  const [addingToInvId, setAddingToInvId] = useState(null);
  const [inlineProdId, setInlineProdId] = useState("");
  const [inlinePrice, setInlinePrice] = useState("");
  const [inlineNotes, setInlineNotes] = useState("");

  // Tab 4: Consent
  const [consentHistory, setConsentHistory] = useState([]);
  const [consentName, setConsentName] = useState("");
  const sigPadRef = useRef(null);

  // Tab 5: Appointments
  const [profiles, setProfiles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isEditingApt, setIsEditingApt] = useState(false);
  const [editAptId, setEditAptId] = useState(null);
  const [aptUserId, setAptUserId] = useState("");
  const [aptDate, setAptDate] = useState(new Date().toISOString().split("T")[0]);
  const [aptStartTime, setAptStartTime] = useState("");
  const [aptEndTime, setAptEndTime] = useState("");
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
    if (location.state?.targetInvoiceId) {
      setHighlightedInvoice(location.state.targetInvoiceId);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab === "procedures" && highlightedInvoice) {
      setTimeout(() => {
        const el = document.getElementById(`invoice-${highlightedInvoice}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500); 
    }
  }, [activeTab, highlightedInvoice, patientProcedures.length]);

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
    if (!error) { setEditMode(false); fetchPatient(); } else setAlertMessage(error.message);
  }

  function toggleDeceased() {
    const newStatus = !patient.is_deceased;
    if (!newStatus && !isAdmin) {
      setAlertMessage("Only administrators can unmark a patient as deceased.");
      return;
    }
    
    if (newStatus) {
      setConfirmModal({
        title: "Mark Deceased?",
        message: `Are you sure you want to mark ${patient.name} as Deceased?`,
        confirmText: "Yes, Mark Deceased",
        confirmColor: "#e74c3c",
        onConfirm: async () => {
          const { error } = await supabase.from("patients").update({ is_deceased: true }).eq("id", id);
          if (!error) {
            setPatient(prev => ({ ...prev, is_deceased: true }));
            fetchPatient();
          }
          setConfirmModal(null);
        }
      });
    } else {
      supabase.from("patients").update({ is_deceased: false }).eq("id", id).then(({error}) => {
        if (!error) {
          setPatient(prev => ({ ...prev, is_deceased: false }));
          fetchPatient();
        }
      });
    }
  }

  async function autoMarkDeceased() {
    const { error } = await supabase.from("patients").update({ is_deceased: true }).eq("id", id);
    if (!error) {
      setPatient(prev => ({ ...prev, is_deceased: true }));
      fetchPatient();
      setAlertMessage("Euthanasia added to invoice. Patient has automatically been marked as Deceased. 🕊️");
    }
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
      const calc = proto.protocol_drugs.map(d => {
        const normalised = normaliseDrugName(d.drug_name);
        const stockMatches = getStockForDrug(normalised);
        const prefilledBatchId = stockMatches.length > 0 ? stockMatches[stockMatches.length - 1].id : "";

        const calculatedVolume = (d.mg_per_kg && d.mg_per_ml && Number(d.mg_per_ml) > 0) 
            ? Number(((d.mg_per_kg * patient.weight) / d.mg_per_ml).toFixed(3)) 
            : 0;

        return {
          drug: normalised,
          label: d.drug_name,
          ml: calculatedVolume,
          waste: 0.05,
          batchId: prefilledBatchId,
          batchName: ""
        };
      });
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

  async function executeSaveDosing() {
    const { error } = await supabase.from("sedation_records").insert([{ 
      patient_id: id, 
      protocol_id: protocolId || null, 
      weight: patient.weight, 
      results: calcResults 
    }]);

    if (!error) {
      for (const r of calcResults) {
        const totalUsed = (parseFloat(r.ml) || 0) + (parseFloat(r.waste) || 0);
        if (r.batchId && totalUsed > 0) {
          const current = stock.find(s => String(s.id) === String(r.batchId));
          if (current) {
            await supabase.from("stock").update({ total_ml: Math.max(0, current.total_ml - totalUsed) }).eq("id", current.id);
          }
        }
      }
      setAlertMessage("Doses successfully recorded and deducted from stock!");
      setCalcResults([]);
      setProtocolId("");
      fetchStock(); 
      fetchSedationHistory();
    } else {
      setAlertMessage("Error saving doses: " + error.message);
    }
  }

  function saveDosing() {
    if (!patient?.weight) {
      return setAlertMessage("Please set the patient's weight in the Details tab before recording doses.");
    }
    
    // Check if the user has actually selected a protocol first
    if (!protocolId || calcResults.length === 0) {
      return setAlertMessage("Please select a Sedation Protocol first.");
    }

    const missingBatches = calcResults.some(r => !r.batchId);
    
    setConfirmModal({
      title: "Confirm Dosing",
      message: missingBatches 
        ? "Some drugs have no batch selected. Are you sure you want to record these doses and deduct from stock anyway?"
        : "Are you sure you want to record these doses and deduct the amounts from your active stock?",
      confirmText: "Yes, Record Doses",
      confirmColor: "#27ae60",
      onConfirm: () => {
        setConfirmModal(null);
        executeSaveDosing();
      }
    });
  }

  function startEditHistory(h) {
    setEditingHistoryId(h.id);
    const prefilled = (h.results || []).map(r => ({ ...r, waste: r.waste !== undefined ? r.waste : 0.05 }));
    setEditHistoryResults(prefilled);
  }

  async function saveEditHistory(historyId) {
    const { data: original } = await supabase.from("sedation_records").select("*").eq("id", historyId).single();
    if (original) {
      for (let i = 0; i < editHistoryResults.length; i++) {
        const oldR = original.results[i]; 
        const newR = editHistoryResults[i];
        if (oldR && oldR.batchId) {
          const oldWaste = oldR.waste !== undefined ? parseFloat(oldR.waste) : 0;
          const newWaste = newR.waste !== "" ? parseFloat(newR.waste) : 0;
          const diff = ((parseFloat(oldR.ml) || 0) + oldWaste) - ((parseFloat(newR.ml) || 0) + newWaste); 
          if (diff !== 0) {
            const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", oldR.batchId).single();
            if (currentStock) await supabase.from("stock").update({ total_ml: currentStock.total_ml + diff }).eq("id", oldR.batchId);
          }
        }
      }
    }
    const finalResultsToSave = editHistoryResults.map(r => ({ ...r, ml: parseFloat(r.ml) || 0, waste: r.waste !== "" ? parseFloat(r.waste) : 0 }));
    await supabase.from("sedation_records").update({ results: finalResultsToSave }).eq("id", historyId);
    setEditingHistoryId(null); fetchSedationHistory(); fetchStock();
  }

  function checkEuthAndConsent(productId, notesText) {
    const prod = allProducts.find(p => String(p.id) === String(productId));
    const isEuthProd = prod && (prod.name.toLowerCase().includes("euth") || prod.name.toLowerCase().includes("euthanasia"));
    const isEuthNotes = (notesText || "").toLowerCase().includes("euth") || (notesText || "").toLowerCase().includes("euthanasia");
    
    const isEuth = isEuthProd || isEuthNotes;
    const hasConsent = consentHistory && consentHistory.length > 0;

    return { isEuth, hasConsent };
  }

  function handleProductSelect(e) {
    const prodId = e.target.value; 
    setSelectedProductId(prodId);
    const prod = allProducts.find(p => String(p.id) === String(prodId)); 
    if (prod) setProcedurePrice(prod.price);
  }

  async function addProcedure() {
    if (!selectedProductId) return setAlertMessage("Please select a procedure.");
    
    const { isEuth, hasConsent } = checkEuthAndConsent(selectedProductId, procedureNotes);
    
    if (isEuth && !hasConsent) {
      setShowConsentPrompt(true); 
      return; 
    }

    const prod = allProducts.find(p => String(p.id) === String(selectedProductId));
    const newInvoiceId = generateUUID(); 
    const payload = { 
      patient_id: id, 
      product_id: selectedProductId, 
      product_name: prod.name, 
      price: Number(procedurePrice), 
      notes: procedureNotes, 
      is_paid: false,
      invoice_id: newInvoiceId 
    };
    
    const { error } = await supabase.from("patient_procedures").insert([payload]);
    
    if (!error) { 
      setSelectedProductId(""); setProcedurePrice(""); setProcedureNotes(""); fetchProcedures(); 
      if (isEuth && !patient.is_deceased) {
        autoMarkDeceased();
      }
    }
  }

  function startEditProcedure(proc) {
    setEditingProcId(proc.id);
    setEditProcPrice(proc.price);
    setEditProcNotes(proc.notes || "");
  }

  async function saveEditProcedure(procId) {
    const { error } = await supabase
      .from("patient_procedures")
      .update({ price: Number(editProcPrice), notes: editProcNotes })
      .eq("id", procId);
    
    if (!error) {
      setEditingProcId(null);
      fetchProcedures();
    } else {
      setAlertMessage("Error saving procedure: " + error.message);
    }
  }

  async function saveInlineProcedure(targetInvoiceId) {
    if (!inlineProdId) return setAlertMessage("Select a product.");
    
    const { isEuth, hasConsent } = checkEuthAndConsent(inlineProdId, inlineNotes);
    
    if (isEuth && !hasConsent) {
      setShowConsentPrompt(true);
      return; 
    }

    const prod = allProducts.find(p => String(p.id) === String(inlineProdId));
    const payload = { 
      patient_id: id, 
      product_id: inlineProdId, 
      product_name: prod.name, 
      price: Number(inlinePrice), 
      notes: inlineNotes, 
      is_paid: false,
      invoice_id: targetInvoiceId === 'Legacy' ? null : targetInvoiceId 
    };
    
    const { error } = await supabase.from("patient_procedures").insert([payload]);
    
    if (!error) { 
      setAddingToInvId(null); setInlineProdId(""); setInlinePrice(""); setInlineNotes(""); fetchProcedures(); 
      if (isEuth && !patient.is_deceased) {
        autoMarkDeceased();
      }
    } else {
      setAlertMessage("Error adding item: " + error.message);
    }
  }

  async function markInvoicePaid(invoiceId) {
    if (invoiceId === 'Legacy') {
      const { error } = await supabase.from("patient_procedures").update({ is_paid: true }).is("invoice_id", null).eq("patient_id", id);
      if (!error) fetchProcedures();
    } else {
      const { error } = await supabase.from("patient_procedures").update({ is_paid: true }).eq("invoice_id", invoiceId);
      if (!error) fetchProcedures();
    }
  }

  function unmarkInvoicePaid(invoiceId) {
    if (!isAdmin) return setAlertMessage("Only administrators can unmark invoices as unpaid.");
    
    setConfirmModal({
      title: "Unmark Invoice",
      message: "Are you sure you want to unmark this entire invoice as unpaid?",
      confirmText: "Yes, Unmark",
      confirmColor: "#f39c12",
      onConfirm: async () => {
        if (invoiceId === 'Legacy') {
          const { error } = await supabase.from("patient_procedures").update({ is_paid: false }).is("invoice_id", null).eq("patient_id", id);
          if (!error) fetchProcedures();
        } else {
          const { error } = await supabase.from("patient_procedures").update({ is_paid: false }).eq("invoice_id", invoiceId);
          if (!error) fetchProcedures();
        }
        setConfirmModal(null);
      }
    });
  }

  async function saveConsent(andSedate = false) {
    if (!consentName) return setAlertMessage("Please enter signatory name.");
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return setAlertMessage("Please provide a signature.");
    const { error } = await supabase.from("consent_records").insert([{ patient_id: id, name: consentName, signature: sigPadRef.current.toDataURL() }]);
    if (!error) {
      sigPadRef.current.clear(); setConsentName(""); fetchConsentHistory();
      if (andSedate) setActiveTab("dosing");
    }
  }

  function deleteConsent(consentId) {
    setConfirmModal({
      title: "Delete Consent",
      message: "Are you sure you want to delete this consent record?",
      confirmText: "Yes, Delete",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        await supabase.from("consent_records").delete().eq("id", consentId);
        fetchConsentHistory();
        setConfirmModal(null);
      }
    });
  }

  async function saveAppointment() {
    if (!aptDate || !aptUserId) return setAlertMessage("Date and User are required");
    
    const combinedTime = (aptStartTime && aptEndTime) ? `${aptStartTime} - ${aptEndTime}` : (aptStartTime || aptEndTime || "");
    
    const payload = { user_id: aptUserId, date: aptDate, time_range: combinedTime, entry_type: aptType, client_id: patient?.client_id || null, patient_id: id, title: aptTitle, notes: aptNotes };
    if (isEditingApt) await supabase.from("diary_entries").update(payload).eq("id", editAptId);
    else await supabase.from("diary_entries").insert([payload]);
    resetAptForm(); fetchAppointments();
  }

  function deleteAppointment(aptId) {
    setConfirmModal({
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment?",
      confirmText: "Yes, Delete",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        await supabase.from("diary_entries").delete().eq("id", aptId);
        fetchAppointments();
        setConfirmModal(null);
      }
    });
  }

  function startEditApt(apt) {
    setIsEditingApt(true); setEditAptId(apt.id); setAptUserId(apt.user_id); setAptDate(apt.date); 
    
    const times = apt.time_range ? apt.time_range.split(" - ") : ["", ""];
    setAptStartTime(times[0] || "");
    setAptEndTime(times[1] || "");

    setAptType(apt.entry_type || "Consultation"); setAptTitle(apt.title || ""); setAptNotes(apt.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAptForm() { setIsEditingApt(false); setEditAptId(null); setAptStartTime(""); setAptEndTime(""); setAptType("Consultation"); setAptTitle(""); setAptNotes(""); }

  const currentSpeciesKey = editData.species?.toLowerCase().trim() || "";
  const activeBreeds = BREED_MAP[currentSpeciesKey] || [];

  const invoices = {};
  patientProcedures.forEach(p => {
     const invId = p.invoice_id || 'Legacy';
     if (!invoices[invId]) invoices[invId] = { id: invId, procedures: [], total: 0, due: 0, date: p.created_at };
     invoices[invId].procedures.push(p);
     invoices[invId].total += Number(p.price);
     if (!p.is_paid) invoices[invId].due += Number(p.price);
  });
  const invoiceList = Object.values(invoices).sort((a,b) => new Date(b.date) - new Date(a.date));

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Patient Data...</p>
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

      {/* Styled Parent Wrapper for Sub-Navigation Tabs */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        
        {/* Scrollable Container - Reverted to original layout with 40px side padding added */}
        <div className="patient-tabs-scrollbox" style={{ 
          display: "flex", 
          gap: "10px", 
          background: "white", 
          padding: "10px 40px", /* 10px top/bottom, 40px sides to perfectly clear arrows */
          borderRadius: "15px", 
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)", 
          overflowX: "auto", 
          whiteSpace: "nowrap"
        }}>
          {TABS.map(tab => (
            <button 
              key={tab.id} 
              style={{ 
                ...btnStyle, 
                padding: "10px 20px", 
                background: activeTab === tab.id ? '#5b8fb9' : 'transparent', 
                color: activeTab === tab.id ? 'white' : '#666' 
              }} 
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Left Arrow Indicator (Absolute Overlay) */}
        <div style={{
          position: "absolute",
          left: "0",
          top: "0",
          bottom: "0",
          width: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          background: "linear-gradient(270deg, rgba(255,255,255,0) 0%, white 80%)",
          borderRadius: "15px 0 0 15px",
          zIndex: 2
        }}>
           <span style={{ color: "#5b8fb9", fontWeight: "900", fontSize: "20px", animation: "chevronMoveLeft 1.2s infinite ease-in-out" }}>{"❮"}</span>
        </div>

        {/* Right Arrow Indicator (Absolute Overlay) */}
        <div style={{
          position: "absolute",
          right: "0",
          top: "0",
          bottom: "0",
          width: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, white 80%)",
          borderRadius: "0 15px 15px 0",
          zIndex: 2
        }}>
          <span style={{ color: "#5b8fb9", fontWeight: "900", fontSize: "20px", animation: "chevronMoveRight 1.2s infinite ease-in-out" }}>{"❯"}</span>
        </div>

        {/* Dynamic Styles (No media queries hiding arrows!) */}
        <style>{`
          .patient-tabs-scrollbox::-webkit-scrollbar {
            display: none;
          }
          .patient-tabs-scrollbox {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes chevronMoveRight {
            0% { transform: translateX(-2px); opacity: 0.4; }
            50% { transform: translateX(3px); opacity: 1; }
            100% { transform: translateX(-2px); opacity: 0.4; }
          }
          @keyframes chevronMoveLeft {
            0% { transform: translateX(2px); opacity: 0.4; }
            50% { transform: translateX(-3px); opacity: 1; }
            100% { transform: translateX(2px); opacity: 0.4; }
          }
        `}</style>
      </div>

      {/* ================= TAB 1: DETAILS ================= */}
      {activeTab === "details" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Patient Info</h3>
            {!editMode ? (
              <div style={{ display: "flex", gap: "8px" }}>
                {(!patient?.is_deceased || isAdmin) && (
                  <button onClick={toggleDeceased} style={{ background: patient?.is_deceased ? "#95a5a6" : "#e74c3c", color: "white", padding: "6px 10px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                    {patient?.is_deceased ? "Unmark Deceased" : "Mark Deceased"}
                  </button>
                )}
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

          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", color: "#5b8fb9" }}>Sedation Protocol</h4>
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

          <button onClick={saveDosing} style={{ ...btnStyle, width: "100%", background: "#27ae60", color: "white", marginTop: "20px" }}>
            Record Doses & Deduct from Stock
          </button>
          
          {sedationHistory.length > 0 && (
            <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "15px", marginTop: "30px", border: "1px solid #eee" }}>
              <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#2c3e50" }}>Dosing History</h3>
              {sedationHistory.map(h => (
                <div key={h.id} style={{ ...whiteShadowBox, marginBottom: "10px", padding: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "bold" }}>
                      {new Date(h.created_at).toLocaleString('en-GB')}
                    </span>
                    <span style={{ fontSize: "13px", color: "#3498db", fontWeight: "bold" }}>
                      Weight: {h.weight} kg
                    </span>
                  </div>
                  
                  {editingHistoryId === h.id ? (
                    <>
                      {editHistoryResults.map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: "5px", alignItems: "center", marginBottom: "8px", fontSize: "14px" }}>
                          <strong style={{ width: "110px", color: "#333", fontSize: "13px" }}>{r.label || r.drug}</strong>
                          <input type="number" step="0.01" style={{ width: "60px", padding: "6px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "13px" }} value={r.ml} onChange={e => { const u = [...editHistoryResults]; u[i].ml = e.target.value; setEditHistoryResults(u); }} /> <span style={{fontSize: "12px", color: "#666"}}>ml</span>
                          <span style={{color: "#666", fontSize: "12px", marginLeft: "5px"}}>waste:</span>
                          <input type="number" step="0.01" style={{ width: "60px", padding: "6px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "13px" }} value={r.waste} onChange={e => { const u = [...editHistoryResults]; u[i].waste = e.target.value; setEditHistoryResults(u); }} /> <span style={{fontSize: "12px", color: "#666"}}>ml</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <button style={{ background: "#27ae60", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }} onClick={() => saveEditHistory(h.id)}>Save Changes</button>
                        <button style={{ background: "#f39c12", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }} onClick={() => setEditingHistoryId(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {h.results?.map((r, idx) => (
                        <div key={idx} style={{ fontSize: "14px", color: "#333", marginBottom: "5px" }}>
                          <strong>{r.label || r.drug}</strong>: {r.ml} ml {r.waste > 0 ? <span style={{color: "#7f8c8d", fontSize: "12px"}}>(+ {r.waste} ml waste)</span> : ""}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <button onClick={() => startEditHistory(h)} style={{ background: "#5b8fb9", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Edit Details</button>
                        {isAdmin && (
                          <button onClick={() => {
                            setConfirmModal({
                              title: "Confirm Deletion",
                              message: "Are you sure you want to delete this dosing calculation? This will return all recorded drug volumes back into stock inventory.",
                              confirmText: "Yes, Delete",
                              confirmColor: "#e74c3c",
                              onConfirm: async () => {
                                const { data: original } = await supabase.from("sedation_records").select("*").eq("id", h.id).single();
                                if (original && original.results) {
                                  for (const r of original.results) {
                                    const totalToReturn = (parseFloat(r.ml) || 0) + (r.waste !== undefined ? parseFloat(r.waste) : 0);
                                    if (r.batchId && totalToReturn > 0) {
                                      const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", r.batchId).single();
                                      if (currentStock) await supabase.from("stock").update({ total_ml: currentStock.total_ml + totalToReturn }).eq("id", r.batchId);
                                    }
                                  }
                                }
                                await supabase.from("sedation_records").delete().eq("id", h.id);
                                fetchSedationHistory(); 
                                fetchStock();
                                setConfirmModal(null);
                              }
                            });
                          }} style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Delete Record</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PROCEDURES & INVOICES ================= */}
      {activeTab === "procedures" && (
        <>
          <div className="card">
            <h3 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>Start New Invoice</h3>

            <select value={selectedProductId} onChange={handleProductSelect} style={inputStyle}>
              <option value="">-- Select Initial Procedure --</option>
              {allProducts.map(p => <option key={p.id} value={p.id}>{p.name} (£{p.price})</option>)}
            </select>
            
            {selectedProductId && (
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="number" step="0.01" placeholder="Price (£)" value={procedurePrice} onChange={e => setProcedurePrice(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Optional Notes..." value={procedureNotes} onChange={e => setProcedureNotes(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
              </div>
            )}
            <button onClick={addProcedure} style={{ ...btnStyle, width: "100%", background: "#3498db", color: "white" }}>Create Invoice with Item</button>
          </div>

          <div style={{ marginTop: "20px" }}>
            {invoiceList.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No invoices yet.</p>}
            
            {invoiceList.map(inv => (
              <div 
                key={inv.id} 
                id={`invoice-${inv.id}`} 
                style={{ 
                  background: highlightedInvoice === inv.id ? "#fff9e6" : "#f8f9fb", 
                  border: highlightedInvoice === inv.id ? "2px solid #f39c12" : "1px solid transparent",
                  padding: "20px", 
                  borderRadius: "20px", 
                  marginBottom: "20px",
                  transition: "all 0.3s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Invoice</h3>
                    <div style={{ fontSize: "12px", color: "#7f8c8d", marginTop: "4px" }}>
                      Created: {new Date(inv.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "14px", color: "#7f8c8d" }}>Total: £{inv.total.toFixed(2)}</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: inv.due > 0 ? "#e74c3c" : "#27ae60", marginBottom: "5px" }}>
                      Due: £{inv.due.toFixed(2)}
                    </div>
                    {inv.total > 0 && inv.due > 0 && <button onClick={() => markInvoicePaid(inv.id)} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>Mark Paid</button>}
                    
                    {inv.total > 0 && inv.due === 0 && isAdmin && (
                      <button onClick={() => unmarkInvoicePaid(inv.id)} style={{ background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", width: "100%" }}>Unmark Invoice</button>
                    )}
                  </div>
                </div>
                
                {inv.procedures.map(proc => (
                  <div key={proc.id} style={{ background: proc.is_paid ? "#f0fdf4" : "white", padding: "12px", borderRadius: "12px", marginBottom: "8px", border: proc.is_paid ? "1px solid #bbf7d0" : "1px solid #eee", opacity: proc.is_paid ? 0.7 : 1 }}>
                    
                    {editingProcId === proc.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <strong style={{ fontSize: "15px", color: "#333" }}>{proc.product_name}</strong>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input type="number" step="0.01" value={editProcPrice} onChange={e => setEditProcPrice(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                          <input placeholder="Notes..." value={editProcNotes} onChange={e => setEditProcNotes(e.target.value)} style={{ flex: 2, padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => saveEditProcedure(proc.id)} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Save</button>
                          <button onClick={() => setEditingProcId(null)} style={{ background: "#f39c12", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ display: "block", fontSize: "15px", textDecoration: proc.is_paid ? "line-through" : "none" }}>{proc.product_name}</strong>
                          {proc.notes && <span style={{ color: "#7f8c8d", fontSize: "13px" }}>{proc.notes}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "15px" }}>£{Number(proc.price).toFixed(2)}</strong>
                          <button onClick={() => startEditProcedure(proc)} style={{ background: "#5b8fb9", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Edit</button>
                          <button onClick={() => {
                            setConfirmModal({
                              title: "Confirm Deletion",
                              message: `Are you sure you want to remove ${proc.product_name} from this invoice?`,
                              confirmText: "Yes, Delete",
                              confirmColor: "#e74c3c",
                              onConfirm: async () => {
                                await supabase.from("patient_procedures").delete().eq("id", proc.id);
                                fetchProcedures();
                                setConfirmModal(null);
                              }
                            });
                          }} style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>X</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {addingToInvId === inv.id ? (
                  <div style={{ marginTop: "10px", padding: "12px", background: "white", borderRadius: "12px", border: "2px dashed #bdc3c7" }}>
                    <strong style={{ display: "block", marginBottom: "10px", fontSize: "14px", color: "#2c3e50" }}>Add Item to this Invoice</strong>
                    <select value={inlineProdId} onChange={e => {
                        setInlineProdId(e.target.value);
                        const p = allProducts.find(x => String(x.id) === String(e.target.value));
                        if(p) setInlinePrice(p.price);
                    }} style={inputStyle}>
                      <option value="">-- Select Product --</option>
                      {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {inlineProdId && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input type="number" step="0.01" placeholder="Price (£)" value={inlinePrice} onChange={e=>setInlinePrice(e.target.value)} style={{...inputStyle, flex: 1, marginBottom: "10px"}} />
                        <input placeholder="Notes" value={inlineNotes} onChange={e=>setInlineNotes(e.target.value)} style={{...inputStyle, flex: 2, marginBottom: "10px"}} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => saveInlineProcedure(inv.id)} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "6px", padding: "8px 15px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Save Item</button>
                      <button onClick={() => { setAddingToInvId(null); setInlineProdId(""); }} style={{ background: "#f39c12", color: "white", border: "none", borderRadius: "6px", padding: "8px 15px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingToInvId(inv.id)} style={{ marginTop: "10px", background: "none", border: "2px dashed #bdc3c7", color: "#7f8c8d", width: "100%", padding: "10px", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
                    + Add Item to this Invoice
                  </button>
                )}

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
            <div style={{ fontSize: "14px", marginBottom: "15px", background: "#fdf3f2", borderLeft: "4px solid #e74c3c", padding: "15px", borderRadius: "5px", lineHeight: "1.5" }}>
              <p style={{ marginTop: 0 }}>I certify that I am the owner or the authorised agent of the owner of the above-described animal, and I have the legal authority to consent to its euthanasia. I authorize the veterinary team to humanely end the animal's life.</p>
              <p>I confirm that, to the best of my knowledge, this animal has not bitten any person or animal in the last 15 days, nor has it been exposed to rabies.</p>
              <strong style={{ display: "block", marginTop: "10px", color: "#c0392b" }}>Liability Release</strong>
              <p style={{ marginBottom: 0 }}>I hereby release the veterinary practice, the attending veterinary surgeon, and staff from any and all liability related to the performance of this euthanasia.</p>
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
          <div className="card" style={{ border: isEditingApt ? "2px solid #f39c12" : "none" }}>
            <h3 style={{ marginTop: 0 }}>{isEditingApt ? "Edit Appointment" : "Schedule Appointment"}</h3>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="date" value={aptDate} onChange={e => setAptDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              
              <div style={{ display: "flex", gap: "5px", flex: 1 }}>
                <input type="time" value={aptStartTime} onChange={e => setAptStartTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <span style={{ display: "flex", alignItems: "center", marginBottom: "10px", fontWeight: "bold", color: "#95a5a6" }}>-</span>
                <input type="time" value={aptEndTime} onChange={e => setAptEndTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <select value={aptType} onChange={e => setAptType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="Working Status">Working Status</option>
                <option value="Euthanasia">Euthanasia</option>
                <option value="Consultation">Consultation</option>
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

      {/* ================= GENERIC ALERT MODAL ================= */}
      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setAlertMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>⚠️ Notice</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {alertMessage}
            </p>
            <button onClick={() => setAlertMessage("")} style={{ width: "100%", background: "#3498db", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>OK</button>
          </div>
        </div>
      )}

      {/* ================= GENERIC CONFIRM MODAL ================= */}
      {confirmModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: confirmModal.confirmColor || "#e74c3c", marginTop: 0 }}>⚠️ {confirmModal.title}</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, background: confirmModal.confirmColor || "#e74c3c", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>{confirmModal.confirmText || "Confirm"}</button>
              <button onClick={() => setConfirmModal(null)} style={{ flex: 1, background: "#95a5a6", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONSENT POP-UP MODAL ================= */}
      {showConsentPrompt && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Consent Required</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "20px", lineHeight: "1.5" }}>A signed Euthanasia Consent form must be completed before this procedure can be added to the invoice.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setShowConsentPrompt(false); setActiveTab("consent"); window.scrollTo(0,0); }} style={{ ...btnStyle, flex: 1, background: "#3498db", color: "white" }}>Go to Form</button>
              <button onClick={() => setShowConsentPrompt(false)} style={{ ...btnStyle, flex: 1, background: "#95a5a6", color: "white" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const TABS = [
  { id: "details", label: "Details" },
  { id: "dosing", label: "Dosing Calc" },
  { id: "procedures", label: "Procedures" },
  { id: "consent", label: "Consent" },
  { id: "appointments", label: "Appointments" },
  { id: "files", label: "Files" },
  { id: "emails", label: "Emails/SMS" }
];