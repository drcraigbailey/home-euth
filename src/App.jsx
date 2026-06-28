import { useEffect, useState } from "react";
import AppWeb from "./AppWeb";
import AppMobile from "./Appm";

const MENU_PREF_KEY = "sp-home-menu-style";

function normaliseMenuStyle(value) {
  if (value === "mobile" || value === "app1") return "mobile";
  return "web";
}

function getSavedMenuStyle() {
  if (typeof window === "undefined") return "web";
  return normaliseMenuStyle(window.localStorage.getItem(MENU_PREF_KEY));
}

export default function App() {
  const [menuStyle, setMenuStyle] = useState(getSavedMenuStyle);

  useEffect(() => {
    function handleMenuStyleChange(event) {
      setMenuStyle(normaliseMenuStyle(event?.detail?.menuStyle || getSavedMenuStyle()));
    }

    window.addEventListener("menu-style-changed", handleMenuStyleChange);
    window.addEventListener("storage", handleMenuStyleChange);
    return () => {
      window.removeEventListener("menu-style-changed", handleMenuStyleChange);
      window.removeEventListener("storage", handleMenuStyleChange);
    };
  }, []);

  return menuStyle === "mobile" ? <AppMobile /> : <AppWeb />;
}
