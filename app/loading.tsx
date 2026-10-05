export default function Loading() {
  return (
    <main
      className="portfolio loading-page"
      aria-busy="true"
      aria-label="Loading portfolio"
    >
      <span className="folio-wordmark">
        anbu<span> / T</span>
      </span>
      <div className="loading-track" aria-hidden />
      <p className="mono" role="status">
        Opening the next chapter…
      </p>
    </main>
  );
}
