"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck, LoaderCircle } from "lucide-react";
type Config = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};
export default function FirebaseLogin() {
  const [config, setConfig] = useState<Config | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json() as Promise<{ ready: boolean; config: Config }>)
      .then((d) => {
        if (d.ready) setConfig(d.config);
        else
          setError(
            "Google sign-in is ready to connect. Follow FIREBASE_SETUP.md to configure your project.",
          );
      })
      .catch(() =>
        setError("Could not load sign-in settings. Refresh to retry."),
      );
  }, []);
  async function login() {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const [
        { initializeApp, getApps },
        {
          getAuth,
          setPersistence,
          inMemoryPersistence,
          GoogleAuthProvider,
          signInWithPopup,
          signOut,
        },
      ] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
      const auth = getAuth(
        getApps().find((app) => app.name === "portfolio-owner") ||
          initializeApp(config, "portfolio-owner"),
      );
      await setPersistence(auth, inMemoryPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      try {
        const r = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await result.user.getIdToken(true) }),
        });
        const data = (await r.json()) as { error?: string };
        if (!r.ok) throw Error(data.error);
        location.assign("/admin");
      } finally {
        await signOut(auth);
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled. Try again when ready."
          : code === "auth/unauthorized-domain"
            ? "Add this website domain to Firebase Authentication → Authorized domains."
            : e instanceof Error
              ? e.message
              : "Sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="studio login-page">
      <a className="brand" href="/">
        anbu<span> / T</span>
      </a>
      <div>
        <p className="eyebrow">ANBU SELVAN T / OWNER STUDIO</p>
        <h1>
          Your work.
          <br />
          <span className="accent">Your control.</span>
        </h1>
        <p>One Google account. A private space to shape your portfolio.</p>
        <button
          className="button primary"
          disabled={!config || busy}
          onClick={login}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <ShieldCheck size={18} />
          )}
          Sign in with Google <ArrowUpRight size={18} />
        </button>
        <p role="status" className="muted">
          {error}
        </p>
        <small>Only anbu.t80555@gmail.com can edit this website.</small>
      </div>
      <a href="/">← Back to portfolio</a>
    </main>
  );
}
