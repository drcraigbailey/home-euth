import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const MENU_PREF_KEY = "sp-home-menu-style";

const pageStyle = {
  padding: "18px",
  background: "#f8f9fb",
  minHeight: "calc(100vh - 70px)",
};

const cardStyle = {
  background: "#edf3f7",
  borderRadius: "26px",
  boxShadow: "0 14px 35px rgba(47, 65, 83, 0.08)",
  padding: "22px",
  maxWidth: "720px",
  margin: "20px auto",
};

const sectionStyle = {
  background: "rgba(255,255,255,0.78)",
  border: "1px solid #d6e6f1",
  borderRadius: "18px",
  padding: "16px",
  marginTop: "16px",
};

const titleStyle = {
  color: "#2f4153",
  margin: "0 0 10px",
  fontSize: "28px",
  fontWeight: 800,
};

const helperStyle = {
  color: "#52616b",
  lineHeight: 1.5,
  margin: "0 0 14px",
  fontSize: "15px",
};

const smallToggleWrapStyle = {
  display: "inline-flex",
  gap: "8px",
  background: "white",
  border: "1px solid #d6e6f1",
  borderRadius: "14px",
  padding: "6px",
  boxShadow: "0 2px 8px rgba(47,65,83,0.06)",
};

function smallToggleButtonStyle(active) {
  return {
    borderRadius: "10px",
    border: active ? "1px solid #5b8fb9" : "1px solid transparent",
    background: active ? "#5b8fb9" : "transparent",
    color: active ? "white" : "#2f5f7f",
    cursor: "pointer",
    padding: "7px 14px",
    minWidth: "78px",
    fontSize: "13px",
    fontWeight: 800,
    boxSizing: "border-box",
  };
}

const labelStyle = {
  display: "block",
  color: "#2f4153",
  fontSize: "13px",
  fontWeight: 800,
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d6e6f1",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "15px",
  boxSizing: "border-box",
  background: "white",
  color: "#2f4153",
};

const saveBtnStyle = {
  borderRadius: "10px",
  border: "none",
  background: "#5b8fb9",
  color: "white",
  cursor: "pointer",
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 800,
  minWidth: "96px",
};

function normaliseMenuStyle(value) {
  if (value === "mobile" || value === "app1") return "mobile";
  return "web";
}

function getInitialMenuStyle() {
  if (typeof window === "undefined") return "web";
  return normaliseMenuStyle(window.localStorage.getItem(MENU_PREF_KEY));
}

function cleanUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export default function Settings() {
  const [menuStyle, setMenuStyle] = useState(getInitialMenuStyle);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MENU_PREF_KEY, menuStyle);
      window.dispatchEvent(new CustomEvent("menu-style-changed", { detail: { menuStyle } }));
    }
  }, [menuStyle]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setError("");
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        if (!cancelled) setProfileLoading(false);
        return;
      }

      if (!cancelled) {
        setUserId(user.id);
        setEmail(user.email || "");
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setError("Could not load your profile: " + profileError.message);
      } else {
        setDisplayName(data?.display_name || data?.full_name || "");
        setUsername(data?.username || "");
      }

      setProfileLoading(false);
    }

    loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    setMessage("");
    setError("");

    const payload = {
      id: userId,
      email,
      display_name: displayName.trim(),
      username: cleanUsername(username),
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    setSavingProfile(false);

    if (saveError) {
      setError("Profile not saved: " + saveError.message + ". If this mentions a missing column, run supabase/profile_display_fields.sql first.");
      return;
    }

    setUsername(payload.username);
    setMessage("Profile saved. User pickers will show this name where profile data is used.");
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Settings</h1>
        <p style={helperStyle}>
          Update this device layout and your user profile.
        </p>

        <div style={sectionStyle}>
          <h2 style={{ color: "#2f4153", fontSize: "18px", margin: "0 0 10px" }}>Menu layout</h2>
          <div style={smallToggleWrapStyle}>
            <button type="button" onClick={() => setMenuStyle("web")} style={smallToggleButtonStyle(menuStyle === "web")}>
              Web
            </button>
            <button type="button" onClick={() => setMenuStyle("mobile")} style={smallToggleButtonStyle(menuStyle === "mobile")}>
              Mobile
            </button>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ color: "#2f4153", fontSize: "18px", margin: "0 0 8px" }}>User profile</h2>
          <p style={{ ...helperStyle, marginBottom: "16px" }}>
            This controls how your name appears when staff/users are selected in the app.
          </p>

          {profileLoading ? (
            <p style={{ color: "#52616b", margin: 0 }}>Loading profile...</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dr Craig Bailey"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#5b8fb9", fontWeight: 800 }}>@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(cleanUsername(e.target.value))}
                    placeholder="craig"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input value={email} disabled style={{ ...inputStyle, color: "#7f8c8d", background: "#f8f9fb" }} />
              </div>

              {message && <div style={{ color: "#26733f", fontSize: "13px", fontWeight: 700 }}>{message}</div>}
              {error && <div style={{ color: "#c62828", fontSize: "13px", fontWeight: 700 }}>{error}</div>}

              <div>
                <button type="button" onClick={saveProfile} disabled={savingProfile} style={{ ...saveBtnStyle, opacity: savingProfile ? 0.7 : 1 }}>
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
