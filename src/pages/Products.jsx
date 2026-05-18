// Products.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import Loader from "../Loader";

// --- STYLING CONSTANTS ---
const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "20px" };

// Strict uniform button properties copied from Admin Dashboard layout
const standardBtnProps = { borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", padding: "8px 14px", fontSize: "12px", boxSizing: "border-box", display: "inline-block", textAlign: "center", minWidth: "100px", width: "auto" };
const blueBtn = { background: "#5b8fb9", color: "white", ...standardBtnProps };

export default function Products() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchProducts();
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("name", { ascending: true });
    setProducts(data || []);
  }

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader />
        <p style={{ margin: "15px 0 0 0", color: "#5b8fb9", fontWeight: "bold", fontSize: "18px" }}>Loading Products...</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1 style={{ textAlign: "center" }}>Products & Services</h1>
      
      <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
        <input 
          placeholder="Search products or descriptions..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={inputStyle} 
        />
        
        {filtered.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No products found.</p>}
        
        {filtered.map(p => (
          <div key={p.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "18px", display: "block", color: "#333" }}>{p.name}</strong>
              <div style={{ color: "#7f8c8d", fontSize: "14px", marginTop: "5px" }}>{p.description}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#27ae60" }}>£{Number(p.price).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}