"use client";
import { useState, useEffect } from "react";
import { Database, Download, RefreshCw, Upload } from "lucide-react";
type State = {
  ready: boolean;
  message?: string;
  error?: string;
  bytes?: number;
  legacyFiles: number;
  backups: { key: string; size: number; created: string }[];
};
export default function StoragePanel() {
  const [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    const r = await fetch("/api/storage"),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setState(d);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/storage")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setState(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setState((s) => (s ? { ...s, message: d.message } : s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Storage operation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor-card">
      <p className="eyebrow">PRIVATE OBJECT STORAGE</p>
      <h2>
        <Database size={22} /> Cloudflare R2
      </h2>
      <p>{state?.message || "Checking storage connection…"}</p>
      {error && <p role="alert">{error}</p>}
      <p>
        Original images, video, audio, documents and data files · 100 MiB per
        upload · files upload directly to R2.
      </p>
      <p>
        Managed files: {((state?.bytes || 0) / 1e9).toFixed(2)} / 9 GB app
        limit. Cloudflare&apos;s free allowance is shared across your account and
        includes operation limits; this is not an account billing cap.
      </p>
      <div className="field-tools">
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            load()
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <RefreshCw size={16} /> Check connection
        </button>
        <button disabled={busy || !state?.ready} onClick={() => run("backup")}>
          <Download size={16} /> Create private backup
        </button>
        <button
          disabled={busy || !state?.ready || !state.legacyFiles}
          onClick={() => run("migrate")}
        >
          <Upload size={16} /> Migrate next 10 legacy files (
          {state?.legacyFiles || 0})
        </button>
      </div>
      <p>
        Backups include portfolio data, retained history, inbox, metrics and
        file references. File originals already live in R2. Keep an independent
        offline copy too.
      </p>
      <div className="editor-grid">
        {state?.backups.slice(0, 20).map((b) => (
          <a
            className="button"
            key={b.key}
            href={`/api/storage?backup=${encodeURIComponent(b.key)}`}
          >
            <Download size={16} />
            {new Date(b.created).toLocaleString()} ·{" "}
            {(b.size / 1024).toFixed(0)} KiB
          </a>
        ))}
      </div>
    </section>
  );
}
