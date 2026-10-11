"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  LoaderCircle,
  Mail,
  CircleAlert,
} from "lucide-react";
import type { Auth } from "firebase/auth";
type Config = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};
type Runtime = { auth: Auth; sdk: typeof import("firebase/auth") };
function loginError(e: unknown) {
  const code = (e as { code?: string }).code;
  const errors: Record<string, string> = {
    "auth/popup-closed-by-user":
      "The Google window closed before sign-in finished. Use the email link below or try in a regular browser.",
    "auth/popup-blocked":
      "Your browser blocked the Google popup. Use the email sign-in link below.",
    "auth/unauthorized-domain":
      "Add this website hostname to Firebase Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed":
      "Enable Google and Email link sign-in in Firebase Authentication → Sign-in method.",
    "auth/invalid-action-code":
      "This sign-in link was already used or is invalid. Request a fresh link.",
    "auth/expired-action-code":
      "This sign-in link expired. Request a fresh link.",
    "auth/invalid-email": "Enter the owner email, anbu.t80555@gmail.com.",
    "auth/network-request-failed":
      "The sign-in service could not connect. Check your connection and try again.",
    "auth/invalid-api-key":
      "The Firebase web API key is invalid. Check the project configuration.",
    "auth/too-many-requests":
      "Firebase temporarily limited sign-in attempts. Wait before requesting another link.",
  };
  return code && errors[code]
    ? errors[code]
    : e instanceof Error
      ? e.message
      : "Sign-in failed. Try again.";
}
export default function FirebaseLogin() {
  const runtime = useRef<Runtime | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [setup, setSetup] = useState(""),
    [sent, setSent] = useState(false),
    [link, setLink] = useState(false),
    [email, setEmail] = useState("anbu.t80555@gmail.com"),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const response = await fetch("/api/auth/config");
        if (!response.ok) throw Error("Could not load sign-in settings.");
        const d = (await response.json()) as {
          ready: boolean;
          setupMessage?: string;
          authReady: boolean;
          config: Config;
        };
        if (!d.ready) {
          if (active)
            setSetup(
              d.setupMessage ||
                (d.authReady
                  ? "Firebase web settings are connected, but the private backend credential is missing. Add FIREBASE_SERVICE_ACCOUNT_JSON to .env.local locally and to Vercel’s Production environment, then restart or redeploy. See FIREBASE_SETUP.md, step 4."
                  : "Firebase is not configured. Add the web settings and private backend credential described in FIREBASE_SETUP.md."),
            );
          return;
        }
        const [{ initializeApp, getApps }, sdk] = await Promise.all([
          import("firebase/app"),
          import("firebase/auth"),
        ]);
        const auth = sdk.getAuth(
          getApps().find((app) => app.name === "portfolio-owner") ||
            initializeApp(d.config, "portfolio-owner"),
        );
        await sdk.setPersistence(auth, sdk.inMemoryPersistence);
        if (active) {
          runtime.current = { auth, sdk };
          setLink(sdk.isSignInWithEmailLink(auth, location.href));
          setReady(true);
        }
      } catch (e) {
        if (active) setError(loginError(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    prepare();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function openStudio(user: import("firebase/auth").User) {
    const r = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: await user.getIdToken(true) }),
    });
    const data = (await r.json()) as { error?: string };
    if (!r.ok) throw Error(data.error || "Your account could not be verified.");
    await runtime.current?.sdk.signOut(runtime.current.auth);
    location.replace("/admin");
  }
  async function googleLogin() {
    const rt = runtime.current;
    if (!rt) return;
    setBusy(true);
    setError("");
    try {
      const provider = new rt.sdk.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: "anbu.t80555@gmail.com",
      });
      // SDK is preloaded: open the popup directly inside the user's click.
      const result = await rt.sdk.signInWithPopup(rt.auth, provider);
      try {
        await openStudio(result.user);
      } finally {
        await rt.sdk.signOut(rt.auth);
      }
    } catch (e) {
      setError(loginError(e));
    } finally {
      setBusy(false);
    }
  }
  async function emailLogin(e: FormEvent) {
    e.preventDefault();
    const rt = runtime.current;
    if (!rt) return;
    if (email.trim().toLowerCase() !== "anbu.t80555@gmail.com") {
      setError("Use your owner account: anbu.t80555@gmail.com.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (link) {
        const result = await rt.sdk.signInWithEmailLink(
          rt.auth,
          email.trim().toLowerCase(),
          location.href,
        );
        // Remove the one-time code from the address bar before entering the studio.
        history.replaceState(null, "", "/admin");
        setLink(false);
        try {
          await openStudio(result.user);
        } finally {
          await rt.sdk.signOut(rt.auth);
        }
      } else {
        const r = await fetch("/api/auth/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await r.json()) as { error?: string };
        if (!r.ok) throw Error(data.error);
        setSent(true);
        setCooldown(60);
      }
    } catch (e) {
      setError(loginError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="studio login-page">
      <Link className="brand" href="/">
        anbu<span> / T</span>
      </Link>
      <div className="owner-login-card">
        <p className="eyebrow">ANBU SELVAN T / OWNER STUDIO</p>
        <h1>
          Your work.
          <br />
          <span className="accent">Your control.</span>
        </h1>
        <p>Sign in with your email link to manage your portfolio.</p>
        {setup && (
          <div className="owner-setup" role="alert">
            <CircleAlert size={20} />
            <div>
              <strong>One setup step remains</strong>
              <p>{setup}</p>
            </div>
          </div>
        )}
        <form onSubmit={emailLogin}>
          <label className="field">
            <span>Owner email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <button
            className="button primary"
            disabled={!ready || busy || (!link && cooldown > 0)}
            type="submit"
          >
            {busy || loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Mail size={18} />
            )}
            {link
              ? "Confirm email & enter studio"
              : cooldown
                ? `Resend in ${cooldown}s`
                : sent
                  ? "Send another sign-in link"
                  : "Email me a sign-in link"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        {sent && (
          <p className="owner-email-sent" role="status">
            Link sent to <strong>anbu.t80555@gmail.com</strong>. Check Inbox or
            Spam, open the link, and confirm your email here. Each link can be
            used once.
          </p>
        )}
        <p className="owner-login-note">
          No password or numeric OTP required. Firebase Spark includes 5 sign-in
          emails per day.
        </p>
        {!link && (
          <button
            className="button owner-google"
            disabled={!ready || busy}
            onClick={googleLogin}
          >
            <ShieldCheck size={17} />
            Or sign in with Google
          </button>
        )}
        {error && (
          <p role="alert" className="owner-login-error">
            {error}
          </p>
        )}
        {loading && <p role="status">Preparing secure sign-in…</p>}
        <small>Only anbu.t80555@gmail.com can edit this website.</small>
      </div>
      <Link href="/">← Back to portfolio</Link>
    </main>
  );
}
