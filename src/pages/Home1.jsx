// Home.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";
import syringeIcon from "../assets/syringe.png";
import stethoscopeIcon from "../assets/stethoscope.png";
import fileIcon from "../assets/file.png";

// --- STYLING CONSTANTS ---
const greyBox = { background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" };
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" };

// Bulletproof uniform button properties to prevent stretching, squishing, and text wrapping
const standardBtnProps = { 
  borderRadius: "8px", 
  border: "none", 
  cursor: "pointer", 
  fontWeight: "bold", 
  padding: "10px 16px", 
  fontSize: "13px", 
  boxSizing: "border-box", 
  display: "inline-flex", 
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center", 
  minWidth: "100px", 
  width: "auto",      
  flexShrink: 0, 
  whiteSpace: "nowrap" 
};

const blueBtn  = { background: "#5b8fb9", color: "white", ...standardBtnProps };
const redBtn   = { background: "#e74c3c", color: "white", ...standardBtnProps };
const greenBtn = { background: "#27ae60", color: "white", ...standardBtnProps };
const darkBtn  = { background: "#2c3e50", color: "white", ...standardBtnProps };
const greyBtn  = { background: "#95a5a6", color: "white", ...standardBtnProps };

export default function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [profiles, setProfiles] = useState([]);
  const [clients, setClients] = useState([]); 
  const [allPatients, setAllPatients] = useState([]);
  const [entries, setEntries] = useState([]);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); 
  
  const [viewEntry, setViewEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  
  // Custom Modal States
  const [alertMessage, setAlertMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // Time inputs state fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [entryType, setEntryType] = useState("Euthanasia");
  const [clientId, setClientId] = useState(""); 
  const [patientId, setPatientId] = useState(""); 
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // --- NEW SMS CONFIG STATES ---
  const [smsArrivedNum, setSmsArrivedNum] = useState("");
  const [smsFinishedNum, setSmsFinishedNum] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      await checkUserAndAdmin();
      await fetchClients(); 
      await fetchPatients(); 
      setIsLoading(false);
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedUserId && selectedDate) fetchEntries();
  }, [selectedUserId, selectedDate]);

  async function checkUserAndAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      setSelectedUserId(session.user.id);
      
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      const adminStatus = !!profile?.is_admin;
      setIsAdmin(adminStatus);
      
      if (adminStatus) {
        const { data: allProfiles } = await supabase.from("profiles").select("*");
        setProfiles(allProfiles || []);
      } else {
        setProfiles([profile]);
      }

      // Fetch the Central SMS Notification Numbers configured by the Admin
      const { data: adminProfiles } = await supabase.from("profiles").select("sms_arrived, sms_finished").eq("is_admin", true).limit(1);
      if (adminProfiles && adminProfiles.length > 0) {
        setSmsArrivedNum(adminProfiles[0].sms_arrived || "");
        setSmsFinishedNum(adminProfiles[0].sms_finished || "");
      }
    }
  }

  async function fetchClients() {
    const { data } = await supabase.from("clients").select("*").order("surname");
    setClients(data || []);
  }

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("*");
    setAllPatients(data || []);
  }

  async function fetchEntries() {
    const { data } = await supabase
      .from("diary_entries")
      .select(`*, clients(name, surname, phone, address, city, postcode), patients(name, species)`)
      .eq("user_id", selectedUserId)
      .eq("date", selectedDate)
      .order("created_at", { ascending: true });
    setEntries(data || []);
  }

  async function saveEntry() {
    if (!title && !clientId && !patientId) return setAlertMessage("Please provide a Title, or link a Client/Patient.");
    
    const combinedTime = (startTime && endTime) ? `${startTime} - ${endTime}` : (startTime || endTime || "");

    const payload = {
      user_id: selectedUserId, date: selectedDate, time_range: combinedTime, entry_type: entryType,
      client_id: clientId || null, patient_id: patientId || null, title, notes, phone, address
    };

    if (isEditing) {
      await supabase.from("diary_entries").update(payload).eq("id", editId);
      setSuccessMessage("Diary entry updated successfully!");
    } else {
      await supabase.from("diary_entries").insert([payload]);
      setSuccessMessage("Diary entry added successfully!");
    }

    resetForm();
    fetchEntries();
  }

  async function confirmDeleteEntry() {
    if (!entryToDelete) return;
    await supabase.from("diary_entries").delete().eq("id", entryToDelete.id);
    setEntryToDelete(null);
    setViewEntry(null);
    fetchEntries();
  }

  // --- AUTOMATED MESSAGING & STATUS UPDATE ---
  async function handleStatusUpdate(entry, newStatus) {
    const { error } = await supabase.from("diary_entries").update({ status: newStatus }).eq("id", entry.id);
    
    if (error) {
      setAlertMessage("Error updating status: " + error.message + " (Note: Make sure a 'status' text column exists in the diary_entries table in Supabase).");
      return;
    }

    // Update Local States instantly
    setViewEntry({ ...entry, status: newStatus });
    setEntries(entries.map(e => e.id === entry.id ? { ...e, status: newStatus } : e));

    // Construct automated message using Admin-Configured Numbers
    const clientName = entry.clients?.name || "Client";
    const clientSurname = entry.clients?.surname || "";
    const patientName = entry.patients?.name || "Unknown Pet";
    
    let text = "";
    let targetPhone = "";
    
    if (newStatus === "Arrived") {
       targetPhone = smsArrivedNum;
       text = `[Alert] A team member has ARRIVED for the appointment with ${clientName} ${clientSurname} (Pet: ${patientName}).`;
    } else if (newStatus === "Finished") {
       targetPhone = smsFinishedNum;
       text = `[Alert] A team member has FINISHED the appointment with ${clientName} ${clientSurname} (Pet: ${patientName}).`;
    }
    
    if (targetPhone) {
       // Use standard SMS URI scheme
       window.location.href = `sms:${targetPhone}?body=${encodeURIComponent(text)}`;
    } else {
       setSuccessMessage(`Appointment marked as ${newStatus}. (No SMS alert sent because the notification number is not set in the Admin Dashboard).`);
    }
  }

  function startEdit(entry) {
    setIsEditing(true); 
    setEditId(entry.id); 
    
    const times = entry.time_range ? entry.time_range.split(" - ") : ["", ""];
    setStartTime(times[0] || "");
    setEndTime(times[1] || "");

    setEntryType(entry.entry_type || "Euthanasia");
    setClientId(entry.client_id || ""); 
    setPatientId(entry.patient_id || ""); 
    setTitle(entry.title || ""); 
    setNotes(entry.notes || "");
    setPhone(entry.phone || ""); 
    setAddress(entry.address || "");
    setViewEntry(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setIsEditing(false); setEditId(null); setStartTime(""); setEndTime(""); setEntryType("Euthanasia");
    setClientId(""); setPatientId(""); setTitle(""); setNotes(""); setPhone(""); setAddress("");
  }

  function handleClientChange(e) { setClientId(e.target.value); setPatientId(""); }
  function changeDate(days) { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d.toISOString().split("T")[0]); }
  function setToday() { setSelectedDate(new Date().toISOString().split("T")[0]); }

  const availablePatients = allPatients.filter(p => p.client_id === clientId);

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Diary...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      
      <div className="card" style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <strong style={{ minWidth: "50px", color: "#666" }}>User:</strong>
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={!isAdmin} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: isAdmin ? "white" : "#f1f1f1" }}>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
          <button onClick={() => changeDate(-1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#5b8fb9", fontWeight: "bold" }}>{"<"}</button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ border: "none", background: "transparent", fontSize: "16px", fontWeight: "bold", color: "#333", outline: "none" }} />
          <button onClick={() => changeDate(1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#5b8fb9", fontWeight: "bold" }}>{">"}</button>
          <button onClick={setToday} style={{ ...blueBtn, minWidth: "auto", padding: "5px 12px" }}>Today</button>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ border: isEditing ? "2px solid #f39c12" : "none" }}>
          <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Diary Entry" : "Add Diary Entry"}</h3>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ display: "flex", gap: "5px", flex: 1 }}>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <span style={{ display: "flex", alignItems: "center", marginBottom: "10px", fontWeight: "bold", color: "#95a5a6" }}>-</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            
            <select value={entryType} onChange={e => setEntryType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="Working Status">Working Status</option>
              <option value="Euthanasia">Euthanasia</option>
              <option value="Consultation">Consultation</option>
            </select>
          </div>
          
          <select value={clientId} onChange={handleClientChange} style={inputStyle}>
            <option value="">-- Link to Existing Client (Optional) --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
          </select>

          {clientId && (
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={{...inputStyle, background: "#fafffb", borderColor: "#27ae60"}}>
              <option value="">-- Select Patient (Optional) --</option>
              {availablePatients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
            </select>
          )}

          <input placeholder="Custom Title / Description" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <textarea placeholder="Notes / Details..." rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
          
          {!clientId && <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Manual Contact Info</div>}
          <input placeholder="Phone Number Override" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          <input placeholder="Address Override" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
          
          <div style={btnRow}>
            <button onClick={saveEntry} style={{ ...greenBtn, flex: 1 }}>{isEditing ? "Update Entry" : "Save to Diary"}</button>
            {isEditing && <button onClick={resetForm} style={{ ...redBtn, flex: 1 }}>Cancel</button>}
          </div>
        </div>
      )}

      <div style={greyBox}>
        <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Diary for {new Date(selectedDate).toLocaleDateString('en-GB')}</h3>
        {entries.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No entries for this date.</p>}

        {entries.map(entry => {
          const isEuth = entry.entry_type === "Euthanasia";
          const isConsult = entry.entry_type === "Consultation";
          
          // Apply orange to Euth, theme blue to Consult, and grey to anything else (Working Status)
          const badgeColor = isEuth ? "#f39c12" : isConsult ? "#5b8fb9" : "#95a5a6";
          
          let mainHeader = entry.title || "Untitled Entry";
          if (entry.patients) {
             mainHeader = `${entry.patients.name} (${entry.patients.species})`;
             if (entry.title) mainHeader += ` - ${entry.title}`;
          }
          const clientSubHeader = entry.clients ? `Client: ${entry.clients.name} ${entry.clients.surname}` : "";

          return (
            <div key={entry.id} style={{ ...whiteShadowBox, borderLeft: `6px solid ${badgeColor}` }} onClick={() => setViewEntry(entry)}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                <span style={{ background: `${badgeColor}22`, color: badgeColor, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                  {entry.entry_type}
                </span>
                {entry.time_range && <span style={{ color: "#666", fontSize: "14px" }}>{entry.time_range}</span>}
                {entry.status === "Arrived" && <span style={{ color: "#27ae60", fontSize: "12px", fontWeight: "bold", marginLeft: "auto" }}>• Arrived</span>}
                {entry.status === "Finished" && <span style={{ color: "#7f8c8d", fontSize: "12px", fontWeight: "bold", marginLeft: "auto" }}>• Finished</span>}
              </div>
              <strong style={{ fontSize: "18px", color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
                {mainHeader}
                {isEuth && <img src={syringeIcon} alt="Euthanasia" style={{ width: "20px", height: "20px" }} />}
                {isConsult && <img src={stethoscopeIcon} alt="Consultation" style={{ width: "20px", height: "20px" }} />}
              </strong>
              {clientSubHeader && <div style={{ color: "#7f8c8d", fontSize: "14px", fontWeight: "500" }}>{clientSubHeader}</div>}
              {entry.notes && <div style={{ color: "#555", fontSize: "15px", lineHeight: "1.5", whiteSpace: "pre-wrap", marginTop: "5px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.notes}</div>}
            </div>
          );
        })}
      </div>

      {/* POP-UP MODAL FOR DIARY DETAILS */}
      {viewEntry && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setViewEntry(null)}>
          <div style={{ background: "white", padding: "20px", borderRadius: "15px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewEntry(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "#5b8fb9", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
            
            <h2 style={{ marginTop: 0, color: "#2c3e50", display: "flex", alignItems: "center", gap: "10px" }}>
              {viewEntry.entry_type} Details
              {viewEntry.entry_type === "Euthanasia" && <img src={syringeIcon} alt="Euthanasia" style={{ width: "24px", height: "24px" }} />}
              {viewEntry.entry_type === "Consultation" && <img src={stethoscopeIcon} alt="Consultation" style={{ width: "24px", height: "24px" }} />}
            </h2>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>{selectedDate} | {viewEntry.time_range}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f8f9fb", padding: "15px", borderRadius: "10px" }}>
              {viewEntry.clients && <p style={{ margin: 0 }}><strong>Client:</strong> {viewEntry.clients.name} {viewEntry.clients.surname}</p>}
              {viewEntry.patients && <p style={{ margin: 0 }}><strong>Pet:</strong> {viewEntry.patients.name} ({viewEntry.patients.species})</p>}
              {viewEntry.title && !viewEntry.patients && <p style={{ margin: 0 }}><strong>Title:</strong> {viewEntry.title}</p>}
              
              {(() => {
                const displayPhone = viewEntry.clients?.phone || viewEntry.phone;
                return (
                  <p style={{ margin: 0 }}>
                    <strong>Phone:</strong> {displayPhone ? (
                      <a href={`tel:${displayPhone}`} style={{ color: "#3498db", textDecoration: "none", fontWeight: "bold" }}>
                        {displayPhone}
                      </a>
                    ) : "N/A"}
                  </p>
                );
              })()}
              
              <div style={{ margin: 0 }}>
                <strong>Notes:</strong>
                <p style={{ margin: "5px 0 0 0", whiteSpace: "pre-wrap", color: "#444" }}>{viewEntry.notes || "None"}</p>
              </div>
            </div>

            {/* --- STATUS & MESSAGING ACTIONS --- */}
            <div style={{ marginTop: "15px", padding: "15px", background: viewEntry.status === "Finished" ? "#f8f9fb" : "#f0fdf4", borderRadius: "10px", border: viewEntry.status === "Finished" ? "1px solid #eee" : "1px solid #bbf7d0" }}>
              <strong style={{ display: "block", marginBottom: "10px", color: viewEntry.status === "Finished" ? "#7f8c8d" : "#27ae60" }}>
                Appointment Status: {viewEntry.status || "Scheduled"}
              </strong>
              
              {(viewEntry.status !== "Arrived" && viewEntry.status !== "Finished") && (
                <button onClick={() => handleStatusUpdate(viewEntry, "Arrived")} style={{ ...greenBtn, width: "100%", padding: "12px", fontSize: "14px" }}>
                  📍 Mark as Arrived & Send Alert
                </button>
              )}

              {viewEntry.status === "Arrived" && (
                <button onClick={() => handleStatusUpdate(viewEntry, "Finished")} style={{ ...blueBtn, width: "100%", padding: "12px", fontSize: "14px" }}>
                  ✅ Mark as Finished & Send Alert
                </button>
              )}

              {viewEntry.status === "Finished" && (
                <div style={{ color: "#7f8c8d", fontSize: "13px", fontStyle: "italic" }}>
                  This appointment has been completed.
                </div>
              )}
            </div>

            {/* GOOGLE MAP EMBED */}
            {(() => {
              const addr = viewEntry.clients?.address ? `${viewEntry.clients.address}, ${viewEntry.clients.city || ''} ${viewEntry.clients.postcode || ''}` : viewEntry.address;
              if (addr) {
                return (
                  <div style={{ marginTop: "15px" }}>
                    <strong>Location:</strong> {addr}
                    <div style={{ marginTop: "10px", borderRadius: "10px", overflow: "hidden", border: "1px solid #ccc" }}>
                      <iframe 
                        width="100%" 
                        height="200" 
                        frameBorder="0" 
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`} 
                        title="map"
                      ></iframe>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexDirection: "column" }}>
              {viewEntry.client_id && (
                <button onClick={() => navigate(`/client/${viewEntry.client_id}`)} style={{ ...darkBtn, width: "100%", padding: "12px", fontSize: 0 }}>
                  <img src={fileIcon} alt="" style={{ width: "22px", height: "22px", marginRight: "8px", objectFit: "contain" }} />
                  <span style={{ fontSize: "13px" }}>Go to Client File</span>
                </button>
              )}
              {isAdmin && (
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={() => startEdit(viewEntry)} style={{ ...blueBtn, flex: 1 }}>Edit</button>
                  <button onClick={() => setEntryToDelete(viewEntry)} style={{ ...redBtn, flex: 1 }}>Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL FOR DIARY DETAILS DELETION */}
      {entryToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setEntryToDelete(null)}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>⚠️ Confirm Deletion</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete this diary entry?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmDeleteEntry} style={redBtn}>Yes, Delete</button>
              <button onClick={() => setEntryToDelete(null)} style={greyBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {successMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setSuccessMessage("")}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#27ae60", marginTop: 0 }}>✓ Success</h2>
            <p style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
              {successMessage}
            </p>
            <button onClick={() => setSuccessMessage("")} style={{ ...greenBtn, width: "100%" }}>
              OK
            </button>
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

    </div>
  );
}