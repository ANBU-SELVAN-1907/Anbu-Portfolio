"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
export default function ContactForm({
  preview = false,
}: {
  preview?: boolean;
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview) {
          setStatus(
            "This is a draft preview. Use the published site to send a message.",
          );
          return;
        }
        const form = e.currentTarget;
        setBusy(true);
        setStatus("");
        const fields = Object.fromEntries(new FormData(form));
        let analytics = false;
        try {
          analytics =
            localStorage.getItem("anbu-privacy") === "allowed" &&
            navigator.doNotTrack !== "1";
        } catch {}
        if (analytics)
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "form_attempt" }),
          }).catch(() => {});
        try {
          const r = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...fields, analytics }),
          });
          const b = (await r.json()) as { error?: string };
          if (!r.ok) throw Error(b.error || "Unable to send your message.");
          setStatus(
            "Message received. Thank you — I’ll get back to you by email.",
          );
          form.reset();
        } catch (e) {
          setStatus((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-row">
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@company.com"
          />
        </label>
      </div>
      <label>
        What do you have in mind?
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          placeholder="A project, an opportunity, or a hello…"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="form-footer">
        <small>Your details are used only to respond to this message.</small>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="spin" size={15} />
              Sending…
            </>
          ) : (
            <>
              Send message <ArrowUpRight size={17} />
            </>
          )}
        </button>
      </div>
      <p role="status">{status}</p>
    </form>
  );
}
