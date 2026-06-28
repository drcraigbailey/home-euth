import { useEffect, useState } from "react";

const MENU_PREF_KEY = "sp-home-menu-style";

const cardStyle = {
  background: "white",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  padding: "20px",
  maxWidth: "720px",
  margin: "20px auto",
};

const optionStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  border: "1px solid #d9e7f0",
  borderRadius: "12px",
  padding: "14px",
  marginTop: "12px",
};

const buttonStyle = {
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  padding: "8px 14px",
  fontSize: "12px",
  minWidth: "110px",
};

function normaliseMenuStyle(value) {
  if (value === "mobile" || value === "app1") return "mobile";
  return "web";
}

function getInitialMenuStyle() {
  if (typeof window === "undefined") return "web";
  return normaliseMenuStyle(window.localStorage.getItem(MENU_PREF_KEY));
}

export default function Settings() {
  const [menuStyle, setMenuStyle] = useState(getInitialMenuStyle);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MENU_PREF_KEY, menuStyle);
      window.dispatchEvent(new CustomEvent("menu-style-changed", { detail: { menuStyle } }));
    }
  }, [menuStyle]);

  return (
    <div style={{ padding: "18px", background: "#f8f9fb", minHeight: "calc(100vh - 70px)" }}>
      <div style={cardStyle}>
        <h1 style={{ color: "#2f5f7f", marginTop: 0 }}>Settings</h1>
        <p style={{ color: "#52616b", lineHeight: 1.5 }}>
          Choose which navigation menu the app should use on this device. The setting is saved locally.
        </p>

        <div style={optionStyle}>
          <div>
            <strong style={{ color: "#2f5f7f" }}>Web</strong>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
              Uses the current App.jsx horizontal menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuStyle("web")}
            style={{ ...buttonStyle, background: menuStyle === "web" ? "#5b8fb9" : "#e5edf4", color: menuStyle === "web" ? "white" : "#2f5f7f" }}
          >
            {menuStyle === "web" ? "Selected" : "Use this"}
          </button>
        </div>

        <div style={optionStyle}>
          <div>
            <strong style={{ color: "#2f5f7f" }}>Mobile</strong>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
              Uses the AppMobile.jsx compact mobile menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuStyle("mobile")}
            style={{ ...buttonStyle, background: menuStyle === "mobile" ? "#5b8fb9" : "#e5edf4", color: menuStyle === "mobile" ? "white" : "#2f5f7f" }}
          >
            {menuStyle === "mobile" ? "Selected" : "Use this"}
          </button>
        </div>
      </div>
    </div>
  );
}
