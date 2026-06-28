import { useEffect, useState } from "react";

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
  padding: "24px",
  maxWidth: "720px",
  margin: "20px auto",
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
  margin: "0 0 20px",
  fontSize: "15px",
};

const segmentedStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid #d6e6f1",
  borderRadius: "18px",
  padding: "8px",
};

function optionButtonStyle(active) {
  return {
    width: "100%",
    minHeight: "96px",
    borderRadius: "14px",
    border: active ? "2px solid #5b8fb9" : "1px solid #d6e6f1",
    background: active ? "#5b8fb9" : "white",
    color: active ? "white" : "#2f5f7f",
    boxShadow: active ? "0 8px 20px rgba(91,143,185,0.24)" : "0 2px 8px rgba(47,65,83,0.06)",
    cursor: "pointer",
    padding: "14px 12px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    boxSizing: "border-box",
  };
}

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
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Settings</h1>
        <p style={helperStyle}>
          Choose which navigation menu the app should use on this device. The setting is saved locally.
        </p>

        <h2 style={{ color: "#2f4153", fontSize: "18px", margin: "0 0 12px" }}>Menu layout</h2>
        <div style={segmentedStyle}>
          <button type="button" onClick={() => setMenuStyle("web")} style={optionButtonStyle(menuStyle === "web")}>
            <span style={{ fontSize: "22px", fontWeight: 800 }}>Web</span>
            <span style={{ fontSize: "12px", lineHeight: 1.35, opacity: menuStyle === "web" ? 0.95 : 0.72 }}>
              Horizontal App.jsx menu
            </span>
          </button>

          <button type="button" onClick={() => setMenuStyle("mobile")} style={optionButtonStyle(menuStyle === "mobile")}>
            <span style={{ fontSize: "22px", fontWeight: 800 }}>Mobile</span>
            <span style={{ fontSize: "12px", lineHeight: 1.35, opacity: menuStyle === "mobile" ? 0.95 : 0.72 }}>
              Bottom AppMobile.jsx menu
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
