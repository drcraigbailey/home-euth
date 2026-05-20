// AdminDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader"; 
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- CAPACITOR IMPORTS FOR NATIVE PDF SHARING ---
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// --- STYLING CONSTANTS ---
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const statCard = { flex: 1, background: "white", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee", textAlign: "center", minWidth: "140px", cursor: "pointer", transition: "transform 0.1s" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };

// Dedicated pristine style for the main navigation toolbar tabs
const tabBtnStyle = { padding: "12px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };

// Enforced compact layout properties for smaller, uniform action buttons
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };

// Overview-matched color variations for modal action buttons
const purpleBtn = { ...standardBtnProps, background: "#8e44ad", color: "white" }; 
const blueBtn   = { ...standardBtnProps, background: "#5b8fb9", color: "white" }; 
const greyBtn   = { ...standardBtnProps, background: "#95a5a6", color: "white" }; 
const greenBtn  = { ...standardBtnProps, background: "#27ae60", color: "white" }; 
const yellowBtn = { ...standardBtnProps, background: "#f39c12", color: "white" }; 
const redBtn    = { ...standardBtnProps, background: "#e74c3c", color: "white" };
const invoiceViewBtn = { ...blueBtn, width: "92px", minWidth: "92px", maxWidth: "92px", height: "34px", minHeight: "34px", padding: "7px 9px", fontSize: "12px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", whiteSpace: "nowrap" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); 
  const [currentUserId, setCurrentUserId] = useState(null);

  const [totalSales, setTotalSales] = useState(0);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]); 
  
  const [allClientsList, setAllClientsList] = useState([]);
  const [allPatientsList, setAllPatientsList] = useState([]);
  const [allSedationsList, setAllSedationsList] = useState([]);
  const [allConsentsList, setAllConsentsList] = useState([]);
  
  const [selectedPatientForReport, setSelectedPatientForReport] = useState("");

  const [statModalMode, setStatModalMode] = useState(null); 
  const [statSearch, setStatSearch] = useState("");

  const [alertMessage, setAlertMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  const [productToDelete, setProductToDelete] = useState(null);
  const [stockToDelete, setStockToDelete] = useState(null);
  const [stockToArchive, setStockToArchive] = useState(null);
  const [protocolToDelete, setProtocolToDelete] = useState(null);

  // Staff Management State
  const [profiles, setProfiles] = useState([]);
  const [showAddStaffInfo, setShowAddStaffInfo] = useState(false);

  // Drug Log Editing & Archiving State
  const [editingDrugLogId, setEditingDrugLogId] = useState(null);
  const [editDrugLogResults, setEditDrugLogResults] = useState([]);
  const [logSearch, setLogSearch] = useState("");
  const [showArchivedLogs, setShowArchivedLogs] = useState(false);
  const [logToArchive, setLogToArchive] = useState(null);
  
  // Custom Unarchive Modal State
  const [unarchiveModalLog, setUnarchiveModalLog] = useState(null);
  const [unarchivePassword, setUnarchivePassword] = useState("");

  // Products
  const [productsList, setProductsList] = useState([]);
  const [isEditingProd, setIsEditingProd] = useState(false);
  const [editProdId, setEditProdId] = useState(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");

  // Stock
  const [stockList, setStockList] = useState([]);
  const [stockDrugName, setStockDrugName] = useState("");
  const [stockBatch, setStockBatch] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockExp, setStockExp] = useState("");
  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockData, setEditStockData] = useState({});

  // Protocols
  const [protocolsList, setProtocolsList] = useState([]);
  const [protoSearch, setProtoSearch] = useState("");
  const [protoName, setProtoName] = useState("");
  const [protoSpecies, setProtoSpecies] = useState("");
  const [editingProtoId, setEditingProtoId] = useState(null);
  const [protoDrugs, setProtoDrugs] = useState([]);
  const [protoDrugName, setProtoDrugName] = useState("");
  const [protoMgKg, setProtoMgKg] = useState("");
  const [protoMgMl, setProtoMgMl] = useState("");

  // Templates
  const [templatesList, setTemplatesList] = useState([]);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState(null);

  // Bookkeeping & Expenses State
  const [expensesList, setExpensesList] = useState([]);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Stock / Inventory");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expReceiptFile, setExpReceiptFile] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  async function checkAdminAndFetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (profile?.is_admin) {
        setIsAdmin(true);
        await Promise.all([
          fetchReports(), fetchProducts(), fetchStock(), fetchProtocols(), fetchTemplates(), fetchProfiles(), fetchExpenses()
        ]);
      } else navigate("/"); 
    }
    setLoading(false);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("*").order("email");
    setProfiles(data || []);
  }

  async function fetchExpenses() {
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    setExpensesList(data || []);
  }

  async function fetchReports() {
    const { data: procedures } = await supabase.from("patient_procedures").select("*, patients(name, clients(id, name, surname, phone))");
    if (procedures) {
      let sales = 0; let outstanding = 0; const groupedInvoices = {};
      procedures.forEach(proc => {
        sales += Number(proc.price);
        if (!proc.is_paid) { 
            outstanding += Number(proc.price); 
            const invId = proc.invoice_id || proc.id; 
            if (!groupedInvoices[invId]) {
              groupedInvoices[invId] = {
                id: invId,
                patientId: proc.patient_id,
                patientName: proc.patients?.name,
                client: proc.patients?.clients,
                date: proc.created_at,
                total: 0,
                items: []
              };
            }
            groupedInvoices[invId].total += Number(proc.price);
            groupedInvoices[invId].items.push(proc.product_name);
        }
      });
      setTotalSales(sales); setOutstandingTotal(outstanding); setOutstandingInvoices(Object.values(groupedInvoices).sort((a,b) => new Date(b.date) - new Date(a.date)));
    }

    const { data: clientsData } = await supabase.from("clients").select("*");
    if (clientsData) setAllClientsList(clientsData);

    const { data: patientsData } = await supabase.from("patients").select("*, clients(*)").order("name");
    if (patientsData) setAllPatientsList(patientsData);

    const { data: sedationData } = await supabase
      .from("sedation_records")
      .select("*, patients(name, species, clients(name, surname))")
      .order("created_at", { ascending: false });
    if (sedationData) setAllSedationsList(sedationData);

    const { data: consentData } = await supabase.from("consent_records").select("*, patients(name)");
    if (consentData) setAllConsentsList(consentData);
  }

  async function fetchProducts() { const { data } = await supabase.from("products").select("*").order("name", { ascending: true }); setProductsList(data || []); }
  async function fetchStock() { const { data } = await supabase.from("stock").select("*"); setStockList(data || []); }
  async function fetchProtocols() { const { data } = await supabase.from("protocols").select("*, protocol_drugs (*)").order("name"); setProtocolsList(data || []); }
  async function fetchTemplates() { const { data } = await supabase.from("email_templates").select("*").order("name", { ascending: true }); setTemplatesList(data || []); }

  function resolveBatchName(batchId) {
    if (!batchId) return "N/A";
    const s = stockList.find(x => String(x.id) === String(batchId));
    return s ? s.batch : batchId;
  }

  function drawReportHeader(doc, subtitle) {
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80); 
    doc.setFont("helvetica", "bold");
    doc.text("SP Home Euthanasia", 14, 22);

    doc.setFontSize(14);
    doc.setTextColor(127, 140, 141); 
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 30);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 36);

    doc.setTextColor(0, 0, 0);

    return 45; 
  }

  async function generateCDReport() {
    try {
      const doc = new jsPDF('landscape'); 
      let yPos = drawReportHeader(doc, "VMD / RCVS Controlled Drugs Register");
      
      const cols = ["Date", "Client", "Patient", "Species", "Weight", "Drug Administrations"];
      const rows = [];
      
      allSedationsList.filter(r => !r.is_archived).forEach(record => {
        const clientName = record.patients?.clients ? `${record.patients.clients.name} ${record.patients.clients.surname}` : "Deleted Client Record";
        const patientName = record.patients?.name || "Deleted Patient Record";
        const species = record.patients?.species || "N/A";
        const date = new Date(record.created_at).toLocaleDateString('en-GB');
        
        const drugs = (record.results || []).map(r => {
          const bName = r.batchName ? r.batchName : resolveBatchName(r.batchId);
          return `${r.label || r.drug}: ${r.ml}ml ${r.waste > 0 ? `(+${r.waste}ml waste)` : ''} [Batch: ${bName}]`;
        }).join('\n');

        rows.push([
          date,
          clientName,
          patientName,
          species,
          `${record.weight} kg`,
          drugs
        ]);
      });
      
      autoTable(doc, { 
        head: [cols], 
        body: rows, 
        startY: yPos,
        styles: { fontSize: 9, valign: 'middle' },
        bodyStyles: { minCellHeight: 15 },
        columnStyles: { 5: { cellWidth: 80 } }
      });
      
      const fileName = `VMD_Controlled_Drugs_Register_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        doc.save(fileName);
      }
    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating PDF. Check console for details.");
    }
  }

  async function generateStockReport() {
    try {
      const doc = new jsPDF();
      const startY = drawReportHeader(doc, "Master Inventory Stock Report");
      
      const tableColumn = ["Drug Name", "Batch Number", "Remaining (ml)", "Expiry Date", "Status"];
      const tableRows = [];
      
      stockList.forEach(s => {
        tableRows.push([
          s.drug, 
          s.batch, 
          `${s.total_ml} ml`, 
          s.expiry_date ? new Date(s.expiry_date).toLocaleDateString('en-GB') : "N/A", 
          s.is_archived ? "Archived" : "Active"
        ]);
      });
      
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: startY });
      
      const fileName = `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        doc.save(fileName);
      }

    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating PDF. Check console for details.");
    }
  }

  async function generateInvoiceReport() {
    try {
      const { data: procs } = await supabase.from("patient_procedures").select("*, patients(name, clients(name, surname))").order("created_at", { ascending: false });
      
      const doc = new jsPDF();
      const startY = drawReportHeader(doc, "Financial & Invoice Report");
      
      const cols = ["Date", "Client", "Patient", "Procedure/Item", "Price", "Status"];
      const rows = (procs || []).map(p => [
        new Date(p.created_at).toLocaleDateString('en-GB'),
        p.patients?.clients ? `${p.patients.clients.name} ${p.patients.clients.surname}` : "Unknown",
        p.patients?.name || "Unknown",
        p.product_name,
        `£${Number(p.price).toFixed(2)}`,
        p.is_paid ? "Paid" : "Unpaid"
      ]);
      
      autoTable(doc, { head: [cols], body: rows, startY: startY });
      
      const fileName = `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        doc.save(fileName);
      }

    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating PDF. Check console for details.");
    }
  }

async function generatePatientReport() {
    try {
      if (!selectedPatientForReport) return setAlertMessage("Please select a patient from the dropdown first.");
      const patient = allPatientsList.find(p => String(p.id) === String(selectedPatientForReport));
      if (!patient) return;

      const { data: procs } = await supabase.from("patient_procedures").select("*").eq("patient_id", patient.id).order("created_at");
      const { data: seds } = await supabase.from("sedation_records").select("*").eq("patient_id", patient.id).order("created_at");

      const doc = new jsPDF();
      let yPos = drawReportHeader(doc, `Patient History: ${patient.name}`);

      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("Client Details", 14, yPos); yPos += 6;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); 
      const client = patient.clients || {};
      doc.text(`Name: ${client.name || ""} ${client.surname || "Unknown"}`, 14, yPos); yPos += 5;
      doc.text(`Phone: ${client.phone || "N/A"}`, 14, yPos); yPos += 5;
      doc.text(`Email: ${client.email || "N/A"}`, 14, yPos); yPos += 5;
      const addr = [client.address, client.city, client.postcode].filter(Boolean).join(", ");
      doc.text(`Address: ${addr || "N/A"}`, 14, yPos); yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Details", 14, yPos); yPos += 6;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${patient.name}`, 14, yPos); yPos += 5;
      doc.text(`Species: ${patient.species || "N/A"}   |   Breed: ${patient.breed || "N/A"}`, 14, yPos); yPos += 5;
      doc.text(`Weight: ${patient.weight ? patient.weight + ' kg' : "N/A"}   |   Age: ${patient.age_years || 0}y ${patient.age_months || 0}m`, 14, yPos); yPos += 5;
      doc.text(`Status: ${patient.is_deceased ? "Deceased" : "Alive"}`, 14, yPos); yPos += 12;

      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("Clinical Procedures & Invoicing", 14, yPos);
      yPos += 5;
      const procCols = ["Date", "Item / Procedure", "Notes", "Price", "Status"];
      const procRows = (procs || []).map(p => [
        new Date(p.created_at).toLocaleDateString('en-GB'), 
        p.product_name, 
        p.notes || "", 
        `£${Number(p.price).toFixed(2)}`, 
        p.is_paid ? "Paid" : "Unpaid"
      ]);
      
      autoTable(doc, { head: [procCols], body: procRows, startY: yPos });
      
      yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 30;

      doc.setFontSize(14);
      doc.text("Sedation & Dosing History", 14, yPos);
      yPos += 5;
      const sedCols = ["Date", "Weight at time", "Drugs Administered"];
      const sedRows = (seds || []).map(s => {
         const drugs = (s.results || []).map(r => `${r.label}: ${r.ml}ml`).join(", ");
         return [new Date(s.created_at).toLocaleDateString('en-GB'), `${s.weight} kg`, drugs];
      });
      
      autoTable(doc, { head: [sedCols], body: sedRows, startY: yPos });
      
      const fileName = `Patient_History_${patient.name.replace(/\s+/g, '_')}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        doc.save(fileName);
      }

    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating PDF. Check console for details.");
    }
  }

  // --- NEW BOOKKEEPING REPORT ---
  async function generateBookkeepingReport() {
    try {
      const doc = new jsPDF();
      const startY = drawReportHeader(doc, "Financial & Bookkeeping Report");
      
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("Profit & Loss Summary", 14, startY);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      const totalExp = expensesList.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const netProfit = totalSales - totalExp;

      doc.text(`Total Billed Revenue: £${totalSales.toFixed(2)}`, 14, startY + 8);
      doc.text(`Total Outgoing Expenses: £${totalExp.toFixed(2)}`, 14, startY + 14);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(netProfit >= 0 ? 39 : 231, netProfit >= 0 ? 174 : 76, netProfit >= 0 ? 96 : 60); 
      doc.text(`Estimated Net Profit: £${netProfit.toFixed(2)}`, 14, startY + 22);

      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("Expense Records", 14, startY + 35);

      const cols = ["Date", "Description", "Category", "Amount"];
      const rows = expensesList.map(e => [
        new Date(e.date).toLocaleDateString('en-GB'),
        e.description,
        e.category,
        `£${Number(e.amount).toFixed(2)}`
      ]);

      autoTable(doc, { head: [cols], body: rows, startY: startY + 40 });

      const fileName = `Bookkeeping_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        doc.save(fileName);
      }
    } catch (error) {
      console.error(error);
      setAlertMessage("Error generating PDF. Check console for details.");
    }
  }

  // --- CSV ACCOUNTANT EXPORT ---
  async function exportExpensesCSV() {
    try {
      const headers = ["Date", "Description", "Category", "Amount (£)", "Receipt URL"];
      const rows = expensesList.map(e => [
        new Date(e.date).toLocaleDateString('en-GB'),
        `"${e.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
        `"${e.category}"`,
        e.amount,
        e.receipt_url ? `"${e.receipt_url}"` : "None"
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const fileName = `Bookkeeping_Export_${new Date().toISOString().split('T')[0]}.csv`;

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: "utf8"
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error(error);
      setAlertMessage("Error exporting CSV data.");
    }
  }

  // --- DRUG LOG ACTIONS ---

  function startEditDrugLog(log) {
    setEditingDrugLogId(log.id);
    setEditDrugLogResults((log.results || []).map(r => ({ ...r, waste: r.waste !== undefined ? r.waste : 0.05 })));
  }

  async function saveEditDrugLog(logId) {
    const originalLog = allSedationsList.find(s => s.id === logId);
    if (originalLog) {
      for (let i = 0; i < editDrugLogResults.length; i++) {
        const oldR = originalLog.results[i]; 
        const newR = editDrugLogResults[i];
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
    const finalResults = editDrugLogResults.map(r => ({ ...r, ml: parseFloat(r.ml) || 0, waste: r.waste !== "" ? parseFloat(r.waste) : 0 }));
    await supabase.from("sedation_records").update({ results: finalResults }).eq("id", logId);
    setEditingDrugLogId(null); 
    fetchReports(); 
    fetchStock();
  }

  async function confirmArchiveLog() {
    if (!logToArchive) return;
    const { error } = await supabase.from("sedation_records").update({ is_archived: true }).eq("id", logToArchive.id);
    if (error) {
      setAlertMessage("Failed to archive: " + error.message);
    } else {
      setLogToArchive(null);
      fetchReports();
    }
  }

  function startUnarchive(log) {
    setUnarchiveModalLog(log);
    setUnarchivePassword("");
  }

  async function confirmUnarchive() {
    if (unarchivePassword === "admin123") { // <----- YOU CAN CHANGE YOUR PASSWORD HERE
      const { error } = await supabase.from("sedation_records").update({ is_archived: false }).eq("id", unarchiveModalLog.id);
      if (error) {
        setAlertMessage("Failed to unarchive: " + error.message);
      } else {
        fetchReports();
        setAlertMessage("Record unarchived successfully.");
      }
      setUnarchiveModalLog(null);
    } else {
      setAlertMessage("Incorrect password. Please try again.");
      setUnarchivePassword(""); 
    }
  }

  function deleteDrugLogRecord(h) {
    setConfirmModal({
      title: "Delete Administration Log",
      message: "Are you sure you want to completely delete this sedation record? The recorded volumes and waste will be refunded back to the inventory stock automatically.",
      confirmText: "Yes, Delete & Refund",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        if (h.results) {
          for (const r of h.results) {
            const totalToReturn = (parseFloat(r.ml) || 0) + (r.waste !== undefined ? parseFloat(r.waste) : 0);
            if (r.batchId && totalToReturn > 0) {
              const { data: currentStock } = await supabase.from("stock").select("total_ml").eq("id", r.batchId).single();
              if (currentStock) await supabase.from("stock").update({ total_ml: currentStock.total_ml + totalToReturn }).eq("id", r.batchId);
            }
          }
        }
        await supabase.from("sedation_records").delete().eq("id", h.id);
        fetchReports(); 
        fetchStock();
        setConfirmModal(null);
      }
    });
  }

  // --- STAFF MANAGEMENT ACTIONS ---
  async function toggleAdminRole(profileId, currentStatus) {
    if (profileId === currentUserId) {
      return setAlertMessage("Safety Prevention: You cannot remove your own admin access.");
    }
    const { error } = await supabase.from("profiles").update({ is_admin: !currentStatus }).eq("id", profileId);
    if (error) {
      setAlertMessage("Failed to update role: " + error.message);
    } else {
      fetchProfiles();
    }
  }

  // --- BOOKKEEPING / EXPENSE ACTIONS ---
  async function saveExpense() {
    if (!expDesc.trim() || !expAmount) return setAlertMessage("Please provide a description and amount.");
    
    setIsUploadingReceipt(true);
    let receiptUrl = null;

    if (expReceiptFile) {
      const fileName = `${Date.now()}_${expReceiptFile.name}`;
      const { data: fileData, error: fileError } = await supabase.storage.from("receipts").upload(fileName, expReceiptFile);
      
      if (!fileError) {
        const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
        receiptUrl = publicUrlData.publicUrl;
      } else {
        setAlertMessage("Receipt upload failed, but saving expense anyway. Error: " + fileError.message);
      }
    }

    const { error } = await supabase.from("expenses").insert([{
      description: expDesc.trim(),
      amount: Number(expAmount),
      category: expCategory,
      date: expDate,
      receipt_url: receiptUrl
    }]);

    setIsUploadingReceipt(false);

    if (!error) {
      setExpDesc(""); setExpAmount(""); setExpReceiptFile(null); 
      document.getElementById('receipt-upload').value = "";
      fetchExpenses();
      setAlertMessage("Expense recorded successfully.");
    } else {
      setAlertMessage("Failed to save expense: " + error.message);
    }
  }

  async function confirmDeleteExpense() {
    if (!expenseToDelete) return;
    await supabase.from("expenses").delete().eq("id", expenseToDelete.id);
    setExpenseToDelete(null);
    fetchExpenses();
  }


  // --- OTHER CRUD ACTIONS ---

  async function saveProduct() {
    if (!prodName || !prodPrice) return setAlertMessage("Name and Price are required.");
    const payload = { name: prodName, description: prodDesc, price: Number(prodPrice) };
    if (isEditingProd) await supabase.from("products").update(payload).eq("id", editProdId);
    else await supabase.from("products").insert([payload]);
    setIsEditingProd(false); setEditProdId(null); setProdName(""); setProdDesc(""); setProdPrice(""); fetchProducts();
  }
  
  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    await supabase.from("products").delete().eq("id", productToDelete.id);
    setProductToDelete(null);
    fetchProducts();
  }

  function startEditProd(p) { setIsEditingProd(true); setEditProdId(p.id); setProdName(p.name); setProdDesc(p.description || ""); setProdPrice(p.price); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function addStock() {
    if (!stockDrugName.trim() || !stockBatch.trim() || !stockQty.trim()) return setAlertMessage("Please fill all stock fields.");
    await supabase.from("stock").insert([{ drug: stockDrugName.trim(), batch: stockBatch.trim(), total_ml: Number(stockQty), expiry_date: stockExp || null, is_archived: false }]);
    setStockDrugName(""); setStockBatch(""); setStockQty(""); setStockExp(""); fetchStock();
  }
  function startEditStock(s) { setEditingStockId(s.id); setEditStockData({ ...s }); }
  async function saveEditStock(id) { await supabase.from("stock").update({ drug: editStockData.drug, batch: editStockData.batch, total_ml: Number(editStockData.total_ml), expiry_date: editStockData.expiry_date || null }).eq("id", id); setEditingStockId(null); fetchStock(); }
  
  async function confirmArchiveStock() {
    if (!stockToArchive) return;
    const { error } = await supabase.from("stock").update({ is_archived: true }).eq("id", stockToArchive.id);
    if (error) {
      setAlertMessage("Failed to archive stock: " + error.message);
    } else {
      setStockToArchive(null);
      fetchStock();
    }
  }

  async function confirmDeleteStock() {
    if (!stockToDelete) return;
    await supabase.from("stock").delete().eq("id", stockToDelete.id);
    setStockToDelete(null);
    fetchStock();
  }

  function addProtoDrug() {
    const mgKg = parseFloat(protoMgKg); const mgMl = parseFloat(protoMgMl);
    if (!protoDrugName.trim() || isNaN(mgKg) || isNaN(mgMl)) return setAlertMessage("Please fill all drug fields correctly.");
    setProtoDrugs(prev => [...prev, { drug_name: protoDrugName.trim(), mg_per_kg: mgKg, mg_per_ml: mgMl }]);
    setProtoDrugName(""); setProtoMgKg(""); setProtoMgMl("");
  }
  async function saveProtocolObj() {
    if (!protoName.trim() || protoDrugs.length === 0) return setAlertMessage("Please enter a name and at least one drug.");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let pId = editingProtoId;
      if (editingProtoId) {
        await supabase.from("protocols").update({ name: protoName, species: protoSpecies, user_id: session?.user?.id }).eq("id", editingProtoId);
        await supabase.from("protocol_drugs").delete().eq("protocol_id", editingProtoId);
      } else {
        const { data } = await supabase.from("protocols").insert([{ name: protoName, species: protoSpecies, user_id: session?.user?.id }]).select().single();
        pId = data.id;
      }
      await supabase.from("protocol_drugs").insert(protoDrugs.map(d => ({ protocol_id: pId, ...d })));
      setProtoName(""); setProtoSpecies(""); setProtoDrugs([]); setEditingProtoId(null); fetchProtocols(); 
      setAlertMessage("Protocol saved successfully!");
    } catch (err) { setAlertMessage(`Save failed: ${err.message}`); }
  }
  function startEditProtocol(p) { setEditingProtoId(p.id); setProtoName(p.name); setProtoSpecies(p.species || ""); setProtoDrugs(p.protocol_drugs || []); window.scrollTo({ top: 0, behavior: "smooth" }); }
  
  async function confirmDeleteProtocol() {
    if (!protocolToDelete) return;
    await supabase.from("protocol_drugs").delete().eq("protocol_id", protocolToDelete.id); 
    await supabase.from("protocols").delete().eq("id", protocolToDelete.id);
    setProtocolToDelete(null);
    fetchProtocols();
  }

  async function saveTemplate() {
    if (!templateName || !templateSubject || !templateBody) return setAlertMessage("Name, Subject, and Body are required.");
    const payload = { name: templateName, subject: templateSubject, body: templateBody };
    
    if (isEditingTemplate) {
      await supabase.from("email_templates").update(payload).eq("id", editTemplateId);
    } else {
      await supabase.from("email_templates").insert([payload]);
    }
    
    setIsEditingTemplate(false); setEditTemplateId(null); setTemplateName(""); setTemplateSubject(""); setTemplateBody(""); fetchTemplates();
  }

  function startEditTemplate(t) {
    setIsEditingTemplate(true); setEditTemplateId(t.id); setTemplateName(t.name); setTemplateSubject(t.subject); setTemplateBody(t.body);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmDeleteTemplate() {
    if (!templateToDelete) return;
    await supabase.from("email_templates").delete().eq("id", templateToDelete.id);
    setTemplateToDelete(null);
    fetchTemplates();
  }

  function renderStatModalList() {
    let list = [];
    if (statModalMode === "clients") list = allClientsList;
    if (statModalMode === "patients") list = allPatientsList;
    if (statModalMode === "deceased") list = allPatientsList.filter(p => p.is_deceased);
    if (statModalMode === "sedations") list = allSedationsList;
    if (statModalMode === "consents") list = allConsentsList;

    const filtered = list.filter(item => {
      const searchLower = statSearch.toLowerCase();
      if (statModalMode === "clients") {
        return (`${item.name || ""} ${item.surname || ""}`).toLowerCase().includes(searchLower);
      }
      if (statModalMode === "patients" || statModalMode === "deceased") {
        return (item.name || "").toLowerCase().includes(searchLower) || (item.clients?.surname || "").toLowerCase().includes(searchLower);
      }
      if (statModalMode === "sedations" || statModalMode === "consents") {
        return (item.patients?.name || "").toLowerCase().includes(searchLower);
      }
      return true;
    });

    if (filtered.length === 0) return <p style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>No records found.</p>;

    return filtered.map(item => (
       <div key={item.id} style={{ background: "#f8f9fb", padding: "12px", borderRadius: "8px", marginBottom: "8px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
         { statModalMode === "clients" && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>{item.name} {item.surname}</strong>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{item.email || "No email"} | {item.phone || "No phone"}</div>
             </div>
             <button onClick={() => navigate(`/client/${item.id}`)} style={purpleBtn}>View</button>
           </>
         )}
         { (statModalMode === "patients" || statModalMode === "deceased") && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>{item.name}</strong> <span style={{ color: "#7f8c8d", fontSize: "13px" }}>({item.clients?.surname || "No Client"})</span>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{item.species} - {item.weight}kg</div>
             </div>
             <button onClick={() => navigate(`/patient/${item.id}`)} style={statModalMode === "deceased" ? greyBtn : blueBtn}>View</button>
           </>
         )}
         { statModalMode === "sedations" && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>Pet: {item.patients?.name || "Deleted/Orphaned"}</strong>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{new Date(item.created_at).toLocaleDateString('en-GB')}</div>
             </div>
             {item.patient_id && <button onClick={() => navigate(`/patient/${item.patient_id}`, { state: { activeTab: "dosing" } })} style={greenBtn}>View File</button>}
           </>
         )}
         { statModalMode === "consents" && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>Pet: {item.patients?.name || "Unknown"}</strong>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Signed by: {item.name}</div>
             </div>
             <button onClick={() => navigate(`/patient/${item.patient_id}`, { state: { activeTab: "consent" } })} style={yellowBtn}>View Form</button>
           </>
         )}
       </div>
    ));
  }

  // Generate Filtered Logs for VMD Tab
  const filteredDrugLogs = allSedationsList.filter(h => {
    const isArchivedStatusMatch = showArchivedLogs ? h.is_archived : !h.is_archived;
    if (!isArchivedStatusMatch) return false;

    if (!logSearch.trim()) return true;
    const s = logSearch.toLowerCase();
    const cName = h.patients?.clients ? `${h.patients.clients.name} ${h.patients.clients.surname}`.toLowerCase() : "";
    const pName = (h.patients?.name || "").toLowerCase();
    const drugs = (h.results || []).map(r => (r.label || r.drug || "")).join(" ").toLowerCase();
    
    return cName.includes(s) || pName.includes(s) || drugs.includes(s);
  });

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) return <div className="page">Access Denied</div>;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "bookkeeping", label: "Bookkeeping" }, 
    { id: "staff", label: "Staff Access" }, 
    { id: "reports", label: "Reports" }, 
    { id: "drug_logs", label: "Drug Logs (VMD)" },
    { id: "products", label: "Products" },
    { id: "stock", label: "Stock" },
    { id: "protocols", label: "Protocols" },
    { id: "templates", label: "Email Templates" }
  ];

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>Admin Control</h1>

      {/* ================= SUB-NAVIGATION TABS WITH DIRECTIONAL ARROWS WITHIN FRAME ================= */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", background: "white", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "0 10px" }}>
        <span style={{ color: "#5b8fb9", fontWeight: "bold", fontSize: "18px", paddingRight: "5px", userSelect: "none" }}>&lt;</span>
        <div className="admin-tabs-scrollbox" style={{ 
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
                ...tabBtnStyle,
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

      {/* ADMIN SCROLLBAR CSS HIDDEN */}
      <style>{`
        .admin-tabs-scrollbox::-webkit-scrollbar {
          display: none;
        }
        .admin-tabs-scrollbox {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === "overview" && (
        <>
          <h3 style={{ color: "#2c3e50", marginTop: 0 }}>Financial Overview</h3>
          <div style={{ display: "flex", gap: "15px", marginBottom: "30px", flexWrap: "wrap" }}>
            <div style={{...statCard, cursor: "default"}}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Gross Revenue</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2c3e50" }}>£{totalSales.toFixed(2)}</div>
            </div>
            <div style={{...statCard, cursor: "default"}}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Outstanding Due</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#e74c3c" }}>£{outstandingTotal.toFixed(2)}</div>
            </div>
          </div>

          <h3 style={{ color: "#2c3e50" }}>Clinical Records <span style={{fontSize: "12px", color: "#7f8c8d", fontWeight: "normal", marginLeft: "10px"}}>(Tap to view list)</span></h3>
          <div style={{ display: "flex", gap: "15px", marginBottom: "30px", flexWrap: "wrap" }}>
            <div style={statCard} onClick={() => { setStatModalMode("clients"); setStatSearch(""); }}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Total Clients</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8e44ad" }}>{allClientsList.length}</div>
            </div>
            <div style={statCard} onClick={() => { setStatModalMode("patients"); setStatSearch(""); }}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Total Patients</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3498db" }}>{allPatientsList.length}</div>
            </div>
            <div style={statCard} onClick={() => { setStatModalMode("deceased"); setStatSearch(""); }}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Deceased</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#95a5a6" }}>{allPatientsList.filter(p => p.is_deceased).length}</div>
            </div>
            <div style={statCard} onClick={() => { setStatModalMode("sedations"); setStatSearch(""); }}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Sedations</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}>{allSedationsList.length}</div>
            </div>
            <div style={statCard} onClick={() => { setStatModalMode("consents"); setStatSearch(""); }}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Consents</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f39c12" }}>{allConsentsList.length}</div>
            </div>
          </div>

          <h3 style={{ color: "#2c3e50", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>Action Required: Unpaid Invoices</h3>
          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            {outstandingInvoices.length === 0 ? (
              <p style={{ color: "#27ae60", textAlign: "center", fontWeight: "bold" }}>All accounts are settled! 🎉</p>
            ) : (
              outstandingInvoices.map(inv => (
                <div key={inv.id} className="admin-invoice-row" style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "16px", color: "#e74c3c" }}>£{inv.total.toFixed(2)} Due</strong>
                    <div style={{ color: "#333", fontSize: "15px", marginTop: "5px", fontWeight: "bold" }}>
                      {inv.client?.name} {inv.client?.surname} 
                      <span onClick={() => { if(inv.patientId) navigate(`/patient/${inv.patientId}`); }} style={{ color: "#3498db", fontWeight: "bold", cursor: "pointer", marginLeft: "5px", textDecoration: "underline" }}>
                        (Pet: {inv.patientName})
                      </span>
                    </div>
                    <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>{inv.items.join(", ")}</div>
                    <div style={{ color: "#95a5a6", fontSize: "12px", marginTop: "4px" }}>Invoice Date: {new Date(inv.date).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    {inv.client?.phone && <a href={`tel:${inv.client?.phone}`} style={{ display: "block", marginBottom: "8px", color: "#3498db", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>📞 Call</a>}
                    <button className="admin-view-invoice-btn" onClick={() => {
                        if (!inv.patientId) return setAlertMessage("Error: Missing Patient Link. This invoice may be orphaned in the database.");
                        navigate(`/patient/${inv.patientId}`, { state: { activeTab: "procedures", targetInvoiceId: inv.id }});
                      }} style={invoiceViewBtn}>
                      View Invoice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ================= TAB 1.1: BOOKKEEPING & EXPENSES ================= */}
      {activeTab === "bookkeeping" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ color: "#2c3e50", margin: 0 }}>Profit & Loss</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={exportExpensesCSV} style={{ ...greenBtn }}>Download CSV</button>
              <button onClick={generateBookkeepingReport} style={{ ...blueBtn, background: "#8e44ad" }}>Download PDF</button>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "15px", marginBottom: "30px", flexWrap: "wrap" }}>
            <div style={{...statCard, cursor: "default"}}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Total Billed Revenue</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3498db" }}>£{totalSales.toFixed(2)}</div>
            </div>
            <div style={{...statCard, cursor: "default"}}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Total Outgoing Expenses</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#e74c3c" }}>
                £{expensesList.reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2)}
              </div>
            </div>
            <div style={{...statCard, cursor: "default", border: "2px solid #27ae60"}}>
              <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "5px" }}>Estimated Net Profit</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}>
                £{(totalSales - expensesList.reduce((acc, curr) => acc + Number(curr.amount), 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "30px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Record an Expense</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
              <input placeholder="Description (e.g. Needle Restock, Fuel, VDS Fees)" value={expDesc} onChange={e => setExpDesc(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: "200px", marginBottom: 0 }} />
              <input type="number" step="0.01" placeholder="Amount (£)" value={expAmount} onChange={e => setExpAmount(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "120px", marginBottom: 0 }} />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
              <select value={expCategory} onChange={e => setExpCategory(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
                <option value="Stock / Inventory">Stock / Inventory</option>
                <option value="Equipment">Equipment / Tools</option>
                <option value="Vehicle / Travel">Vehicle / Travel</option>
                <option value="Fees / Insurance">RCVS / VDS / Insurance</option>
                <option value="Software / Subscriptions">Software / Subscriptions</option>
                <option value="Other">Other</option>
              </select>
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
            </div>

            {/* ALIGNMENT FIX APPLIED HERE: Flex container perfectly centers standard text */}
            <label 
              htmlFor="receipt-upload" 
              style={{ 
                ...blueBtn, 
                display: "flex",            
                alignItems: "center",       
                justifyContent: "center",   
                width: "100%", 
                boxSizing: "border-box",    
                whiteSpace: "normal",       
                minHeight: "44px",          
                marginBottom: isUploadingReceipt ? "10px" : "15px",
                opacity: isUploadingReceipt ? 0.7 : 1
              }}
            >
              {isUploadingReceipt ? "Uploading..." : expReceiptFile ? expReceiptFile.name : "Click to Select Receipt File/Image"}
            </label>

            <input 
              id="receipt-upload"
              type="file"
              accept="image/*,.pdf" 
              onChange={(e) => setExpReceiptFile(e.target.files[0])} 
              disabled={isUploadingReceipt}
              style={{ display: "none" }} 
            />

            <button onClick={saveExpense} disabled={isUploadingReceipt} style={{ ...greenBtn, width: "100%", opacity: isUploadingReceipt ? 0.7 : 1 }}>
              {isUploadingReceipt ? "Uploading & Saving..." : "Record Expense"}
            </button>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Expense Records</h3>
            {expensesList.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No expenses recorded.</p>}
            
            {expensesList.map(exp => (
              <div key={exp.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "5px solid #e74c3c" }}>
                <div>
                  <strong style={{ fontSize: "16px", color: "#333", display: "block" }}>{exp.description}</strong>
                  <div style={{ fontSize: "13px", color: "#7f8c8d", marginTop: "4px" }}>
                    <span style={{ fontWeight: "bold", color: "#5b8fb9" }}>{exp.category}</span> • {new Date(exp.date).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#e74c3c" }}>£{Number(exp.amount).toFixed(2)}</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {exp.receipt_url && (
                      <button onClick={() => window.open(exp.receipt_url, "_blank")} style={{ ...blueBtn, padding: "6px 10px" }}>Receipt</button>
                    )}
                    <button onClick={() => setExpenseToDelete(exp)} style={{ ...redBtn, padding: "6px 10px" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 1.2: STAFF MANAGEMENT ================= */}
      {activeTab === "staff" && (
        <>
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>Staff Management</h3>
              <p style={{ margin: 0, color: "#7f8c8d", fontSize: "14px" }}>Manage team access and administrator privileges.</p>
            </div>
            <button onClick={() => setShowAddStaffInfo(true)} style={{ ...greenBtn, width: "140px", flexShrink: 0 }}>+ Add New Staff</button>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            {profiles.map(p => (
              <div key={p.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                  <strong style={{ fontSize: "16px", color: "#333", display: "block", marginBottom: "4px" }}>{p.email || "Unknown User"}</strong>
                  <span style={{ fontSize: "13px", background: p.is_admin ? "#e8daef" : "#f1f2f6", color: p.is_admin ? "#8e44ad" : "#7f8c8d", padding: "4px 8px", borderRadius: "8px", fontWeight: "bold" }}>
                    {p.is_admin ? "Administrator" : "Standard User"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                  <button 
                    onClick={() => toggleAdminRole(p.id, p.is_admin)} 
                    style={p.is_admin ? { ...redBtn, width: "140px" } : { ...blueBtn, width: "140px" }}
                  >
                    {p.is_admin ? "Remove Admin" : "Make Admin"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 1.5: REPORTS ================= */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>VMD / RCVS Controlled Drugs Log</h3>
              <p style={{ margin: 0, color: "#7f8c8d", fontSize: "14px" }}>Generate a compliant PDF with drug amounts, batch numbers, and client details.</p>
            </div>
            <button onClick={generateCDReport} style={{ ...blueBtn, background: "#8e44ad" }}>Generate PDF</button>
          </div>
          
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>Inventory Stock Report</h3>
              <p style={{ margin: 0, color: "#7f8c8d", fontSize: "14px" }}>Generate a PDF of all active and archived stock.</p>
            </div>
            <button onClick={generateStockReport} style={{ ...blueBtn }}>Generate PDF</button>
          </div>

          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>Master Invoice Report</h3>
              <p style={{ margin: 0, color: "#7f8c8d", fontSize: "14px" }}>Generate a PDF list of all billed procedures and their payment status.</p>
            </div>
            <button onClick={generateInvoiceReport} style={greenBtn}>Generate PDF</button>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>Patient Full History Report</h3>
            <p style={{ margin: "0 0 15px 0", color: "#7f8c8d", fontSize: "14px" }}>Select a patient to generate a comprehensive PDF of their details, procedures, and sedation history.</p>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <select 
                value={selectedPatientForReport} 
                onChange={(e) => setSelectedPatientForReport(e.target.value)} 
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              >
                <option value="">-- Select a Patient --</option>
                {allPatientsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.clients?.surname || "Unknown"})</option>
                ))}
              </select>
              
              <button onClick={generatePatientReport} style={yellowBtn}>
                Generate PDF
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 2: DRUG LOGS (VMD) ================= */}
      {activeTab === "drug_logs" && (
        <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Controlled Drugs Log (VMD)</h3>
            <button onClick={generateCDReport} style={{ ...blueBtn, background: "#8e44ad" }}>Download VMD Report</button>
          </div>
          
          <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "20px" }}>
            Search and manage drug administration logs. You can edit amounts, safely archive old logs, or completely delete records (which refunds the stock back to the inventory).
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input 
              placeholder="Search logs by client, patient, or drug..." 
              value={logSearch} 
              onChange={(e) => setLogSearch(e.target.value)} 
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
            />
            <button 
              onClick={() => setShowArchivedLogs(!showArchivedLogs)} 
              style={{ ...greyBtn, background: showArchivedLogs ? "#5b8fb9" : "#95a5a6", whiteSpace: "nowrap" }}
            >
              {showArchivedLogs ? "Show Active Logs" : "View Archived Logs"}
            </button>
          </div>
          
          {filteredDrugLogs.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No records found.</p>}
          
          {filteredDrugLogs.map(h => {
            const clientName = h.patients?.clients ? `${h.patients.clients.name} ${h.patients.clients.surname}` : "Orphaned/Deleted Client";
            const patientName = h.patients?.name || "Orphaned/Deleted Patient";
            
            return (
              <div key={h.id} style={{ ...whiteShadowBox, marginBottom: "15px", borderLeft: h.patients ? "1px solid #eee" : "4px solid #e74c3c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px", color: "#2c3e50", fontWeight: "bold" }}>
                    {new Date(h.created_at).toLocaleString('en-GB')}
                  </span>
                  <span style={{ fontSize: "14px", color: h.patients ? "#3498db" : "#e74c3c", fontWeight: "bold" }}>
                    {clientName} — Pet: {patientName} ({h.weight} kg)
                  </span>
                </div>
                
                {editingDrugLogId === h.id ? (
                  <>
                    {editDrugLogResults.map((r, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px", background: "#fdfdfd", padding: "8px", borderRadius: "8px", border: "1px dashed #bdc3c7" }}>
                        <strong style={{ color: "#333", fontSize: "14px" }}>{r.label || r.drug}</strong>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b", minWidth: "35px" }}>Dose:</span>
                            <input type="number" step="0.01" style={{ width: "100%", minWidth: "50px", padding: "6px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }} value={r.ml} onChange={e => { const u = [...editDrugLogResults]; u[i].ml = e.target.value; setEditDrugLogResults(u); }} />
                            <span style={{ fontSize: "12px", color: "#64748b" }}>ml</span>
                          </div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b", minWidth: "38px" }}>Waste:</span>
                            <input type="number" step="0.01" style={{ width: "100%", minWidth: "50px", padding: "6px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }} value={r.waste} onChange={e => { const u = [...editDrugLogResults]; u[i].waste = e.target.value; setEditDrugLogResults(u); }} />
                            <span style={{ fontSize: "12px", color: "#64748b" }}>ml</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button style={{ ...greenBtn, flex: 1 }} onClick={() => saveEditDrugLog(h.id)}>Save Changes</button>
                      <button style={{ ...yellowBtn, flex: 1 }} onClick={() => setEditingDrugLogId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {h.results?.map((r, idx) => (
                      <div key={idx} style={{ fontSize: "14px", color: "#333", marginBottom: "5px" }}>
                        <strong>{r.label || r.drug}</strong>: {r.ml} ml {r.waste > 0 ? <span style={{color: "#7f8c8d", fontSize: "12px"}}>(+ {r.waste} ml waste)</span> : ""} 
                        <span style={{color: "#95a5a6", fontSize: "12px", marginLeft: "10px"}}>[Batch: {r.batchName ? r.batchName : resolveBatchName(r.batchId)}]</span>
                      </div>
                    ))}

                    {showArchivedLogs ? (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                        <button onClick={() => startUnarchive(h)} style={{ ...greenBtn, flex: 1, minWidth: "120px" }}>🔓 Unarchive (Requires Password)</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                        <button onClick={() => startEditDrugLog(h)} style={{ ...blueBtn, flex: 1, minWidth: "80px" }}>Edit</button>
                        <button onClick={() => setLogToArchive(h)} style={{ ...yellowBtn, flex: 1, minWidth: "80px" }}>Archive</button>
                        <button onClick={() => deleteDrugLogRecord(h)} style={{ ...redBtn, flex: 1, minWidth: "80px" }}>Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TAB 3: PRODUCTS ================= */}
      {activeTab === "products" && (
        <>
          <div className="card" style={{ marginBottom: "20px", border: isEditingProd ? "2px solid #f39c12" : "none" }}>
            <h3 style={{ marginTop: 0 }}>{isEditingProd ? "Edit Product" : "Add New Product"}</h3>
            <input placeholder="Product / Service Name" value={prodName} onChange={e => setProdName(e.target.value)} style={inputStyle} />
            <textarea placeholder="Description..." value={prodDesc} onChange={e => setProdDesc(e.target.value)} style={inputStyle} rows={2} />
            <input placeholder="Price (£)" type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} style={inputStyle} />
            <div style={btnRow}>
              <button onClick={saveProduct} style={{...greenBtn, flex: 1}}> {isEditingProd ? "Update Product" : "Save Product"} </button>
              {isEditingProd && <button onClick={() => {setIsEditingProd(false); setEditProdId(null); setProdName(""); setProdDesc(""); setProdPrice("");}} style={{...redBtn, flex: 1}}>Cancel</button>}
            </div>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Product Library</h3>
            {productsList.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No products available.</p>}
            {productsList.map(p => (
              <div key={p.id} style={whiteShadowBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "18px", color: "#333" }}>{p.name}</strong>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#27ae60" }}>£{Number(p.price).toFixed(2)}</div>
                </div>
                <div style={{ color: "#7f8c8d", fontSize: "14px", marginTop: "5px" }}>{p.description}</div>
                <div style={btnRow}>
                  <button onClick={() => startEditProd(p)} style={blueBtn}>Edit</button>
                  <button onClick={() => setProductToDelete(p)} style={redBtn}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 4: STOCK ================= */}
      {activeTab === "stock" && (
        <>
          <div className="card">
            <h3 style={{marginTop:0}}>Add Stock</h3>
            <input placeholder="Drug" value={stockDrugName} onChange={e => setStockDrugName(e.target.value)} style={inputStyle} />
            <input placeholder="Batch" value={stockBatch} onChange={e => setStockBatch(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="number" placeholder="Total ml" value={stockQty} onChange={e => setStockQty(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
              <input type="date" value={stockExp} onChange={e => setStockExp(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            </div>
            <button onClick={addStock} style={{ ...blueBtn }}>Add Stock</button>
          </div>
          
          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Current Inventory</h3>
            {stockList.filter(s => !s.is_archived).map(s => (
              <div key={s.id} style={whiteShadowBox}>
                {editingStockId === s.id ? (
                  <>
                    <input value={editStockData.drug} onChange={e => setEditStockData({ ...editStockData, drug: e.target.value })} style={inputStyle} />
                    <input value={editStockData.batch} onChange={e => setEditStockData({ ...editStockData, batch: e.target.value })} style={inputStyle} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="number" value={editStockData.total_ml} onChange={e => setEditStockData({ ...editStockData, total_ml: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                      <input type="date" value={editStockData.expiry_date || ""} onChange={e => setEditStockData({ ...editStockData, expiry_date: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                    </div>
                    <div style={btnRow}>
                      <button style={{...blueBtn, flex: 1}} onClick={() => saveEditStock(s.id)}>Save</button>
                      <button style={{...redBtn, flex: 1}} onClick={() => setEditingStockId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong style={{fontSize: "18px", color: "#333"}}>{s.drug}</strong><br/>
                    <div style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6", marginTop: "5px" }}>
                      Batch: {s.batch} | <strong>{s.total_ml} ml remaining</strong><br/>
                      {s.expiry_date && `Expires: ${new Date(s.expiry_date).toLocaleDateString('en-GB')}`}
                    </div>
                    <div style={{...btnRow, marginTop: "15px"}}>
                      <button style={{ ...blueBtn }} onClick={() => startEditStock(s)}>Edit</button>
                      <button style={yellowBtn} onClick={() => setStockToArchive(s)}>Archive</button>
                      <button style={redBtn} onClick={() => setStockToDelete(s)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {stockList.filter(s => !s.is_archived).length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No stock available.</p>}
          </div>
        </>
      )}

      {/* ================= TAB 5: PROTOCOLS ================= */}
      {activeTab === "protocols" && (
        <>
          <div className="card" style={{ border: editingProtoId ? "2px solid #f39c12" : "none" }}>
            <h3 style={{marginTop:0}}>{editingProtoId ? "Edit Protocol" : "Add Protocol"}</h3>
            <input placeholder="Protocol name" value={protoName} onChange={e => setProtoName(e.target.value)} style={inputStyle} />
            <input placeholder="Species (Optional)" value={protoSpecies} onChange={e => setProtoSpecies(e.target.value)} style={inputStyle} />

            <div style={{ background: "#f8f9fb", padding: "15px", borderRadius: "10px", marginTop: "10px" }}>
              <h4 style={{ marginTop: 0 }}>Add Drug to Protocol</h4>
              <div style={{ display: "grid", gap: "8px" }}>
                <input placeholder="Drug name" value={protoDrugName} onChange={e => setProtoDrugName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <input placeholder="mg/kg" value={protoMgKg} onChange={e => setProtoMgKg(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                  <input placeholder="mg/ml" value={protoMgMl} onChange={e => setProtoMgMl(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
                </div>
              </div>
              <button style={{ ...blueBtn, marginTop: "12px" }} onClick={addProtoDrug}>+ Add Drug</button>
            </div>

            {protoDrugs.map((d, i) => (
              <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "10px", borderRadius: "10px", border: "1px solid #eee" }}>
                <span><strong>{d.drug_name}</strong> — {d.mg_per_kg} mg/kg</span>
                <button onClick={() => setProtoDrugs(protoDrugs.filter((_, idx) => idx !== i))} style={redBtn}>Remove</button>
              </div>
            ))}

            <div style={btnRow}>
              <button style={{...greenBtn, flex: 1}} onClick={saveProtocolObj}>{editingProtoId ? "Save Changes" : "Save Protocol"}</button>
              {editingProtoId && <button onClick={() => {setEditingProtoId(null); setProtoName(""); setProtoSpecies(""); setProtoDrugs([]);}} style={{...redBtn, flex: 1}}>Cancel</button>}
            </div>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Protocol Library</h3>
            <input placeholder="Search protocols..." value={protoSearch} onChange={e => setProtoSearch(e.target.value)} style={inputStyle} />

            {protocolsList.filter(p => p.name.toLowerCase().includes(protoSearch.toLowerCase())).map(p => (
              <div key={p.id} style={whiteShadowBox}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: "center"}}>
                  <strong style={{ fontSize: "18px", color: "#333" }}>{p.name}</strong>
                  {p.species && <span style={{fontSize: '12px', background: '#eef2f4', color: "#5b8fb9", padding: '4px 8px', borderRadius: '10px', fontWeight: "bold"}}>{p.species}</span>}
                </div>
                
                <div style={{ fontSize: "15px", color: "#555", margin: "10px 0", background: "#f8f9fb", padding: "10px", borderRadius: "8px" }}>
                  {p.protocol_drugs?.map((d, i) => (
                    <div key={i}>• {d.drug_name}: {d.mg_per_kg} mg/kg</div>
                  ))}
                </div>

                <div style={btnRow}>
                  <button style={{ ...blueBtn }} onClick={() => startEditProtocol(p)}>Edit</button>
                  <button style={redBtn} onClick={() => setProtocolToDelete(p)}>Delete</button>
                </div>
              </div>
            ))}
            {protocolsList.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No protocols found.</p>}
          </div>
        </>
      )}

      {/* ================= TAB 6: EMAIL TEMPLATES ================= */}
      {activeTab === "templates" && (
        <>
          <div className="card" style={{ marginBottom: "20px", border: isEditingTemplate ? "2px solid #f39c12" : "none" }}>
            <h3 style={{ marginTop: 0 }}>{isEditingTemplate ? "Edit Template" : "Add New Template"}</h3>
            <p style={{ fontSize: "13px", color: "#7f8c8d", marginTop: 0, marginBottom: "15px" }}>
              Use <strong>{'{patient_name}'}</strong> and <strong>{'{client_name}'}</strong> as placeholders in your subject and body. They will be auto-filled in the patient's file.
            </p>
            <input placeholder="Template Name (e.g., Sympathy Card)" value={templateName} onChange={e => setTemplateName(e.target.value)} style={inputStyle} />
            <input placeholder="Email Subject" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} style={inputStyle} />
            <textarea placeholder="Email Body..." value={templateBody} onChange={e => setTemplateBody(e.target.value)} style={{...inputStyle, fontFamily: "inherit"}} rows={6} />
            
            <div style={btnRow}>
              <button onClick={saveTemplate} style={{...greenBtn, flex: 1}}>{isEditingTemplate ? "Update Template" : "Save Template"}</button>
              {isEditingTemplate && <button onClick={() => {setIsEditingTemplate(false); setEditTemplateId(null); setTemplateName(""); setTemplateSubject(""); setTemplateBody("");}} style={{...redBtn, flex: 1}}>Cancel</button>}
            </div>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Template Library</h3>
            {templatesList.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No templates available.</p>}
            {templatesList.map(t => (
              <div key={t.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, paddingRight: "15px" }}>
                  <strong style={{ fontSize: "18px", display: "block", color: "#333", marginBottom: "5px" }}>{t.name}</strong>
                  <div style={{ fontSize: "14px", color: "#2c3e50", fontWeight: "bold", marginBottom: "5px" }}>Subject: {t.subject}</div>
                  <div style={{ color: "#7f8c8d", fontSize: "13px", whiteSpace: "pre-wrap", background: "#f0f2f5", padding: "10px", borderRadius: "8px" }}>{t.body}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "none" }}>
                  <button onClick={() => startEditTemplate(t)} style={{ ...blueBtn }}>Edit</button>
                  <button onClick={() => setTemplateToDelete(t)} style={redBtn}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= STATS LIST MODAL ================= */}
      {statModalMode && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setStatModalMode(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "15px", width: "100%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setStatModalMode(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "#5b8fb9", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
            <h2 style={{ marginTop: 0, textTransform: "capitalize", color: "#2c3e50" }}>{statModalMode} List</h2>
            <input placeholder={`Search ${statModalMode}...`} value={statSearch} onChange={(e) => setStatSearch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "15px" }} />
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>{renderStatModalList()}</div>
          </div>
        </div>
      )}

      {/* ================= STAFF INFO MODAL ================= */}
      {showAddStaffInfo && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setShowAddStaffInfo(false)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "450px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#3498db", marginTop: 0 }}>Add New Staff</h2>
            <p style={{ color: "#2c3e50", fontSize: "15px", marginBottom: "15px", lineHeight: "1.5", textAlign: "left" }}>
              For security reasons, new accounts cannot be created directly inside the app while logged in as an administrator.
            </p>
            <ol style={{ textAlign: "left", color: "#444", fontSize: "14px", paddingLeft: "20px", marginBottom: "25px", lineHeight: "1.6" }}>
              <li>Go to your <strong>Supabase Dashboard</strong>.</li>
              <li>Navigate to <strong>Authentication &gt; Users</strong>.</li>
              <li>Click <strong>Add User &gt; Create New User</strong> and enter their email and a temporary password.</li>
              <li>Once they log into the app for the first time, their profile will appear in this list, and you can grant them Admin access.</li>
            </ol>
            <button onClick={() => setShowAddStaffInfo(false)} style={{ ...blueBtn, width: "100%" }}>Understood</button>
          </div>
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

      {/* ================= ACTION CONFIRM MODALS ================= */}
      {confirmModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: confirmModal.confirmColor || "#e74c3c", marginTop: 0 }}>⚠️ {confirmModal.title}</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmModal.onConfirm} style={{ ...standardBtnProps, background: confirmModal.confirmColor || "#e74c3c", color: "white", flex: 1 }}>{confirmModal.confirmText || "Confirm"}</button>
              <button onClick={() => setConfirmModal(null)} style={{ ...greyBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= UNARCHIVE PASSWORD MODAL ================= */}
      {unarchiveModalLog && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => { setUnarchiveModalLog(null); setUnarchivePassword(""); }}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#27ae60", marginTop: 0 }}>🔓 Admin Authorization</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "15px", lineHeight: "1.5" }}>
              Enter admin password to unarchive this record:
            </p>
            <input 
              type="password" 
              value={unarchivePassword} 
              onChange={(e) => setUnarchivePassword(e.target.value)} 
              style={{ ...inputStyle, marginBottom: "25px", textAlign: "center", letterSpacing: "2px" }} 
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirmUnarchive(); }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmUnarchive} style={{...greenBtn, flex: 1}}>Unlock</button>
              <button onClick={() => { setUnarchiveModalLog(null); setUnarchivePassword(""); }} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {logToArchive && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setLogToArchive(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>📦 Confirm Archive</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to archive this drug log? It will be hidden from the active list.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmArchiveLog} style={{...yellowBtn, flex: 1}}>Yes, Archive</button>
              <button onClick={() => setLogToArchive(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setProductToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete product <strong>{productToDelete.name}</strong> from the system library?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteProduct} style={{...redBtn, flex: 1}}>Yes, Delete</button>
              <button onClick={() => setProductToDelete(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {stockToArchive && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setStockToArchive(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>📦 Confirm Archive</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to archive drug batch <strong>{stockToArchive.batch} ({stockToArchive.drug})</strong>? It will no longer appear in active dropdown menus.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmArchiveStock} style={{...yellowBtn, flex: 1}}>Yes, Archive</button>
              <button onClick={() => setStockToArchive(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {stockToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setStockToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete drug batch <strong>{stockToDelete.batch} ({stockToDelete.drug})</strong> from inventory storage?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteStock} style={{...redBtn, flex: 1}}>Yes, Delete</button>
              <button onClick={() => setStockToDelete(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {protocolToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setProtocolToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete sedation protocol <strong>{protocolToDelete.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteProtocol} style={{...redBtn, flex: 1}}>Yes, Delete</button>
              <button onClick={() => setProtocolToDelete(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {templateToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setTemplateToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete the template <strong>{templateToDelete.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteTemplate} style={{...redBtn, flex: 1}}>Yes, Delete</button>
              <button onClick={() => setTemplateToDelete(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setExpenseToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete the expense record for <strong>{expenseToDelete.description}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={confirmDeleteExpense} style={{...redBtn, flex: 1}}>Yes, Delete</button>
              <button onClick={() => setExpenseToDelete(null)} style={{...greyBtn, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}