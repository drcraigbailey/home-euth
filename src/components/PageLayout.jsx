export default function PageLayout({ title, children }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <div className="card">{children}</div>
    </div>
  );
}