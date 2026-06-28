// Login.jsx
import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader"; // <-- 1. Import Loader
import { isNetworkOnline } from "../lib/networkStatus";

// Import the image directly
import logoImage from "../assets/logo.png";

// SVG Icons
const EyeIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>);
const EyeSlashIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.6818 3.9691 7.65663 6.06 6.06"/><path d="M9.88 9.88C9.30811 10.362 8.91893 11.0211 8.77583 11.7249C8.63273 12.4287 8.7423 13.159 9.0874 13.8052C9.4325 14.4514 9.99811 14.9818 10.6974 15.3134C11.3967 15.6451 12.1979 15.7628 12.9774 15.6481C13.757 15.5333 14.4796 15.1916 15.0354 14.6738C15.5913 14.156 15.955 13.4862 16.071 12.7667C16.1869 12.0471 16.0501 11.3099 15.6811 10.6685C15.3121 10.0271 14.7275 9.50917 14.015 9.19"/><path d="M1 1L23 23"/></svg>);

// Strict uniform button properties copied from Admin Dashboard layout
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };
const blueBtn = { background: "#5b8fb9", color: "white", ...standardBtnProps };

export default function Login() {
  const [isLoading, setIsLoading] = useState(false); // <-- 2. Add loading state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Custom Modal State
  const [alertMessage, setAlertMessage] = useState("");

  async function handleLogin() {
    if (!isNetworkOnline()) {
      setAlertMessage("Login requires an internet connection. If you have signed in on this device before, return to the app while your saved session is still valid.");
      return;
    }
    setIsLoading(true); // <-- 3. Start loading when button is clicked
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false); // <-- 4. Stop loading once Supabase responds

    if (error) {
      setAlertMessage(error.message);
      return;
    }
    navigate("/");
  }

  // <-- 5. Show the Loader UI while signing in
  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Signing in...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "8vh" }}>
      
      {/* Page Header */}
      <div style={{ textAlign: "center", marginBottom: "30px", position: "relative", zIndex: 1 }}>
        <h1 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "32px", fontWeight: "700" }}>Welcome</h1>
        <p style={{ color: "#7f8c8d", fontSize: "16px", margin: 0 }}>Please sign in to continue</p>
        {!isNetworkOnline() && <p style={{ color: "#9a6b16", fontSize: "13px", margin: "10px 0 0" }}>You are offline. A new login requires internet access.</p>}
      </div>

      {/* Main Login Card - Utilizing index.css .card class */}
      <div className="card" style={{ 
        width: "100%", 
        maxWidth: "400px", 
        padding: "40px 30px", 
        position: "relative",
        overflow: "hidden" 
      }}>
        
        {/* Watermark Logo */}
        <img 
          src={logoImage} 
          alt="Watermark Logo" 
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "85%", 
            opacity: 0.2, 
            pointerEvents: "none", 
            zIndex: 0
          }} 
        />

        {/* Email Row */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Email Address</label>
          <input
            placeholder="doctor@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              background: "rgba(255, 255, 255, 0.8)", 
              backdropFilter: "blur(4px)",
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box"
            }}
          />
        </div>
        
        {/* Password Row */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: "35px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Password</label>
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(4px)",
                paddingRight: "50px",
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box"
              }}
            />
            {/* Eye Icon Toggle */}
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ 
                position: "absolute",
                right: "15px",
                background: "transparent", 
                border: "none", 
                cursor: "pointer", 
                padding: "0", 
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                outline: "none",
                width: "auto"
              }}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <button onClick={handleLogin} style={{ ...blueBtn, width: "100%" }}>
            Sign In
          </button>
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
            <button onClick={() => setAlertMessage("")} style={{ ...blueBtn, width: "100%" }}>OK</button>
          </div>
        </div>
      )}

    </div>
  );
}
