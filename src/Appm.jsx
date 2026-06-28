// Appm.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import Loader from "./Loader";
import OfflineStatusBanner from "./components/OfflineStatusBanner";
import companyLogo from "./assets/logo.png";

import { App as CapacitorApp } from "@capacitor/app";

import {
  Home as HomeIcon,
  Users,
  PawPrint,
  Syringe,
  Menu,
  LogOut,
  Shield,
  Package,
  BookOpen,
  Settings as SettingsIcon
} from "lucide-react";

// pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import Patients from "./pages/Patients";
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail";
import Sedation from "./pages/Sedation";
import Products from "./pages/Products";
import Library from "./pages/Library";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";

const BLUE = "#5b8fb9";
const DARK = "#2c3e50";
const RED = "#e74c3c";

// ---------- Scroll to top ----------
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0,0);
  }, [pathname]);

  return null;
}

// ---------- Protected Route ----------
function ProtectedRoute({children}) {
  const [session,setSession]=useState(undefined);

  useEffect(()=>{
    supabase.auth.getSession()
    .then(({data})=>{
      setSession(data.session)
    });

    const {data:listener} = supabase.auth.onAuthStateChange(
      (_event,session)=>{
        setSession(session)
      }
    );

    return ()=>listener.subscription.unsubscribe();
  },[]);

  if(session===undefined){
    return(
      <div
      style={{
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        minHeight:"100vh",
        background:"#f8f9fb"
      }}
      >
        <Loader/>
        <p
        style={{
          marginTop:"15px",
          color:BLUE,
          fontWeight:"bold"
        }}
        >
          Authenticating...
        </p>
      </div>
    )
  }

  if(!session){
    return <Navigate to="/login" replace/>
  }

  return children;
}

function BrandBar() {
  const location = useLocation();
  if(location.pathname === "/login") return null;

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 999,
      background: "rgba(255,255,255,.97)",
      borderBottom: "1px solid rgba(91,143,185,.18)",
      boxShadow: "0 4px 16px rgba(47,65,83,.08)",
      padding: "calc(8px + env(safe-area-inset-top, 0px)) 14px 8px",
      backdropFilter: "blur(12px)"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        minHeight: "44px"
      }}>
        <img
          src={companyLogo}
          alt="SP Home Euthanasia logo"
          style={{ width: "38px", height: "38px", objectFit: "contain", borderRadius: "9px", flexShrink: 0 }}
        />
        <strong style={{ color: DARK, fontSize: "19px", lineHeight: 1.15, textAlign: "center" }}>
          SP Home Euthanasia
        </strong>
      </div>
    </div>
  );
}

// ---------- Bottom mobile navbar ----------
function Navbar(){
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(()=>{
    async function checkAdmin(){
      const { data:{session} }=await supabase.auth.getSession();
      if(session?.user){
        const {data}=await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id",session.user.id)
        .single();

        setIsAdmin(!!data?.is_admin);
      }
    }
    checkAdmin();
  },[location.pathname]);

  async function logout(){
    await supabase.auth.signOut();
    window.location.href="/login";
  }

  if(location.pathname === "/login"){
    return null;
  }

  const moreActive = ["/products", "/library", "/settings", "/admin"].some((path) => location.pathname.startsWith(path));

  return(
    <>
      <style>{`
        body { padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px)); }
      `}</style>

      {showMenu && (
        <div style={{
          position: "fixed",
          right: "12px",
          bottom: "calc(86px + env(safe-area-inset-bottom, 0px))",
          background: "white",
          borderRadius: "18px",
          padding: "10px",
          boxShadow: "0 10px 35px rgba(0,0,0,.18)",
          zIndex: 2000,
          width: "210px"
        }}>
          <NavLink to="/products" style={menuItemStyle} onClick={()=>setShowMenu(false)}><Package size={20}/>Products</NavLink>
          <NavLink to="/library" style={menuItemStyle} onClick={()=>setShowMenu(false)}><BookOpen size={20}/>Library</NavLink>
          <NavLink to="/settings" style={menuItemStyle} onClick={()=>setShowMenu(false)}><SettingsIcon size={20}/>Settings</NavLink>
          {isAdmin && (
            <NavLink to="/admin" style={{...menuItemStyle, color:RED, fontWeight:"bold"}} onClick={()=>setShowMenu(false)}>
              <Shield size={20} color={RED}/>Admin
            </NavLink>
          )}
          <button onClick={logout} style={{...menuItemStyle, width:"100%", border:"none", background:"transparent"}}>
            <LogOut size={20}/>Logout
          </button>
        </div>
      )}

      <nav style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "calc(76px + env(safe-area-inset-bottom, 0px))",
        padding: "8px 8px calc(7px + env(safe-area-inset-bottom, 0px))",
        background: "rgba(255,255,255,.97)",
        borderTop: "1px solid rgba(91,143,185,.22)",
        boxShadow: "0 -8px 24px rgba(47,65,83,.12)",
        zIndex: 1000,
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        alignItems: "center",
        gap: "2px",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <BottomNavLink to="/" end icon={<HomeIcon size={25}/>} label="Home" onClick={()=>setShowMenu(false)} />
        <BottomNavLink to="/clients" icon={<Users size={25}/>} label="Clients" onClick={()=>setShowMenu(false)} />
        <BottomNavLink to="/patients" icon={<PawPrint size={25}/>} label="Patients" onClick={()=>setShowMenu(false)} />
        <BottomNavLink to="/sedation" icon={<Syringe size={25}/>} label="Sedation" onClick={()=>setShowMenu(false)} />
        <button onClick={()=>setShowMenu(!showMenu)} style={bottomButtonStyle(showMenu || moreActive)}>
          <Menu size={26}/>
          <span>More</span>
        </button>
      </nav>
    </>
  )
}

