import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

// --- STYLING CONSTANTS ---
const greyBox = { background: "#f8f9fb", padding: "20px", borderRadius: "20px", marginTop: "20px" };
const whiteShadowBox = { background: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };

export default function Home() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [profiles, setProfiles] = useState([]);
  const [clients, setClients] = useState([]); 
  const [allPatients, setAllPatients] = useState([]);
  const [entries, setEntries] = useState([]);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); 
  
  const [viewEntry, setViewEntry] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [timeRange, setTimeRange] = useState("");
  const [entryType, setEntryType] = useState("Euthanasia");
  const [clientId, setClientId] = useState(""); 
  const [patientId, setPatientId] = useState(""); 
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    checkUserAndAdmin();
    fetchClients(); 
    fetchPatients(); 
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
    if (!title && !clientId && !patientId) return alert("Please provide a Title, or link a Client/Patient.");
    const payload = {
      user_id: selectedUserId, date: selectedDate, time_range: timeRange, entry_type: entryType,
      client_id: clientId || null, patient_id: patientId || null, title, notes, phone, address
    };

    if (isEditing) await supabase.from("diary_entries").update(payload).eq("id", editId);
    else await supabase.from("diary_entries").insert([payload]);

    resetForm();
    fetchEntries();
  }

  async function deleteEntry(id) {
    if (!window.confirm("Delete this diary entry?")) return;
    await supabase.from("diary_entries").delete().eq("id", id);
    fetchEntries();
    setViewEntry(null);
  }

  function startEdit(entry) {
    setIsEditing(true); setEditId(entry.id); setTimeRange(entry.time_range || ""); setEntryType(entry.entry_type || "Euthanasia");
    setClientId(entry.client_id || ""); setPatientId(entry.patient_id || ""); setTitle(entry.title || ""); setNotes(entry.notes || "");
    setPhone(entry.phone || ""); setAddress(entry.address || "");
    setViewEntry(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setIsEditing(false); setEditId(null); setTimeRange(""); setEntryType("Euthanasia");
    setClientId(""); setPatientId(""); setTitle(""); setNotes(""); setPhone(""); setAddress("");
  }

  function handleClientChange(e) { setClientId(e.target.value); setPatientId(""); }
  function changeDate(days) { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d.toISOString().split("T")[0]); }
  function setToday() { setSelectedDate(new Date().toISOString().split("T")[0]); }

  const availablePatients = allPatients.filter(p => p.client_id === clientId);

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
          <button onClick={setToday} style={{ border: "none", background: "#eee", padding: "5px 10px", borderRadius: "5px", fontSize: "12px", cursor: "pointer" }}>Today</button>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ border: isEditing ? "2px solid #f39c12" : "none" }}>
          <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Diary Entry" : "Add Diary Entry"}</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <input placeholder="Time (e.g. 08:00 - 10:00)" value={timeRange} onChange={e => setTimeRange(e.target.value)} style={inputStyle} />
            <select value={entryType} onChange={e => setEntryType(e.target.value)} style={inputStyle}>
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
            <button onClick={saveEntry} style={{ ...blueBtn, background: "#27ae60" }}>{isEditing ? "Update Entry" : "Save to Diary"}</button>
            {isEditing && <button onClick={resetForm} style={redBtn}>Cancel</button>}
          </div>
        </div>
      )}

      <div style={greyBox}>
        <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Diary for {new Date(selectedDate).toLocaleDateString('en-GB')}</h3>
        {entries.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No entries for this date.</p>}

        {entries.map(entry => {
          const isEuth = entry.entry_type === "Euthanasia";
          const badgeColor = isEuth ? "#f39c12" : "#95a5a6";
          
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
              </div>
              <strong style={{ fontSize: "18px", color: "#333", display: "flex", alignItems: "center", gap: "5px" }}>
                {isEuth && "💔👍"} {mainHeader}
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
            <button onClick={() => setViewEntry(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "#eee", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold" }}>X</button>
            
            <h2 style={{ marginTop: 0, color: "#2c3e50" }}>{viewEntry.entry_type} Details</h2>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>{selectedDate} | {viewEntry.time_range}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f8f9fb", padding: "15px", borderRadius: "10px" }}>
              {viewEntry.clients && <p style={{ margin: 0 }}><strong>Client:</strong> {viewEntry.clients.name} {viewEntry.clients.surname}</p>}
              {viewEntry.patients && <p style={{ margin: 0 }}><strong>Pet:</strong> {viewEntry.patients.name} ({viewEntry.patients.species})</p>}
              {viewEntry.title && !viewEntry.patients && <p style={{ margin: 0 }}><strong>Title:</strong> {viewEntry.title}</p>}
              
              {/* CLICKABLE PHONE NUMBER */}
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
                <button onClick={() => navigate(`/client/${viewEntry.client_id}`)} style={{ ...blueBtn, background: "#2c3e50", padding: "12px", fontSize: "16px" }}>
                  📂 Go to Client File
                </button>
              )}
              {isAdmin && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => startEdit(viewEntry)} style={blueBtn}>Edit</button>
                  <button onClick={() => deleteEntry(viewEntry.id)} style={redBtn}>Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}