import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const inputStyle = { width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "20px", fontSize: "16px" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("name", { ascending: true });
    setProducts(data || []);
  }

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

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