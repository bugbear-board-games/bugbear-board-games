import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page narrow" style={{ textAlign: "center" }}>
      <h1>Critical miss!</h1>
      <p>We couldn&apos;t find that page. It may have been moved or removed.</p>
      <Link href="/" className="btn btn-gold">Back to home</Link>
    </div>
  );
}
