# Firebase setup — no billing account

This configuration uses **Firebase Spark**, email-link/Google sign-in, and Cloud Firestore. It does not use Cloud Storage, Cloud Functions, App Hosting, SMS authentication, or paid Identity Platform MFA. Do not upgrade to Blaze for this implementation.

## What is free? Checked 11 October 2026

| Service                        | Included allowance                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Firestore Standard             | 1 GiB total stored data; 50,000 document reads/day; 20,000 writes/day; 20,000 deletes/day; 10 GiB outbound/month |
| Google sign-in                 | Standard Firebase Authentication Google provider; no SMS used                                                    |
| Firebase Hosting (static only) | 10 GB stored assets; 360 MB/day transfer                                                                         |

Sources: [Firestore pricing](https://firebase.google.com/docs/firestore/pricing), [Firebase pricing](https://firebase.google.com/pricing). Provider policies can change. On Spark, exceeding a quota can make a service unavailable; the app does not automatically upgrade the plan.

**File tradeoff:** Cloud Storage now requires Blaze, so this app stores small uploads inside private Firestore documents. Each upload is limited to **4 MiB**, with base64 encoding using about one-third more database space. Files share the 1 GiB database allowance with content, history, metrics, and messages. Files up to 4 MiB are preserved byte-for-byte and split into 512 KiB chunks, committed atomically with a SHA-256 integrity digest. Larger files can be bundled as website assets. The original portrait remains a bundled file and is unchanged. Firestore is adequate for a small portfolio's lightweight uploads, not a general large-file storage service.

## 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and choose **Add project**.
2. Choose a project name, such as `anbu-portfolio`. Google Analytics is optional and not required by this code.
3. Keep the project on **Spark**. Do not add a payment method.
4. Project overview → add a **Web app** (`</>`). Register it.
5. Copy the public web configuration: `apiKey`, `authDomain`, `projectId`, and `appId`. These identify the app; they are not the server's private credential.

## 2. Enable your sign-in methods

1. Build → **Authentication** → Get started → **Sign-in method**.
2. Enable **Google**, select your project support email, and save. Also enable **Email/Password**, then turn on **Email link (passwordless sign-in)** in that provider and save. You do not need to create a password.
3. Authentication → **Settings → Authorized domains**: add `localhost` for development and the exact deployed hostname later. Do not include `http://`, port numbers, or URL paths.
4. Sign in using **anbu.t80555@gmail.com**. On `/admin`, select **Email me a sign-in link**, open the email, then confirm the same email to enter. Other accounts cannot edit the portfolio.
5. After that account exists in Authentication → Users, copy its **UID** into `FIREBASE_OWNER_UID` for an explicit identity pin.

The server independently verifies the Firebase token's signature, project audience, issuer, expiration, Google/email provider, verified owner email, UID, and account revocation state. A successful frontend login alone never grants admin access. The first verified owner UID is also bound in Firestore.

### Email-link login and free limits

Firebase sends a one-time clickable link to **anbu.t80555@gmail.com**; it does not send a numeric email OTP. The page asks you to confirm the email after opening the link and creates the private admin session only after server verification. There is no password required in the portfolio.

Firebase Spark allows **5 sign-in emails/day** for the project. The app also limits retries to 3/hour per IP and 5/day globally. Wait before resending and check Spam; Google sign-in remains available after the email quota is exhausted. [Firebase auth limits](https://firebase.google.com/docs/auth/limits), [Email-link setup](https://firebase.google.com/docs/auth/web/email-link-auth)

If Google opens and immediately closes: use a regular browser, enable the Google provider, add the exact site hostname to Authorized domains, and confirm the web config matches the project. The SDK is preloaded before clicking to avoid blocked popups. The page now displays actual setup/error guidance.

### OTP / two-step verification

For the strict free setup, enable [Google account two-step verification](https://myaccount.google.com/security) on your owner account. Google manages that challenge during Google sign-in; the portfolio never asks for your Google password or recovery codes.

This is **not app-enforced Firebase OTP**. Firebase TOTP/SMS MFA requires Identity Platform, and SMS introduces message costs. It is deliberately excluded from the no-billing configuration. [Firebase TOTP requirements](https://firebase.google.com/docs/auth/web/totp-mfa)

## 3. Create Firestore and lock direct access

1. Build → **Firestore Database** → Create database.
2. Choose **Standard edition**, the `(default)` database, and **Production mode**.
3. Choose a suitable location (for example Mumbai for visitors in India). Location cannot be casually changed later.
4. Open **Rules**, replace the rules with `firebase/firestore.rules`, then publish them. These deny all browser/direct client reads and writes.
5. Add single-field index exemptions from `firebase/firestore.indexes.json`: `draft` and `published` in `portfolio_content`, `payload` in `portfolio_history`, and `body` in both `portfolio_files` and `portfolio_file_chunks`. Disable ascending, descending, and array indexing for these large fields. This avoids indexed string truncation and unnecessary index storage.

The backend uses fixed `portfolio_*` collections. Firestore's automatic single-field indexes cover list queries; no composite index is required. Drafts and inbox messages are never returned by public endpoints.

## 4. Server credential — keep it private

Use a dedicated Google Cloud service account with **Cloud Datastore User** (`roles/datastore.user`) on this project. It needs Firestore data access, not Owner/Editor or Storage permissions. Generate its JSON key from Google Cloud IAM → Service accounts → that account → Keys. Creating/changing this credential must be done by you in your account.

The private JSON belongs only in the server environment. **Do not paste it into chat, the admin editor, GitHub, or frontend code.** A service-account key bypasses Firestore rules, so treat it like a password. Rotate/delete a leaked key immediately.

Copy `.env.example` to `.env.local`, fill the public configuration, and put the JSON key on one line as shown by the example. `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":...}'` must preserve the JSON's `\n` escapes in `private_key`. The entire `.env.local` file is Git-ignored. An alternative is to store the JSON in an ignored local file and use your host's secret UI to set the server variable.

## 5. Start and verify

```powershell
npm run dev
```

Open `http://localhost:5173/admin`. Click **Email me a sign-in link**, open the email, then confirm your owner email. Google sign-in remains an alternative. The first owner visit initializes the backend when you save. Review the content kit, gallery, and theme before publishing. The admin's draft preview shows changes before they go live.

Check these cases on your configured project:

- Correct Google account opens the studio; a different account is denied.
- Draft changes do not alter the public portfolio until Publish.
- Revoke refresh tokens or disable the account; subsequent admin requests fail.
- Upload a file under 4 MiB, publish it in the gallery, then verify it on the public page. An unused/unpublished upload must return 404 to visitors.
- Try stale revisions from two studio tabs; the stale update must be rejected.
- Submit a contact message and review it in the owner's inbox.

The public web configuration is present locally. The private `FIREBASE_SERVICE_ACCOUNT_JSON` credential is still missing, so live owner login, email delivery and backend mutation verification cannot complete yet. No mock identity can edit the new admin, even in development.

## Hosting: GitHub → Vercel

The source repository is [ANBU-SELVAN-1907/Anbu-Portfolio](https://github.com/ANBU-SELVAN-1907/Anbu-Portfolio). Vercel hosts the native Next.js app; Firebase supplies Google authentication and Firestore. No Cloudflare Worker or Supabase is needed by this runtime.

Follow [DEPLOYMENT.md](DEPLOYMENT.md) to import the repository into a **Vercel Hobby** personal account. Use its free `.vercel.app` subdomain and HTTPS. Add the exact production hostname to Firebase Authentication → Authorized domains. Keep private secrets in Vercel Settings → Environment Variables and enable them for Production only unless you intentionally configure a separate preview backend.

Production uses `__Host-anbu_owner`, `Secure`, `HttpOnly`, and `SameSite=Strict` cookies. HTTPS is required. Owner tokens expire within one hour, then a fresh email link or Google sign-in is required again.

### Publish your uploaded resume

1. Admin → **Resume download** → **Upload / replace resume**.
2. Choose a PDF up to **4 MiB**. It is stored privately in Firestore.
3. Download the draft PDF to check it, then **Save draft → Publish**.
4. Visitors clicking **Get my resume** receive the exact published PDF. Uploading a replacement does not change the public PDF until you publish.

The automatic PDF remains an optional fallback. A larger original can be bundled as `/resume.pdf` through the source repository. File bytes in Firestore use about one-third extra space for encoding.

## Existing data and maintenance

Legacy D1/R2 files and migrations are retained, but current runtime storage calls use Firestore. Nothing was deleted from the old backend. A local legacy draft and published snapshot were preserved in ignored `.sites-runtime/legacy-draft.json` and `.sites-runtime/legacy-published.json`. After configuring Firebase, use Overview → Import content backup to review either snapshot as a draft before saving/publishing. Overview → Export draft JSON creates future offline content backups. Media URLs must refer to files migrated to the new store. The bundled resume/photo remain available.

Monitor Firebase → Firestore → Usage. History keeps 20 published snapshots; uploads have a size limit. Rate-limit records use keyed IP hashes and are reused between windows. Review old messages/media/metrics periodically. No paid TTL, automatic backup, or point-in-time recovery is enabled. Export published content from the studio regularly and keep an offline backup.

## Zero-cost choices

Use Vercel Hobby for this personal, non-commercial portfolio and its free subdomain. It currently includes 100 GB fast data transfer, 1 million function invocations, and 4 hours active CPU per month. Its usage limits can pause service rather than supply unlimited capacity. A commercial service needs an eligible hosting plan; do not enable a paid trial or upgrade for this project. See [Vercel Hobby](https://vercel.com/docs/plans/hobby).

Keep Firebase on Spark with no linked billing account. Firestore's free quotas are shared by text, uploads, history, inbox and analytics. Cloud Storage requires Blaze and is excluded. [Firebase Storage billing requirement](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

Optional chat/AI writing needs a Google AI Studio key in a free-tier project. Availability and request quotas are provider-controlled; do not link paid billing. Resume editing, analysis and PDF/DOCX downloads work without AI. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

## Troubleshooting the live admin login

Open `/api/auth/config` on the deployed site. `ready: true` now means the server successfully authenticated to Google and opened/rolled back a Firestore transaction; it is no longer only an environment-variable presence check. The diagnostic is cached for one minute and never exposes the private key.

If it reports a project mismatch, generate a JSON key for **anbu-portfolio-b91f6**, then Vercel → Project → Settings → Environment Variables → replace **FIREBASE_SERVICE_ACCOUNT_JSON** for **Production** with the complete JSON contents. Do not include `.env` assignment syntax or surrounding shell quotes in Vercel. Redeploy from Deployments after saving. The public `FIREBASE_PROJECT_ID` must match the private JSON's `project_id`.

If access is denied, Google Cloud Console → IAM → select this project → grant the credential's service account **Cloud Datastore User**. Check that Cloud Firestore API is enabled. Keep the deny-all browser rules. If the database is missing, create Standard `(default)` in Firebase → Firestore Database. Wait one minute and reload `/admin` after fixing configuration.

Email link sign-in additionally needs Email/Password + Email link enabled and `anbu-portfolio-seven.vercel.app` in Authentication → Settings → Authorized domains. Check the current provider settings before sending a new link; Spark allows only five sign-in emails daily.

## Intro and supporting proof

Site settings controls the fullscreen introduction, its three typed lines, and ordered frame URLs. The eleven bundled PNGs remain byte-identical to the originals; `public/hero-frames/manifest.json` records their hashes. Reduced-motion visitors see the final pose. The rest of the site's chapters and theme remain independent.

Experience → Supporting proof accepts an original office photo or PDF. Certifications and gallery entries also support proof, credential ID, issued date, expiry, and a verification URL. Save the draft and Publish to make new proof public. Hidden entries/chapters keep their uploads private. The popup shows the original image or PDF pages beside metadata; it does not automatically redirect visitors to LinkedIn.
