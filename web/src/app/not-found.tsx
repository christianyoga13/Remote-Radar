import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Page Not Found</h2>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to Vacancies
      </Link>
    </div>
  );
}
