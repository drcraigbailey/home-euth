import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const whiteShadowBox = { background: "white", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "10px" };
const blueBtn = { flex: 1, background: "#5b8fb9", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };
const redBtn = { flex: 1, background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: "bold" };

export default function Products() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    checkAdminStatus();
    fetchProducts();
  }, []);

  async function checkAdminStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      setIsAdmin(!!profile?.is_admin);
    }
  }

  async function fetchProducts() {
    const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
    if (error) console.error("Error fetching products:", error.message);
    setProducts(data || []);
  }

  // --- UPDATED SAVE FUNCTION WITH ERROR CATCHING ---
  async function saveProduct() {
    if (!name || !price) return alert("Name and Price are required.");
    
    const payload = { name, description, price: Number(price) };
    let dbError;
    
    if (isEditing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId);
      dbError = error;
    } else {
      const { error } = await supabase.from("products").insert([payload]);
      dbError = error;
    }
    
    // If Supabase rejects the save, this will tell us exactly why!
    if (dbError) {
      alert("Error saving product: " + dbError.message);
      return;
    }
    
    resetForm();
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    fetchProducts();
  }

  function startEdit(product) {
    setIsEditing(true);
    setEditId(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.price);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setDescription("");
    setPrice("");
  }

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <h1>Products & Services</h1>
      
      {isAdmin && (
        <div className="card" style={{ marginBottom: "20px", border: isEditing ? "2px solid #f39c12" : "none" }}>
          <h3>{isEditing ? "Edit Product" : "Add New Product"}</h3>
          <input placeholder="Product / Service Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          <textarea placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} rows={2} />
          <input placeholder="Price (£)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
          
          <div style={btnRow}>
            <button onClick={saveProduct} style={{ ...blueBtn, background: "#27ae60" }}>{isEditing ? "Update Product" : "Save Product"}</button>
            {isEditing && <button onClick={resetForm} style={redBtn}>Cancel</button>}
          </div>
        </div>
      )}

      <div style={{ background: "#f8f9fb", padding: "20px", borderRadius: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Available Products</h3>
        {products.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>No products available.</p>}
        
        {products.map(p => (
          <div key={p.id} style={{ ...whiteShadowBox, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "18px", display: "block", color: "#333" }}>{p.name}</strong>
              <div style={{ color: "#7f8c8d", fontSize: "14px", marginTop: "5px" }}>{p.description}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#27ae60" }}>£{Number(p.price).toFixed(2)}</div>
              {isAdmin && (
                <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
                  <button onClick={() => startEdit(p)} style={{ ...blueBtn, padding: "5px 10px", fontSize: "12px" }}>Edit</button>
                  <button onClick={() => deleteProduct(p.id)} style={{ ...redBtn, padding: "5px 10px", fontSize: "12px" }}>Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}