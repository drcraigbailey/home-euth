/* ---------- GLOBAL RESET ---------- */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f2f4f5;
  color: #2c3e50;
}

/* ---------- PAGE WRAPPER ---------- */
.page {
  max-width: 520px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

/* ---------- NAV (keeps your style consistent) ---------- */
.nav {
  display: flex;
  justify-content: center;
  gap: 10px;
  background: #e5eaed;
  padding: 8px;
  border-radius: 16px;
  width: fit-content;
  margin: 20px auto;
}

.nav a {
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 12px;
  color: #2c3e50;
  font-weight: 500;
}

.nav a.active {
  background: #5f7f89;
  color: white;
}

/* ---------- CARD ---------- */
.card {
  background: #ffffff;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

/* ---------- CLICKABLE CARDS ---------- */
.clickable {
  cursor: pointer;
  transition: 0.2s;
}

.clickable:hover {
  background: #f1f3f4;
}

/* ---------- FORM GRID (2 COLUMN CLEAN LAYOUT) ---------- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* ---------- INPUTS ---------- */
input,
select {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #d1d5d9;
  font-size: 14px;
  outline: none;
  background: #fafafa;
}

input:focus,
select:focus {
  border-color: #5f7f89;
  background: white;
}

/* ---------- FULL WIDTH SEARCH ---------- */
.search {
  width: 100%;
}

/* ---------- PRIMARY BUTTON ---------- */
.primary {
  width: 100%;
  padding: 14px;
  background: #5f7f89;
  color: white;
  border: none;
  border-radius: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.primary:hover {
  opacity: 0.9;
}

/* ---------- SECONDARY BUTTON (optional) ---------- */
.secondary {
  width: 100%;
  padding: 12px;
  background: #dbe3e7;
  color: #2c3e50;
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

/* ---------- SECTION HEADINGS ---------- */
h2 {
  margin-bottom: 20px;
}

h3 {
  margin-bottom: 10px;
}

/* ---------- FIX FOR OVERFLOW BUG (IMPORTANT) ---------- */
.form-grid input {
  min-width: 0;
}

/* ---------- MOBILE SAFETY ---------- */
@media (max-width: 500px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}