function BottomNavLink({ to, end, icon, label, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} style={({isActive}) => bottomLinkStyle(isActive)}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

const bottomLinkStyle = (isActive) => ({
  minWidth: 0,
  textDecoration: "none",
  color: isActive ? DARK : BLUE,
  fontWeight: isActive ? "bold" : "normal",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "3px",
  fontSize: "12px",
  lineHeight: 1.05,
  overflow: "hidden",
  whiteSpace: "nowrap"
});

const bottomButtonStyle = (active) => ({
  minWidth: 0,
  border: "none",
  background: "transparent",
  color: active ? DARK : BLUE,
  fontWeight: active ? "bold" : "normal",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "3px",
  fontSize: "12px",
  lineHeight: 1.05,
  cursor: "pointer",
  padding: 0,
  overflow: "hidden",
  whiteSpace: "nowrap"
});

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 12px",
  textDecoration: "none",
  borderRadius: "12px",
  color: DARK,
  cursor: "pointer",
  fontSize: "15px",
  textAlign: "left",
  boxSizing: "border-box"
};

// ---------- Hardware Back Button ----------
function BackButtonHandler(){
  const navigate=useNavigate();
  const location=useLocation();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => { currentPathRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    const setupHardwareLink = async () => {
      return await CapacitorApp.addListener('backButton', () => {
        const path = currentPathRef.current;
        if(path==="/" || path==="/login") CapacitorApp.exitApp();
        else if(path.startsWith("/patient/")) navigate("/patients");
        else if(path.startsWith("/client/")) navigate("/clients");
        else navigate(-1);
      });
    };
    const initiationPromise = setupHardwareLink();
    return () => { initiationPromise.then(handler => { if(handler) handler.remove(); }); };
  }, [navigate]);
  return null;
}

// ---------- App ----------
export default function Appm(){
  return (
    <Router>
      <ScrollToTop />
      <BackButtonHandler />
      <BrandBar />
      <OfflineStatusBanner />
      <div style={{ paddingTop: "16px", paddingBottom: "20px" }}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<ProtectedRoute><Home/></ProtectedRoute>}/>
          <Route path="/clients" element={<ProtectedRoute><Clients/></ProtectedRoute>}/>
          <Route path="/client/:id" element={<ProtectedRoute><ClientDetail/></ProtectedRoute>}/>
          <Route path="/patient/:id" element={<ProtectedRoute><PatientDetail/></ProtectedRoute>}/>
          <Route path="/patients" element={<ProtectedRoute><Patients/></ProtectedRoute>}/>
          <Route path="/sedation" element={<ProtectedRoute><Sedation/></ProtectedRoute>}/>
          <Route path="/sedation/:id" element={<ProtectedRoute><Sedation/></ProtectedRoute>}/>
          <Route path="/products" element={<ProtectedRoute><Products/></ProtectedRoute>}/>
          <Route path="/library" element={<ProtectedRoute><Library/></ProtectedRoute>}/>
          <Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>}/>
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard/></ProtectedRoute>}/>
        </Routes>
      </div>
      <Navbar />
    </Router>
  )
}
