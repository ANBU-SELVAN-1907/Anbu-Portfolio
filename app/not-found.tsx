import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <p className="eyebrow">404 / SIGNAL NOT FOUND</p>
      <h1>A small detour.</h1>
      <p>This page doesn’t exist. Let’s get you back to the work.</p>
      <Link className="button primary" href="/">
        Back to portfolio ↗
      </Link>
    </main>
  );
}
