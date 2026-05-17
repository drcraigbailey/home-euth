import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

// SVG Icons
const EyeIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>);
const EyeSlashIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.6818 3.9691 7.65663 6.06 6.06"/><path d="M9.88 9.88C9.30811 10.362 8.91893 11.0211 8.77583 11.7249C8.63273 12.4287 8.7423 13.159 9.0874 13.8052C9.4325 14.4514 9.99811 14.9818 10.6974 15.3134C11.3967 15.6451 12.1979 15.7628 12.9774 15.6481C13.757 15.5333 14.4796 15.1916 15.0354 14.6738C15.5913 14.156 15.955 13.4862 16.071 12.7667C16.1869 12.0471 16.0501 11.3099 15.6811 10.6685C15.3121 10.0271 14.7275 9.50917 14.015 9.19"/><path d="M1 1L23 23"/></svg>);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Custom Modal State
  const [alertMessage, setAlertMessage] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAlertMessage(error.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "10vh" }}>
      <h1 style={{ color: "#2c3e50", marginBottom: "20px" }}>Login</h1>

      <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "30px", borderRadius: "15px", background: "white", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
        
        {/* Email Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px", width: "100%" }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              flex: 1, 
              padding: "12px", 
              boxSizing: "border-box", 
              borderRadius: "8px", 
              border: "1px solid #ccc",
              fontSize: "16px"
            }}
          />
          {/* Invisible spacer so the email box matches the password box width */}
          <div style={{ width: "20px" }}></div> 
        </div>
        
        {/* Password Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px", width: "100%" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              flex: 1, 
              padding: "12px", 
              boxSizing: "border-box", 
              borderRadius: "8px", 
              border: "1px solid #ccc",
              fontSize: "16px"
            }}
          />
          {/* Eye Icon Button */}
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            style={{ 
              width: "20px",
              background: "transparent", 
              border: "none", 
              cursor: "pointer", 
              padding: "0", 
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              outline: "none"
            }}
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Login Button Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          <button 
            onClick={handleLogin} 
            style={{ 
              flex: 1, 
              padding: "14px", 
              cursor: "pointer", 
              background: "#5b8fb9", 
              color: "white", 
              border: "none", 
              borderRadius: "8px", 
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background 0.2s"
            }}>
            Login
          </button>
          {/* Invisible spacer so the button matches the input widths */}
          <div style={{ width: "20px" }}></div>
        </div>

      </div>

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

    </div>
  );
}