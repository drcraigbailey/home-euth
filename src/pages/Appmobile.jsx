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
  Package
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

    const {data:listener} =
    supabase.auth.onAuthStateChange(
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
          color:"#5b8fb9",
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


// ---------- Navbar ----------
function Navbar(){

const location=useLocation();

const [isAdmin,setIsAdmin]=useState(false);
const [showMenu,setShowMenu]=useState(false);

useEffect(()=>{

async function checkAdmin(){

const {
data:{session}
}=await supabase.auth.getSession();

if(session?.user){

const {data}=await supabase
.from("profiles")
.select("is_admin")
.eq("id",session.user.id)
.single();

setIsAdmin(
!!data?.is_admin
);

}

}

checkAdmin();

},[location.pathname]);


async function logout(){

await supabase.auth.signOut();

window.location.href="/login";

}

if(location.pathname==="/login"){
return null;
}


return(

<>

<div
style={{
position:"sticky",
top:0,
background:"white",
padding:"14px",
borderBottom:"1px solid #eee",
zIndex:999
}}
>

<div
style={{
display:"flex",
alignItems:"center",
justifyContent:"center",
gap:"10px"
}}
>

<img
src={logoImage}
alt="logo"
style={{
height:"35px"
}}
/>

<h2
style={{
margin:0,
fontSize:"18px",
color:"#2c3e50"
}}
>
SP Home Euthanasia
</h2>

</div>

</div>


{showMenu && (

<div
style={{
position:"fixed",
right:"15px",
bottom:"90px",
background:"white",
borderRadius:"16px",
padding:"10px",
boxShadow:"0 5px 20px rgba(0,0,0,.15)",
zIndex:2000,
width:"180px"
}}
>

<NavLink
to="/products"
style={menuStyle}
onClick={()=>setShowMenu(false)}
>

<Package size={18}/>
Products

</NavLink>


{isAdmin && (

<NavLink
to="/admin"
style={{
  ...menuStyle,
  color:"#e74c3c",
  fontWeight:"bold"
}}
onClick={()=>setShowMenu(false)}
>

<Shield size={18} color="#e74c3c"/>
Admin

</NavLink>

)}

<button
onClick={logout}
style={{
...menuStyle,
width:"100%",
border:"none",
background:"transparent"
}}
>

<LogOut size={18}/>
Logout

</button>

</div>

)}



<div
style={{
position:"fixed",
bottom:0,
left:0,
right:0,
margin:"0 auto",
width:"100%",
maxWidth:"700px",
height:"72px",
background:"white",
borderTop:"1px solid #ddd",
display:"flex",
justifyContent:"space-evenly",
alignItems:"center",
padding:"0 10px",
boxShadow:"0 -2px 12px rgba(0,0,0,.08)",
zIndex:1000
}}
>

<NavLink to="/" end style={navStyle}>
<HomeIcon size={22}/>
<span>Home</span>
</NavLink>

<NavLink to="/clients" style={navStyle}>
<Users size={22}/>
<span>Clients</span>
</NavLink>

<NavLink to="/patients" style={navStyle}>
<PawPrint size={22}/>
<span>Patients</span>
</NavLink>

<NavLink to="/sedation" style={navStyle}>
<Syringe size={22}/>
<span>Sedation</span>
</NavLink>

<button
onClick={()=>setShowMenu(!showMenu)}
style={{
border:"none",
background:"transparent",
display:"flex",
flexDirection:"column",
alignItems:"center",
justifyContent:"center",
minWidth:"70px",
flex:1,
cursor:"pointer",
color:"#5b8fb9"
}}
>
<Menu size={22}/>
<span style={{fontSize:"12px"}}>
More
</span>
</button>

</div>

</>

)

}


const navStyle=({isActive})=>({

display:"flex",
flexDirection:"column",
alignItems:"center",
justifyContent:"center",
textDecoration:"none",
fontSize:"clamp(10px,2vw,12px)",
minWidth:"70px",
padding:"6px 8px",
color:isActive
? "#2c3e50"
: "#5b8fb9",
fontWeight:isActive
? "bold"
: "normal",
gap:"4px",
whiteSpace:"nowrap",
flex:1

});


const menuStyle={

display:"flex",
alignItems:"center",
gap:"10px",
padding:"12px",
textDecoration:"none",
borderRadius:"10px",
color:"#2c3e50",
cursor:"pointer"

};


// ---------- Hardware Back Button ----------
function BackButtonHandler(){

const navigate=useNavigate();
const location=useLocation();

const currentPathRef=
useRef(location.pathname);

useEffect(()=>{
currentPathRef.current=
location.pathname;
},[location.pathname]);


useEffect(()=>{

const setupHardwareLink=
async()=>{

return await CapacitorApp.addListener(
'backButton',
()=>{

const path=
currentPathRef.current;

if(
path==="/" ||
path==="/login"
){
CapacitorApp.exitApp();
}
else if(
path.startsWith("/patient/")
){
navigate("/patients");
}
else if(
path.startsWith("/client/")
){
navigate("/clients");
}
else{
navigate(-1);
}

});

};

const initiationPromise=
setupHardwareLink();

return ()=>{

initiationPromise.then(
handler=>{

if(handler){
handler.remove();
}

});

};

},[navigate]);

return null;

}


// ---------- App ----------
export default function App(){

return(

<Router>

<ScrollToTop/>

<BackButtonHandler/>

<Navbar/>

<div style={{paddingBottom:"90px"}}>

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
<Route path="/admin" element={<ProtectedRoute><AdminDashboard/></ProtectedRoute>}/>

</Routes>

</div>

</Router>

)

}