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

function getInitialMenuStyle() {
  if (typeof window === "undefined") return "app";
  return window.localStorage.getItem(MENU_PREF_KEY) || "app";
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
            <strong style={{ color: "#2f5f7f" }}>App.jsx menu</strong>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
              The current horizontal scroll menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuStyle("app")}
            style={{ ...buttonStyle, background: menuStyle === "app" ? "#5b8fb9" : "#e5edf4", color: menuStyle === "app" ? "white" : "#2f5f7f" }}
          >
            {menuStyle === "app" ? "Selected" : "Use this"}
          </button>
        </div>

        <div style={optionStyle}>
          <div>
            <strong style={{ color: "#2f5f7f" }}>App1.jsx menu</strong>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
              Alternative compact menu using the same app sections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuStyle("app1")}
            style={{ ...buttonStyle, background: menuStyle === "app1" ? "#5b8fb9" : "#e5edf4", color: menuStyle === "app1" ? "white" : "#2f5f7f" }}
          >
            {menuStyle === "app1" ? "Selected" : "Use this"}
          </button>
        </div>
      </div>
    </div>
  );
}
