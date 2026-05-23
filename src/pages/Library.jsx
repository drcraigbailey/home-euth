// Library.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import Loader from "../Loader";
import fileIcon from "../assets/file.png"; // Assuming you have this from Home.jsx

// --- STYLING CONSTANTS ---
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };

const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "10px 16px", fontSize: "13px", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", minWidth: "100px", whiteSpace: "nowrap" };

const blueBtn  = { background: "#5b8fb9", color: "white", ...standardBtnProps };
const redBtn   = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn = { background: "#27ae60", color: "white", ...standardBtnProps };
const greyBtn  = { background: "#95a5a6", color: "white", ...standardBtnProps };

const CATEGORIES = ["All", "SOPs", "Health & Safety", "CPD", "Forms", "Misc"];

export default function Library() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  // Upload States (Admin Only)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("SOPs");
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Modal States
  const [alertMessage, setAlertMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await checkAdminStatus();
      await fetchDocuments();
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!data?.is_admin);
    }
  }

  async function fetchDocuments() {
    const { data, error } = await supabase.from("company_documents").select("*").order("created_at", { ascending: false });
    if (!error) setDocuments(data || []);
  }

  async function handleUpload() {
    if (!uploadTitle || !selectedFile || !uploadCategory) {
      return setAlertMessage("Please provide a title, category, and select a file.");
    }

    setIsUploading(true);
    const fileExt = selectedFile.name.split('.').pop();
    const safeFileName = `${Date.now()}_${uploadTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
    const filePath = `${uploadCategory}/${safeFileName}`;

    // 1. Upload file to storage
    const { error: uploadError } = await supabase.storage.from("company_documents").upload(filePath, selectedFile);
    
    if (uploadError) {
      setIsUploading(false);
      return setAlertMessage("Upload failed: " + uploadError.message);
    }

    // 2. Save metadata to database
    const { error: dbError } = await supabase.from("company_documents").insert([{
      title: uploadTitle,
      category: uploadCategory,
      description: uploadDesc,
      file_path: filePath
    }]);

    setIsUploading(false);

    if (dbError) {
      setAlertMessage("Database error: " + dbError.message);
    } else {
      setSuccessMessage("Document added to the library!");
      setUploadTitle(""); setUploadDesc(""); setSelectedFile(null);
      document.getElementById('library-file-input').value = ""; // Reset file input
      fetchDocuments();
    }
  }

  async function viewDocument(filePath) {
    const { data } = supabase.storage.from("company_documents").getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, "_blank"); // Opens in a new tab to utilize browser's native PDF/Doc viewer
    } else {
      setAlertMessage("Could not retrieve file URL.");
    }
  }

  function deleteDocument(doc) {
    setConfirmModal({
      title: "Delete Document?",
      message: `Are you sure you want to permanently delete "${doc.title}"?`,
      confirmText: "Yes, Delete",
      confirmColor: "#e74c3c",
      onConfirm: async () => {
        // 1. Remove from Storage
        await supabase.storage.from("company_documents").remove([doc.file_path]);
        // 2. Remove from Database
        await supabase.from("company_documents").delete().eq("id", doc.id);
        
        fetchDocuments();
        setConfirmModal(null);
      }
    });
  }

  // Filtering Logic
  const filteredDocs = documents.filter(doc => {
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || (doc.description || "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Library...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "5px" }}>Company Library</h1>
      <p style={{ textAlign: "center", color: "#7f8c8d", marginTop: 0, marginBottom: "30px" }}>
        Protocols, forms, and educational resources for the team.
      </p>

      {/* ADMIN UPLOAD SECTION - BORDER CHANGED TO ADMIN RED */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: "30px", border: "2px solid #e74c3c", background: "white" }}>
          <h3 style={{ marginTop: 0, color: "#2c3e50" }}>Admin Upload Area</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Document Title" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} />
            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Brief Description (Optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} style={inputStyle} />
          
          <input 
            id="library-file-input"
            type="file" 
            onChange={e => setSelectedFile(e.target.files[0])} 
            style={{ ...inputStyle, background: "white" }} 
            disabled={isUploading}
          />
          
          <button onClick={handleUpload} style={{ ...blueBtn, width: "100%" }} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      )}

      {/* CATEGORY TABS */}
      <div className="patient-tabs-scrollbox" style={{ display: "flex", gap: "10px", paddingBottom: "15px", overflowX: "auto", whiteSpace: "nowrap" }}>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              ...standardBtnProps,
              background: activeCategory === cat ? "#5b8fb9" : "transparent",
              color: activeCategory === cat ? "white" : "#7f8c8d",
              border: activeCategory === cat ? "none" : "1px solid #ccc"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <input 
        placeholder="Search documents..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
        style={{ ...inputStyle, marginTop: "10px", marginBottom: "20px" }} 
      />

      {/* DOCUMENT LIST */}
      <div>
        {filteredDocs.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", marginTop: "40px" }}>No documents found in this category.</p>
        )}

        {filteredDocs.map(doc => (
          <div key={doc.id} style={whiteShadowBox}>
            <div style={{ flex: 1, paddingRight: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                <span style={{ background: "#ecf0f1", color: "#2c3e50", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>
                  {doc.category}
                </span>
                <span style={{ fontSize: "12px", color: "#95a5a6" }}>
                  {new Date(doc.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
              <strong style={{ fontSize: "16px", color: "#2c3e50", display: "block" }}>{doc.title}</strong>
              {doc.description && <p style={{ fontSize: "14px", color: "#7f8c8d", margin: "5px 0 0 0" }}>{doc.description}</p>}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={() => viewDocument(doc.file_path)} style={blueBtn}>View / Download</button>
              {isAdmin && <button onClick={() => deleteDocument(doc)} style={{ ...redBtn, padding: "8px 10px", fontSize: "11px" }}>Delete</button>}
            </div>
          </div>
        ))}
      </div>

      {/* ================= SUCCESS MODAL ================= */}
      {successMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setSuccessMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#27ae60", marginTop: 0 }}>✓ Success</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} style={{ ...greenBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

      {/* ================= GENERIC ALERT MODAL ================= */}
      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setAlertMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#f39c12", marginTop: 0 }}>⚠️ Notice</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>{alertMessage}</p>
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

      {/* ================= CONFIRM MODAL ================= */}
      {confirmModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: confirmModal.confirmColor, marginTop: 0 }}>⚠️ {confirmModal.title}</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>{confirmModal.message}</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmModal.onConfirm} style={{ ...standardBtnProps, background: confirmModal.confirmColor, color: "white", flex: 1 }}>{confirmModal.confirmText}</button>
              <button onClick={() => setConfirmModal(null)} style={{ ...greyBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}