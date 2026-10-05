# Deployment and configuration

## Current status

The app is configured in code for Firebase Spark Authentication and Firestore, including bounded small-file uploads. No Supabase integration is used. Firebase Cloud Storage and paid Firebase server services are excluded. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the exact console steps and current free quotas.

The Sites deployment is active and public at https://anbu-selvan-portfolio.polite-hero-4309.chatgpt.site. Portfolio visitors and Resume Studio users do not need to log in. Admin routes and data APIs require verified owner authentication. The existing Site project identifier remains in `.openai/hosting.json`. Vercel deployment is supported by `vercel.json` and the Next.js build.

Firebase public project identifiers for `anbu-portfolio-b91f6` are present in the example environment files; the API key is configured only in ignored local files and host environment settings and configured on the existing Sites deployment. A server-only service-account secret and owner UID have not yet been provided. Until then the public page shows the bundled content kit; admin access, contact delivery, and persistent cloud mutations are unavailable. No development account or trusted browser header can bypass the new Firebase admin verification.

## Run locally

```powershell
npm run dev
npm run typecheck
npm run build
node scripts/check-resume.mjs
node scripts/check-firebase.mjs
```

Open `http://localhost:5173/`, `/admin`, and `/resume-builder`. The builder works locally without an account or Firebase credentials. Its drafts stay in the browser; the portfolio's editable content uses Firestore.

## Production

For Sites, use the existing source/version/deployment workflow. For Vercel, import this repository using Next.js, build with `npm run build`, and configure the server environment variables from `.env.example` through Vercel project settings before redeploying. The app's React server runtime remains a Worker; Firebase is the external backend. Set `FIREBASE_*` variables as host environment variables/secrets. `FIREBASE_SERVICE_ACCOUNT_JSON` is private and must never appear in Git, client bundles, or the admin editor. Public Firebase configuration may be exposed by `/api/auth/config`.

Standalone deployment can use Cloudflare Workers Free with a free `workers.dev` subdomain because owner auth is now independently verified through Firebase. Firebase Hosting's static free tier does not run this dynamic server. Do not select Firebase App Hosting/Functions or enable billing when strict zero-cost operation is required. The starter's Cloudflare database ID is a placeholder, not a production resource. Legacy D1/R2 source schemas and local data are retained for migration. Their hosting bindings are now disabled; runtime storage uses Firestore.

Check owner login, token revocation, unauthorized requests, stale revisions, drafts, publish/history, small-file upload/private access, contact delivery, and generated resume on the actual deployed origin. Do not describe local/mock transport checks as production verification.

## AI setup

For local Next.js development, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` there. For local Workers development, use `.dev.vars.example` and `.dev.vars`. Restart the local server. Use a free-tier Google AI Studio project without paid billing; availability/quota is provider-controlled. Production needs the same server secret. The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` can change it.

Chat and resume AI use server-only keys, origin checks, bounded input, rate limits, timeouts, and safe errors. Resume suggestions require consent and review. Visitor chat and resume text may be used by Google to improve products under its free-tier terms. Editing, scoring, import, and downloads do not require AI. No live inference has been tested because the key is not configured.

## Original portrait and sources

`public/anbu-original.png` remains byte-for-byte identical to the supplied 1086 × 1448 portrait (SHA-256 `FD23A472DFA55F88F33A3FA24CDF329CA6D01683EA07C2EE4CD62691212F2299`). The frame/background animate; the face has not been regenerated or retouched. It is not a native 4K image.

The full name is Anbu Selvan T. The GitHub link is `https://github.com/ANBU-SELVAN-1907`. Credential facts came from the matching public LinkedIn profile, with the outbound link using the latest user-supplied URL. No fabricated awards, testimonials, metrics, or demos were added.
