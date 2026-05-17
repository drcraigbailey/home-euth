import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader"; // <-- Ensure this path is correct

const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const statCard = { flex: 1, background: "white", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee", textAlign: "center", minWidth: "140px", cursor: "pointer", transition: "transform 0.1s" };
const btnStyle = { padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };
const yellowBtn = { flex: 1, background: "#f39c12", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };
const greenBtn = { flex: 1, background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); 

  const [totalSales, setTotalSales] = useState(0);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]); 
  
  // New States for Lists
  const [allPatientsList, setAllPatientsList] = useState([]);
  const [allSedationsList, setAllSedationsList] = useState([]);
  const [allConsentsList, setAllConsentsList] = useState([]);

  // Modal States
  const [statModalMode, setStatModalMode] = useState(null); // 'patients' | 'deceased' | 'sedations' | 'consents'
  const [statSearch, setStatSearch] = useState("");

  const [productsList, setProductsList] = useState([]);
  const [isEditingProd, setIsEditingProd] = useState(false);
  const [editProdId, setEditProdId] = useState(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");

  const [stockList, setStockList] = useState([]);
  const [stockDrugName, setStockDrugName] = useState("");
  const [stockBatch, setStockBatch] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockExp, setStockExp] = useState("");
  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockData, setEditStockData] = useState({});

  const [protocolsList, setProtocolsList] = useState([]);
  const [protoSearch, setProtoSearch] = useState("");
  const [protoName, setProtoName] = useState("");
  const [protoSpecies, setProtoSpecies] = useState("");
  const [editingProtoId, setEditingProtoId] = useState(null);
  const [protoDrugs, setProtoDrugs] = useState([]);
  const [protoDrugName, setProtoDrugName] = useState("");
  const [protoMgKg, setProtoMgKg] = useState("");
  const [protoMgMl, setProtoMgMl] = useState("");

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  async function checkAdminAndFetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (profile?.is_admin) {
        setIsAdmin(true);
        await Promise.all([
          fetchReports(), fetchProducts(), fetchStock(), fetchProtocols()
        ]);
      } else navigate("/"); 
    }
    setLoading(false);
  }

  async function fetchReports() {
    // Fetch Financials
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

    // Fetch Full Lists for Stats instead of just counts
    const { data: patientsData } = await supabase.from("patients").select("*, clients(surname)");
    if (patientsData) setAllPatientsList(patientsData);

    const { data: sedationData } = await supabase.from("sedation_records").select("*, patients(name)");
    if (sedationData) setAllSedationsList(sedationData);

    const { data: consentData } = await supabase.from("consent_records").select("*, patients(name)");
    if (consentData) setAllConsentsList(consentData);
  }

  async function fetchProducts() { const { data } = await supabase.from("products").select("*").order("name", { ascending: true }); setProductsList(data || []); }
  async function fetchStock() { const { data } = await supabase.from("stock").select("*"); setStockList(data || []); }
  async function fetchProtocols() { const { data } = await supabase.from("protocols").select("*, protocol_drugs (*)").order("name"); setProtocolsList(data || []); }

  async function saveProduct() {
    if (!prodName || !prodPrice) return alert("Name and Price are required.");
    const payload = { name: prodName, description: prodDesc, price: Number(prodPrice) };
    if (isEditingProd) await supabase.from("products").update(payload).eq("id", editProdId);
    else await supabase.from("products").insert([payload]);
    setIsEditingProd(false); setEditProdId(null); setProdName(""); setProdDesc(""); setProdPrice(""); fetchProducts();
  }
  async function deleteProduct(id) { if (!window.confirm("Delete this product?")) return; await supabase.from("products").delete().eq("id", id); fetchProducts(); }
  function startEditProd(p) { setIsEditingProd(true); setEditProdId(p.id); setProdName(p.name); setProdDesc(p.description || ""); setProdPrice(p.price); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function addStock() {
    if (!stockDrugName.trim() || !stockBatch.trim() || !stockQty.trim()) return alert("Fill all stock fields");
    await supabase.from("stock").insert([{ drug: stockDrugName.trim(), batch: stockBatch.trim(), total_ml: Number(stockQty), expiry_date: stockExp || null, is_archived: false }]);
    setStockDrugName(""); setStockBatch(""); setStockQty(""); setStockExp(""); fetchStock();
  }
  function startEditStock(s) { setEditingStockId(s.id); setEditStockData({ ...s }); }
  async function saveEditStock(id) { await supabase.from("stock").update({ drug: editStockData.drug, batch: editStockData.batch, total_ml: Number(editStockData.total_ml), expiry_date: editStockData.expiry_date || null }).eq("id", id); setEditingStockId(null); fetchStock(); }
  async function archiveStock(id) { if (window.confirm("Archive this bottle?")) { await supabase.from("stock").update({ is_archived: true }).eq("id", id); fetchStock(); } }
  async function deleteStock(id) { if (window.confirm("Delete stock completely?")) { await supabase.from("stock").delete().eq("id", id); fetchStock(); } }

  function addProtoDrug() {
    const mgKg = parseFloat(protoMgKg); const mgMl = parseFloat(protoMgMl);
    if (!protoDrugName.trim() || isNaN(mgKg) || isNaN(mgMl)) return alert("Fill all drug fields correctly");
    setProtoDrugs(prev => [...prev, { drug_name: protoDrugName.trim(), mg_per_kg: mgKg, mg_per_ml: mgMl }]);
    setProtoDrugName(""); setProtoMgKg(""); setProtoMgMl("");
  }
  async function saveProtocolObj() {
    if (!protoName.trim() || protoDrugs.length === 0) return alert("Enter a name and at least one drug");
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
      setProtoName(""); setProtoSpecies(""); setProtoDrugs([]); setEditingProtoId(null); fetchProtocols(); alert("Protocol saved successfully!");
    } catch (err) { alert(`Save failed: ${err.message}`); }
  }
  function startEditProtocol(p) { setEditingProtoId(p.id); setProtoName(p.name); setProtoSpecies(p.species || ""); setProtoDrugs(p.protocol_drugs || []); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deleteProtocolObj(id) { if (!window.confirm("Delete protocol?")) return; await supabase.from("protocol_drugs").delete().eq("protocol_id", id); await supabase.from("protocols").delete().eq("id", id); fetchProtocols(); }

  // --- STAT MODAL RENDERING LOGIC ---
  function renderStatModalList() {
    let list = [];
    if (statModalMode === "patients") list = allPatientsList;
    if (statModalMode === "deceased") list = allPatientsList.filter(p => p.is_deceased);
    if (statModalMode === "sedations") list = allSedationsList;
    if (statModalMode === "consents") list = allConsentsList;

    const filtered = list.filter(item => {
      const searchLower = statSearch.toLowerCase();
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
         
         { (statModalMode === "patients" || statModalMode === "deceased") && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>{item.name}</strong> <span style={{ color: "#7f8c8d", fontSize: "13px" }}>({item.clients?.surname || "No Client"})</span>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{item.species} - {item.weight}kg</div>
             </div>
             <button onClick={() => navigate(`/patient/${item.id}`)} style={{ background: "#3498db", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>View</button>
           </>
         )}
         
         { statModalMode === "sedations" && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>Pet: {item.patients?.name || "Unknown"}</strong>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{new Date(item.created_at).toLocaleDateString()}</div>
             </div>
             <button onClick={() => navigate(`/patient/${item.patient_id}`, { state: { activeTab: "dosing" } })} style={{ background: "#27ae60", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>View Record</button>
           </>
         )}
         
         { statModalMode === "consents" && (
           <>
             <div>
               <strong style={{ color: "#333", fontSize: "15px" }}>Pet: {item.patients?.name || "Unknown"}</strong>
               <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Signed by: {item.name}</div>
             </div>
             <button onClick={() => navigate(`/patient/${item.patient_id}`, { state: { activeTab: "consent" } })} style={{ background: "#f39c12", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>View Form</button>
           </>
         )}
       </div>
    ));
  }

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
    { id: "products", label: "Products" },
    { id: "stock", label: "Stock" },
    { id: "protocols", label: "Protocols" }
  ];

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>Admin Control</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", background: "white", padding: "10px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto", whiteSpace: "nowrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} style={{ ...btnStyle, flex: 1, padding: "12px 20px", background: activeTab === tab.id ? '#5b8fb9' : 'transparent', color: activeTab === tab.id ? 'white' : '#666' }} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

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
            
            {/* Clickable Stat Cards */}
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
                <div key={inv.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "16px", color: "#e74c3c" }}>£{inv.total.toFixed(2)} Due</strong>
                    <div style={{ color: "#333", fontSize: "15px", marginTop: "5px", fontWeight: "bold" }}>
                      {inv.client?.name} {inv.client?.surname} <span style={{ color: "#7f8c8d", fontWeight: "normal" }}>(Pet: {inv.patientName})</span>
                    </div>
                    <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
                      {inv.items.join(", ")}
                    </div>
                    <div style={{ color: "#95a5a6", fontSize: "12px", marginTop: "4px" }}>
                      Invoice Date: {new Date(inv.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    {inv.client?.phone && <a href={`tel:${inv.client?.phone}`} style={{ display: "block", marginBottom: "8px", color: "#3498db", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>📞 Call</a>}
                    <button onClick={() => navigate(`/patient/${inv.patientId}`, { state: { activeTab: "procedures" }})} style={{...blueBtn, padding: "8px 15px"}}>View Invoice</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ================= TAB 2: PRODUCTS ================= */}
      {activeTab === "products" && (
        <>
          <div className="card" style={{ marginBottom: "20px", border: isEditingProd ? "2px solid #f39c12" : "none" }}>
            <h3 style={{ marginTop: 0 }}>{isEditingProd ? "Edit Product" : "Add New Product"}</h3>
            <input placeholder="Product / Service Name" value={prodName} onChange={e => setProdName(e.target.value)} style={inputStyle} />
            <textarea placeholder="Description..." value={prodDesc} onChange={e => setProdDesc(e.target.value)} style={inputStyle} rows={2} />
            <input placeholder="Price (£)" type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} style={inputStyle} />
            <div style={btnRow}>
              <button onClick={saveProduct} style={greenBtn}>{isEditingProd ? "Update Product" : "Save Product"}</button>
              {isEditingProd && <button onClick={() => {setIsEditingProd(false); setEditProdId(null); setProdName(""); setProdDesc(""); setProdPrice("");}} style={redBtn}>Cancel</button>}
            </div>
          </div>

          <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Product Library</h3>
            {productsList.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No products available.</p>}
            {productsList.map(p => (
              <div key={p.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "18px", display: "block", color: "#333" }}>{p.name}</strong>
                  <div style={{ color: "#7f8c8d", fontSize: "14px", marginTop: "5px" }}>{p.description}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#27ae60" }}>£{Number(p.price).toFixed(2)}</div>
                  <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
                    <button onClick={() => startEditProd(p)} style={{ ...blueBtn, padding: "5px 10px", fontSize: "12px" }}>Edit</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ ...redBtn, padding: "5px 10px", fontSize: "12px" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= TAB 3: STOCK ================= */}
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
            <button onClick={addStock} style={{ ...blueBtn, marginTop: "15px", width: "100%" }}>Add Stock</button>
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
                      <button style={blueBtn} onClick={() => saveEditStock(s.id)}>Save</button>
                      <button style={redBtn} onClick={() => setEditingStockId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong style={{fontSize: "18px", color: "#333"}}>{s.drug}</strong><br/>
                    <div style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6", marginTop: "5px" }}>
                      Batch: {s.batch} | <strong>{s.total_ml} ml remaining</strong><br/>
                      {s.expiry_date && `Expires: ${s.expiry_date}`}
                    </div>
                    <div style={{...btnRow, marginTop: "15px"}}>
                      <button style={{...blueBtn, padding: "8px"}} onClick={() => startEditStock(s)}>Edit</button>
                      <button style={{...yellowBtn, padding: "8px"}} onClick={() => archiveStock(s.id)}>Archive</button>
                      <button style={{...redBtn, padding: "8px"}} onClick={() => deleteStock(s.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {stockList.filter(s => !s.is_archived).length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No stock available.</p>}
          </div>
        </>
      )}

      {/* ================= TAB 4: PROTOCOLS ================= */}
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
              <button style={{ marginTop: "10px", background: "#5b8fb9", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", width: "100%", fontWeight: "bold" }} onClick={addProtoDrug}>+ Add Drug</button>
            </div>

            {protoDrugs.map((d, i) => (
              <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "10px", borderRadius: "10px", border: "1px solid #eee" }}>
                <span><strong>{d.drug_name}</strong> — {d.mg_per_kg} mg/kg</span>
                <button onClick={() => setProtoDrugs(protoDrugs.filter((_, idx) => idx !== i))} style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "8px", cursor: "pointer" }}>Remove</button>
              </div>
            ))}

            <div style={btnRow}>
              <button style={greenBtn} onClick={saveProtocolObj}>{editingProtoId ? "Save Changes" : "Save Protocol"}</button>
              {editingProtoId && <button onClick={() => {setEditingProtoId(null); setProtoName(""); setProtoSpecies(""); setProtoDrugs([]);}} style={redBtn}>Cancel</button>}
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
                  <button style={{...blueBtn, padding: "8px"}} onClick={() => startEditProtocol(p)}>Edit</button>
                  <button style={{...redBtn, padding: "8px"}} onClick={() => deleteProtocolObj(p.id)}>Delete</button>
                </div>
              </div>
            ))}
            {protocolsList.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>No protocols found.</p>}
          </div>
        </>
      )}

      {/* ================= STATS MODAL OVERLAY ================= */}
      {statModalMode && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setStatModalMode(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "15px", width: "100%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setStatModalMode(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "#eee", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold" }}>X</button>
            <h2 style={{ marginTop: 0, textTransform: "capitalize", color: "#2c3e50" }}>{statModalMode} List</h2>
            
            <input 
              placeholder={`Search ${statModalMode}...`} 
              value={statSearch} 
              onChange={(e) => setStatSearch(e.target.value)} 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "15px" }} 
            />
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
              {renderStatModalList()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}