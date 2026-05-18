// PatientDetail.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import SignatureCanvas from "react-signature-canvas";
import Loader from "../Loader"; 
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- STYLING CONSTANTS ---
const btnStyle = { padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }; // Main toolbar tab style
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };

// Strict uniform button properties copied from Admin Dashboard layout
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };

const blueBtn   = { background: "#5b8fb9", color: "white", ...standardBtnProps };
const redBtn    = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn  = { background: "#27ae60", color: "white", ...standardBtnProps };
const yellowBtn = { background: "#f39c12", color: "white", ...standardBtnProps };
const greyBtn   = { background: "#95a5a6", color: "white", ...standardBtnProps };

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
  pentobarbital: ["pent", "pentobarbital", "euth", "euthanasia"]
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

  // Tab 6: Files
  const [patientFiles, setPatientFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Tab 7: Emails
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      await Promise.all([
        checkAdmin(), fetchPatient(), fetchConsentHistory(), fetchProducts(),
        fetchProcedures(), fetchAppointments(), fetchProtocols(), fetchStock(), fetchSedationHistory(),
        fetchFiles(), fetchTemplates()
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
    const { data } = await supabase.from("patients").select("*, clients(*)").eq("id", id).single();
    if (data) { setPatient(data); setEditData(data); }
  }

  // --- FILE HANDLING ---
  async function fetchFiles() {
    const { data, error } = await supabase.storage.from("patient_documents").list(id);
    if (data) setPatientFiles(data);
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient_documents").upload(filePath, file);
    
    setIsUploading(false);
    if (error) {
      setAlertMessage("Failed to upload file: " + error.message);
    } else {
      setAlertMessage("File uploaded successfully!");
      fetchFiles();
    }
  }

  async function viewFile(fileName) {
    const { data } = await supabase.storage.from("patient_documents").getPublicUrl(`${id}/${fileName}`);
    if (data?.publicUrl) window.open(data.publicUrl, "_blank");
  }

  function deleteFile(fileName) {
    setConfirmModal({
      title: "Delete File?",
      message: `Are you sure you want to delete ${fileName}?`,
      confirmText: "Yes, Delete",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        await supabase.storage.from("patient_documents").remove([`${id}/${fileName}`]);
        fetchFiles();
        setConfirmModal(null);
      }
    });
  }

  // --- EMAIL HANDLING ---
  async function fetchTemplates() {
    const { data } = await supabase.from("email_templates").select("*").order("name");
    setEmailTemplates(data || []);
  }

  function handleTemplateSelect(e) {
    const tmplId = e.target.value;
    setSelectedTemplate(tmplId);
    
    if (!tmplId) {
      setEmailSubject("");
      setEmailBody("");
      return;
    }

    const tmpl = emailTemplates.find(t => String(t.id) === String(tmplId));
    if (!tmpl) return;

    const cName = patient?.clients?.name || "Client";
    const pName = patient?.name || "your pet";
    
    setEmailSubject(tmpl.subject.replace(/{patient_name}/g, pName).replace(/{client_name}/g, cName));
    setEmailBody(tmpl.body.replace(/{patient_name}/g, pName).replace(/{client_name}/g, cName));
  }

  function sendEmail() {
    const clientEmail = patient?.clients?.email;
    if (!clientEmail) {
      return setAlertMessage("This client does not have an email address saved. Please update their profile in the Clients tab.");
    }
    const mailtoLink = `mailto:${clientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
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

  function downloadSpecificInvoice(inv) {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80); 
      doc.setFont("helvetica", "bold");
      doc.text("SP Home Euthanasia", 14, 22);
      doc.setFontSize(14);
      doc.setTextColor(127, 140, 141); 
      doc.setFont("helvetica", "normal");
      doc.text("Invoice", 14, 30);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${new Date(inv.date).toLocaleDateString('en-GB')}`, 14, 40);
      doc.text(`Client: ${patient?.clients?.name || ""} ${patient?.clients?.surname || ""}`, 14, 46);
      doc.text(`Patient: ${patient?.name || ""}`, 14, 52);

      const procCols = ["Item / Procedure", "Notes", "Price"];
      const procRows = inv.procedures.map(p => [
        p.product_name, 
        p.notes || "", 
        `£${Number(p.price).toFixed(2)}`
      ]);
      
      autoTable(doc, { head: [procCols], body: procRows, startY: 60 });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.text(`Total: £${inv.total.toFixed(2)}`, 14, finalY);
      doc.setTextColor(inv.due > 0 ? 231 : 39, inv.due > 0 ? 76 : 174, inv.due > 0 ? 60 : 96); 
      doc.text(`Amount Due: £${inv.due.toFixed(2)}`, 14, finalY + 8);

      doc.save(`Invoice_${patient?.name || "Patient"}_${new Date(inv.date).toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating specific invoice.");
    }
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

      {/* ================= SUB-NAVIGATION TABS WITH DIRECTIONAL ARROWS WITHIN FRAME ================= */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", background: "white", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "0 10px" }}>
        <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none" }}>&lt;</span>
        <div className="patient-tabs-scrollbox" style={{ 
          display: "flex", 
          gap: "10px", 
          flex: 1,
          padding: "10px 0", 
          overflowX: "auto", 
          whiteSpace: "nowrap" 
        }}>
          {TABS.map(tab => (
            <button 
              key={tab.id} 
              style={{ 
                ...btnStyle, 
                padding: "12px 20px", 
                background: 'transparent', 
                color: activeTab === tab.id ? '#5b8fb9' : '#7f8c8d', 
                borderBottom: activeTab === tab.id ? '3px solid #5b8fb9' : '3px solid transparent',
                borderRadius: "0",
                transition: "all 0.2s ease"
              }} 
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingLeft: "5px", userSelect: "none" }}>&gt;</span>
      </div>

      <style>{`
        .patient-tabs-scrollbox::-webkit-scrollbar {
          display: none;
        }
        .patient-tabs-scrollbox {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ================= TAB 1: DETAILS ================= */}
      {activeTab === "details" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Patient Info</h3>
            {!editMode ? (
              <div style={{ display: "flex", gap: "8px" }}>
                {(!patient?.is_deceased || isAdmin) && (
                  <button onClick={toggleDeceased} style={patient?.is_deceased ? greyBtn : redBtn}>
                    {patient?.is_deceased ? "Unmark Deceased" : "Mark Deceased"}
                  </button>
                )}
                <button onClick={() => setEditMode(true)} style={blueBtn}>
                  Edit
                </button>
              </div>
            ) : (
              <button onClick={() => { setEditMode(false); fetchPatient(); }} style={yellowBtn}>Cancel</button>
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
              
              <button onClick={updatePatient} style={greenBtn}>Save Changes</button>
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

          <button onClick={saveDosing} style={greenBtn}>
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
                        <button style={greenBtn} onClick={() => saveEditHistory(h.id)}>Save Changes</button>
                        <button style={yellowBtn} onClick={() => setEditingHistoryId(null)}>Cancel</button>
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
                        <button onClick={() => startEditHistory(h)} style={blueBtn}>Edit Details</button>
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
                          }} style={redBtn}>Delete Record</button>
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
            <button onClick={addProcedure} style={blueBtn}>Create Invoice with Item</button>
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
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                    <div style={{ fontSize: "14px", color: "#7f8c8d" }}>Total: £{inv.total.toFixed(2)}</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: inv.due > 0 ? "#e74c3c" : "#27ae60", marginBottom: "5px" }}>
                      Due: £{inv.due.toFixed(2)}
                    </div>

                    <button onClick={() => downloadSpecificInvoice(inv)} style={blueBtn}>
                      Download Invoice PDF
                    </button>

                    {inv.total > 0 && inv.due > 0 && <button onClick={() => markInvoicePaid(inv.id)} style={greenBtn}>Mark Paid</button>}
                    
                    {inv.total > 0 && inv.due === 0 && isAdmin && (
                      <button onClick={() => unmarkInvoicePaid(inv.id)} style={greyBtn}>Unmark Invoice</button>
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
                          <button onClick={() => saveEditProcedure(proc.id)} style={greenBtn}>Save</button>
                          <button onClick={() => setEditingProcId(null)} style={yellowBtn}>Cancel</button>
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
                          <button onClick={() => startEditProcedure(proc)} style={{ ...blueBtn, minWidth: "60px" }}>Edit</button>
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
                          }} style={{ ...redBtn, minWidth: "40px" }}>X</button>
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
                      <button onClick={() => saveInlineProcedure(inv.id)} style={greenBtn}>Save Item</button>
                      <button onClick={() => { setAddingToInvId(null); setInlineProdId(""); }} style={yellowBtn}>Cancel</button>
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
              <strong style={{ display: "block", marginTop: "10px", color: "#c0392b" }}>Owner/Authorised Agent Declaration and Consent</strong>
              <p style={{ marginTop: 0 }}>I certify that I am the owner or the authorised agent of the owner of the above-described animal, and I have the legal authority to consent to its euthanasia. I authorize the veterinary team to humanely end the animal's life.</p>
              <p>I confirm that, to the best of my knowledge, this animal has not bitten any person or animal in the last 15 days, nor has it been exposed to rabies.</p>
              <strong style={{ display: "block", marginTop: "10px", color: "#c0392b" }}>Liability Release</strong>
              <p style={{ marginBottom: 0 }}>I hereby release the veterinary practice, the attending veterinary surgeon, and staff from any and all liability related to the performance of this euthanasia.</p>
            </div>
            <input placeholder="Signatory Full Name" value={consentName} onChange={(e) => setConsentName(e.target.value)} style={inputStyle} />
            <div style={{ border: "1px solid #ccc", borderRadius: "10px", marginTop: "10px", background: "white" }}>
              <SignatureCanvas penColor="black" canvasProps={{ width: 300, height: 150, className: "sigCanvas" }} ref={sigPadRef} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px", justifyContent: "center" }}>
              <button onClick={() => sigPadRef.current.clear()} style={greyBtn}>Clear</button>
              <button onClick={() => saveConsent(false)} style={blueBtn}>Save</button>
              <button onClick={() => saveConsent(true)} style={greenBtn}>Save & Sedate</button>
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
                  <button style={{ ...redBtn, marginTop: "15px" }} onClick={() => deleteConsent(c.id)}>Delete</button>
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
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "center" }}>
              <button onClick={saveAppointment} style={greenBtn}>
                {isEditingApt ? "Update Appointment" : "Add to Diary"}
              </button>
              {isEditingApt && <button onClick={resetAptForm} style={redBtn}>Cancel</button>}
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
                        <button onClick={() => startEditApt(apt)} style={blueBtn}>Edit</button>
                        <button onClick={() => deleteAppointment(apt.id)} style={redBtn}>Delete</button>
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
        <>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Upload Document</h3>
            <p style={{ fontSize: "14px", color: "#7f8c8d", marginTop: 0, marginBottom: "15px" }}>
              Upload PDFs, images, or records related to this patient.
            </p>
            
            <label 
              htmlFor="patient-file-upload" 
              style={{ 
                ...blueBtn, 
                display: "inline-block", 
                textAlign: "center",
                width: "100%", 
                marginBottom: isUploading ? "10px" : "15px",
                opacity: isUploading ? 0.7 : 1
              }}
            >
              {isUploading ? "Uploading..." : "Click to Select File or Image to Upload"}
            </label>

            <input 
              id="patient-file-upload"
              type="file" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              style={{ display: "none" }} 
            />
            {isUploading && <div style={{ color: "#3498db", fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>Uploading...</div>}
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Attached Files</h3>
            {patientFiles.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No files uploaded yet.</p>}
            
            {patientFiles.map(file => {
              const displayName = file.name.split('_').slice(1).join('_') || file.name; 
              
              return (
                <div key={file.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "10px" }}>
                    <strong style={{ fontSize: "14px", color: "#2c3e50" }}>{displayName}</strong>
                    <div style={{ fontSize: "12px", color: "#7f8c8d", marginTop: "4px" }}>
                      {(file.metadata?.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => viewFile(file.name)} style={blueBtn}>View</button>
                    {isAdmin && (
                      <button onClick={() => deleteFile(file.name)} style={redBtn}>Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= TAB 7: EMAILS ================= */}
      {activeTab === "emails" && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Email Client</h3>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "14px", fontWeight: "bold", color: "#2c3e50", display: "block", marginBottom: "5px" }}>Client Email Address:</label>
            <div style={{ padding: "10px", background: "#f8f9fb", border: "1px solid #ccc", borderRadius: "8px", color: patient?.clients?.email ? "#2c3e50" : "#e74c3c", fontWeight: patient?.clients?.email ? "normal" : "bold" }}>
              {patient?.clients?.email || "No email on file. Update Client Details first."}
            </div>
          </div>

          <label style={{ fontSize: "14px", fontWeight: "bold", color: "#2c3e50", display: "block", marginBottom: "5px" }}>Choose Template:</label>
          <select value={selectedTemplate} onChange={handleTemplateSelect} style={inputStyle}>
            <option value="">-- Start Blank or Select Template --</option>
            {emailTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <label style={{ fontSize: "14px", fontWeight: "bold", color: "#2c3e50", display: "block", marginBottom: "5px", marginTop: "10px" }}>Subject:</label>
          <input 
            value={emailSubject} 
            onChange={(e) => setEmailSubject(e.target.value)} 
            placeholder="Email Subject" 
            style={inputStyle} 
          />

          <label style={{ fontSize: "14px", fontWeight: "bold", color: "#2c3e50", display: "block", marginBottom: "5px", marginTop: "10px" }}>Message Body:</label>
          <textarea 
            rows={8} 
            value={emailBody} 
            onChange={(e) => setEmailBody(e.target.value)} 
            placeholder="Type your message here..." 
            style={{ ...inputStyle, fontFamily: "inherit" }} 
          />

          <button onClick={sendEmail} style={{ ...blueBtn, width: "100%" }}>
            Open Draft in Default Mail App
          </button>
          <p style={{ fontSize: "12px", color: "#7f8c8d", textAlign: "center", marginTop: "10px" }}>
            This will open your device's default email client (e.g., Outlook, Apple Mail) so you can review the message before sending.
          </p>
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
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
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
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmModal.onConfirm} style={{ ...standardBtnProps, background: confirmModal.confirmColor || "#e74c3c", color: "white" }}>{confirmModal.confirmText || "Confirm"}</button>
              <button onClick={() => setConfirmModal(null)} style={greyBtn}>Cancel</button>
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
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => { setShowConsentPrompt(false); setActiveTab("consent"); window.scrollTo(0,0); }} style={blueBtn}>Go to Form</button>
              <button onClick={() => setShowConsentPrompt(false)} style={greyBtn}>Cancel</button>
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