"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Something went wrong.</h1>
      <p>Please try loading this page again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
