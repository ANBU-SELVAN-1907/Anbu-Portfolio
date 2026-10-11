# Deploy: GitHub + Vercel + Firebase

## Stack

- Source: [ANBU-SELVAN-1907/Anbu-Portfolio](https://github.com/ANBU-SELVAN-1907/Anbu-Portfolio)
- Hosting: Vercel **Hobby**, native Next.js 16 + React 19
- Backend: Firebase **Spark**, email-link/Google sign-in + Firestore
- Files: private Cloudflare R2 originals up to **100 MiB** via direct uploads; bundled assets in `public/`
- Optional AI: Google AI Studio free-tier key, server-only

No paid upgrade, Cloud Storage, Supabase, Firebase Functions/App Hosting, Vercel Blob or paid domain is required. Vercel Hobby is for personal, non-commercial use, with quotas; it is not an unlimited free enterprise service. [Plan terms and limits](https://vercel.com/docs/plans/hobby)

## 1. Import the repository

1. Open [Vercel new project](https://vercel.com/new) in your personal **Hobby** account.
2. Import `ANBU-SELVAN-1907/Anbu-Portfolio`. Authorize only the repository needed by the project.
3. Framework preset: **Next.js**. Root directory: repository root.
4. Build command: `npm run build`. Install command: `npm ci`. Leave the output directory at its Next.js default. Node.js: **22.x**.
5. Use the generated `.vercel.app` domain. Do not choose a Pro trial or buy a domain for strict zero-cost hosting.

Native Next.js replaces the previous local Vinext/Cloudflare runtime. `vercel.json` declares Next.js; no adapter or Worker database binding is needed. The old local files/data remain available only for migration. The new runtime reads `process.env`.

## 2. Configure Firebase

Complete [FIREBASE_SETUP.md](FIREBASE_SETUP.md): Spark project, Google and Email link providers, Firestore production rules/index exemptions and a dedicated service account with Cloud Datastore User access.

Vercel Project → Settings → Environment Variables. Add these to **Production**:

| Variable                        | Value                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `FIREBASE_API_KEY`              | Public Firebase web config `apiKey`                                                  |
| `FIREBASE_AUTH_DOMAIN`          | Public config `authDomain`                                                           |
| `FIREBASE_PROJECT_ID`           | Public config `projectId`                                                            |
| `FIREBASE_APP_ID`               | Public config `appId`                                                                |
| `FIREBASE_OWNER_UID`            | Owner's Firebase user UID, recommended after first sign-in                           |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Private, compact JSON key; paste the raw JSON value without surrounding shell quotes |
| `GEMINI_API_KEY`                | Optional free-tier Google AI Studio key                                              |
| `GEMINI_MODEL`                  | Optional; default `gemini-3.5-flash-lite`                                            |

Never prefix the service-account or Gemini variables with `NEXT_PUBLIC_`. Never commit `.env.local`, private JSON keys or tokens. Public Firebase config is returned by `/api/auth/config`; the private credential stays server-only.

Enable private variables as sensitive in Vercel if available. Keep Production credentials out of Preview deployments; public previews otherwise share the real inbox/data. Use a separate free Firebase project if you need cloud-backed preview testing.

## 3. Deploy and authorize the domain

1. Deploy after setting the variables (or redeploy if they were added later).
2. Copy the actual deployed hostname, such as your project's generated `.vercel.app` host. Do not assume a hostname before Vercel returns it.
3. Firebase Authentication → Settings → Authorized domains → add that hostname, without protocol/path/port.
4. Visit `/admin` and request a sign-in link for `anbu.t80555@gmail.com`, open it, and confirm the same email. Review the draft, theme and gallery, then publish.
5. Admin → Resume download → upload a PDF → check the draft download → Save draft → Publish.
6. Verify visitor downloads, contact delivery, unauthorized account rejection, stale revisions, drafts/history and private uploads on the deployed origin.

Vercel's Git integration redeploys production when the production branch changes. CMS text/media updates publish immediately through Firebase and do not require a Git commit. Production tokens expire within one hour; sign in again when needed.

## Local development

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Fill `.env.local` privately before starting. Local URLs: `/`, `/admin`, `/resume-builder` at `http://localhost:5173`. Add `localhost` to Firebase's authorized domains. Builds and public resume editing work without cloud credentials; Firebase admin, inbox, uploads and server AI remain unavailable until configured.

## Verification

```powershell
npm run typecheck
npm run check:auth
npm run check:storage
npm run check:public-content
npm run check:resume
npm run check:imports
npm run lint
npm run build
```

The security/storage tests mock Google's transport while testing real JWT cryptography and application flows. They are not a replacement for live Firebase checks. The GitHub workflow runs checks without cloud secrets. Local HTTP checks are in `scripts/check-public.py`; set `PORTFOLIO_TEST_URL` to the temporary production server URL (default port 5174). See SECURITY.md for audit results and the remaining lint-only upstream advisory.

## Privacy and cost

Use **Vercel Hobby + Firebase Spark + R2 Standard** within their included allowances. Vercel's included usage can pause services when exhausted; Spark quotas can make Firestore unavailable. Upload binaries and backup exports use R2, which requires subscription activation and bills above its free allowance. The app's limits are not a Cloudflare spending cap. No Firebase paid upgrade is implemented. See R2_SETUP.md.

The optional AI provider may use free-tier chat/resume text to improve products. Resume AI asks for consent and suggestions require review. Local editing, scoring, imports and exports do not send resume content to Firebase. [Gemini free-tier terms](https://ai.google.dev/gemini-api/docs/pricing)

The original portrait remains byte-for-byte unchanged (1086 × 1448). The frame/background animate; the face is not regenerated. Keep backups through Admin → Overview → Export draft JSON; media files need separate offline copies.

## R2 variables

Add R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Production. Configure private Standard bucket/CORS, then redeploy. Full steps and billing limits: [R2_SETUP.md](R2_SETUP.md). Firebase auth/database settings remain required.
