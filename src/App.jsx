// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import Loader from "./Loader";
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
  Book,
  Settings
} from "lucide-react";

import logoImage from "./assets/logo.png";

// pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import Patients from "./pages/Patients";
import ClientDetail from "./pages/ClientDetail";
import PatientDetail from "./pages/PatientDetail";
import Sedation from "./pages/Sedation";
import Products from "./pages/Products";
import AdminDashboard from "./pages/AdminDashboard";
import Library from "./pages/Library";

// ---------- Helpers ----------
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0,0); }, [pathname]);
  return null;
}

function ProtectedRoute({children}) {
  const [session,setSession]=useState(undefined);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ setSession(data.session) });
    const {data:listener} = supabase.auth.onAuthStateChange((_event,session)=>{ setSession(session) });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  if(session===undefined) return <div style={{display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}><Loader/></div>;
  if(!session) return <Navigate to="/login" replace/>;
  return children;
}

// ---------- Navigation Components ----------

// 1. Bottom Tab Menu (Mobile)
function BottomNav({ isAdmin, logout, setShowMenu, showMenu, menuRef, moreButtonRef }) {
  return (
    <div style={{position:"fixed", bottom:0, left:0, right:0, margin:"0 auto", width:"100%", maxWidth:"700px", height:"72px", background:"white", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-evenly", alignItems:"center", zIndex:1000}}>
      <NavLink to="/" end style={navStyle}><HomeIcon size={22}/><span>Home</span></NavLink>
      <NavLink to="/clients" style={navStyle}><Users size={22}/><span>Clients</span></NavLink>
      <NavLink to="/patients" style={navStyle}><PawPrint size={22}/><span>Patients</span></NavLink>
      <NavLink to="/sedation" style={navStyle}><Syringe size={22}/><span>Sedation</span></NavLink>
      <button ref={moreButtonRef} onClick={()=>setShowMenu(!showMenu)} style={navButtonReset}>
        <Menu size={22} color="#5b8fb9"/>
        <span style={{fontSize:"12px", color:"#5b8fb9"}}>More</span>
      </button>
    </div>
  );
}

// 2. Side/Classic Menu (Desktop)
function SideNav({ isAdmin, logout, setShowMenu, showMenu, menuRef, moreButtonRef }) {
  return (
    <div style={{position:"fixed", left:0, top:0, bottom:0, width:"200px", background:"white", borderRight:"1px solid #ddd", padding:"20px", display:"flex", flexDirection:"column", gap:"10px", zIndex:1000}}>
      <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"30px"}}>
        <img src={logoImage} alt="logo" style={{height:"30px"}} />
        <h2 style={{margin:0, fontSize:"14px", color:"#5b8fb9"}}>SP Home</h2>
      </div>
      <NavLink to="/" style={sideNavLinkStyle}><HomeIcon size={18}/> Home</NavLink>
      <NavLink to="/clients" style={sideNavLinkStyle}><Users size={18}/> Clients</NavLink>
      <NavLink to="/patients" style={sideNavLinkStyle}><PawPrint size={18}/> Patients</NavLink>
      <NavLink to="/sedation" style={sideNavLinkStyle}><Syringe size={18}/> Sedation</NavLink>
      <NavLink to="/products" style={sideNavLinkStyle}><Package size={18}/> Products</NavLink>
      <NavLink to="/library" style={sideNavLinkStyle}><Book size={18}/> Library</NavLink>
      {isAdmin && <NavLink to="/admin" style={{...sideNavLinkStyle, color:"#e74c3c"}}><Shield size={18}/> Admin</NavLink>}
      <div style={{marginTop:"auto"}}>
        <button onClick={logout} style={{...sideNavLinkStyle, background:"transparent", border:"none", color:"#5b8fb9", cursor:"pointer"}}><LogOut size={18}/> Logout</button>
      </div>
    </div>
  );
}

// ---------- Main Navbar Wrapper ----------
function Navbar({ navMode }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const moreButtonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target) && moreButtonRef.current && !moreButtonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  useEffect(()=>{
    async function checkAdmin(){
      const { data:{session} } = await supabase.auth.getSession();
      if(session?.user){
        const { data } = await supabase.from("profiles").select("is_admin").eq("id",session.user.id).single();
        setIsAdmin(!!data?.is_admin);
      }
    }
    checkAdmin();
  },[location.pathname]);

  async function logout(){ await supabase.auth.signOut(); window.location.href="/login"; }

  if(location.pathname === "/login") return null;

  return (
    <>
      {navMode === 'bottom' && (
        <>
          <div style={{padding:"14px", borderBottom:"1px solid #eee", textAlign:"center", background:"white"}}>
            <img src={logoImage} alt="logo" style={{height:"30px"}} />
          </div>
          {showMenu && (
             <div ref={menuRef} style={{position:"fixed", right:"15px", bottom:"90px", background:"white", borderRadius:"16px", padding:"10px", boxShadow:"0 5px 20px rgba(0,0,0,.15)", zIndex:2000, width:"180px"}}>
               <NavLink to="/products" style={menuItemStyle} onClick={()=>setShowMenu(false)}><Package size={18}/> Products</NavLink>
               <NavLink to="/library" style={menuItemStyle} onClick={()=>setShowMenu(false)}><Book size={18}/> Library</NavLink>
               {isAdmin && <NavLink to="/admin" style={{...menuItemStyle, color:"#e74c3c"}} onClick={()=>setShowMenu(false)}><Shield size={18}/> Admin</NavLink>}
               <button onClick={logout} style={{...menuItemStyle, border:"none", background:"transparent", width:"100%"}}><LogOut size={18}/> Logout</button>
             </div>
          )}
          <BottomNav isAdmin={isAdmin} logout={logout} setShowMenu={setShowMenu} showMenu={showMenu} menuRef={menuRef} moreButtonRef={moreButtonRef} />
        </>
      )}

      {navMode === 'side' && (
        <SideNav isAdmin={isAdmin} logout={logout} />
      )}
    </>
  );
}

// ---------- Styles ----------
const navStyle = ({isActive}) => ({ display:"flex", flexDirection:"column", alignItems:"center", textDecoration:"none", fontSize:"12px", color:isActive ? "#2c3e50" : "#5b8fb9", fontWeight:isActive ? "bold" : "normal", flex:1 });
const navButtonReset = { border:"none", background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", flex:1, cursor:"pointer" };
const menuItemStyle = { display:"flex", alignItems:"center", gap:"10px", padding:"12px", textDecoration:"none", color:"#2c3e50", cursor:"pointer" };
const sideNavLinkStyle = { display:"flex", alignItems:"center", gap:"10px", padding:"10px", textDecoration:"none", color:"#5b8fb9", fontWeight:"bold" };

// ---------- Main App ----------
export default function App() {
  // TOGGLE THIS STATE TO SWITCH BETWEEN 'bottom' AND 'side'
  const [navMode, setNavMode] = useState('side'); 

  return (
    <Router>
      <ScrollToTop/>
      <Navbar navMode={navMode} />
      <div style={{ marginLeft: navMode === 'side' ? "200px" : "0", padding: "20px" }}>
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
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard/></ProtectedRoute>}/>
        </Routes>
      </div>
    </Router>
  );
}