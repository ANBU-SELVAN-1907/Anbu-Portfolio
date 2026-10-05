# Firebase setup — no billing account

This configuration uses **Firebase Spark**, Google sign-in, and Cloud Firestore. It does not use Cloud Storage, Cloud Functions, App Hosting, SMS authentication, or paid Identity Platform MFA. Do not upgrade to Blaze for this implementation.

## What is free? Checked 5 October 2026

| Service                        | Included allowance                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Firestore Standard             | 1 GiB total stored data; 50,000 document reads/day; 20,000 writes/day; 20,000 deletes/day; 10 GiB outbound/month |
| Google sign-in                 | Standard Firebase Authentication Google provider; no SMS used                                                    |
| Firebase Hosting (static only) | 10 GB stored assets; 360 MB/day transfer                                                                         |

Sources: [Firestore pricing](https://firebase.google.com/docs/firestore/pricing), [Firebase pricing](https://firebase.google.com/pricing). Provider policies can change. On Spark, exceeding a quota can make a service unavailable; the app does not automatically upgrade the plan.

**File tradeoff:** Cloud Storage now requires Blaze, so this app stores small uploads inside private Firestore documents. Each upload is limited to **512 KiB**, with base64 encoding using about one-third more database space. Files share the 1 GiB database allowance with content, history, metrics, and messages. Large photos/PDFs should be compressed or bundled as website assets. The original portrait remains a bundled file and is unchanged. Firestore is adequate for a small portfolio's lightweight uploads, not a general large-file storage service.

## 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and choose **Add project**.
2. Choose a project name, such as `anbu-portfolio`. Google Analytics is optional and not required by this code.
3. Keep the project on **Spark**. Do not add a payment method.
4. Project overview → add a **Web app** (`</>`). Register it.
5. Copy the public web configuration: `apiKey`, `authDomain`, `projectId`, and `appId`. These identify the app; they are not the server's private credential.

## 2. Enable Google sign-in

1. Build → **Authentication** → Get started → **Sign-in method**.
2. Enable **Google**, select your project support email, and save.
3. Authentication → **Settings → Authorized domains**: add `localhost` for development and the exact deployed hostname later. Do not include `http://`, port numbers, or URL paths.
4. Sign in using **anbu.t80555@gmail.com**. Other accounts cannot edit the portfolio.
5. After that account exists in Authentication → Users, copy its **UID** into `FIREBASE_OWNER_UID` for an explicit identity pin.

The server independently verifies the Firebase token's signature, project audience, issuer, expiration, Google provider, verified owner email, UID, and account revocation state. A successful frontend login alone never grants admin access. The first verified owner UID is also bound in Firestore.

### OTP / two-step verification

For the strict free setup, enable [Google account two-step verification](https://myaccount.google.com/security) on your owner account. Google manages that challenge during Google sign-in; the portfolio never asks for your Google password or recovery codes.

This is **not app-enforced Firebase OTP**. Firebase TOTP/SMS MFA requires Identity Platform, and SMS introduces message costs. It is deliberately excluded from the no-billing configuration. [Firebase TOTP requirements](https://firebase.google.com/docs/auth/web/totp-mfa)

## 3. Create Firestore and lock direct access

1. Build → **Firestore Database** → Create database.
2. Choose **Standard edition**, the `(default)` database, and **Production mode**.
3. Choose a suitable location (for example Mumbai for visitors in India). Location cannot be casually changed later.
4. Open **Rules**, replace the rules with `firebase/firestore.rules`, then publish them. These deny all browser/direct client reads and writes.
5. Add single-field index exemptions from `firebase/firestore.indexes.json`: `draft` and `published` in `portfolio_content`, `payload` in `portfolio_history`, and `body` in `portfolio_files`. Disable ascending, descending, and array indexing for these large fields. This avoids indexed string truncation and unnecessary index storage.

The backend uses fixed `portfolio_*` collections. Firestore's automatic single-field indexes cover list queries; no composite index is required. Drafts and inbox messages are never returned by public endpoints.

## 4. Server credential — keep it private

Use a dedicated Google Cloud service account with **Cloud Datastore User** (`roles/datastore.user`) on this project. It needs Firestore data access, not Owner/Editor or Storage permissions. Generate its JSON key from Google Cloud IAM → Service accounts → that account → Keys. Creating/changing this credential must be done by you in your account.

The private JSON belongs only in the server environment. **Do not paste it into chat, the admin editor, GitHub, or frontend code.** A service-account key bypasses Firestore rules, so treat it like a password. Rotate/delete a leaked key immediately.

For `npm run dev` (Next.js), copy `.env.example` to `.env.local`. For local Workers development, copy `.dev.vars.example` to `.dev.vars`. The public project identifiers for `anbu-portfolio-b91f6` are filled in the example files; fill the blank `FIREBASE_API_KEY` from Firebase Project settings in your ignored local file and production host settings. Put your private server JSON key on one line in the ignored local environment file. `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":...}'` must preserve the JSON's `\n` escapes in `private_key`. The entire file is Git-ignored. An alternative is to store the JSON in an ignored local file and use your host's secret UI to set the server variable.

## 5. Start and verify

```powershell
npm run dev
```

Open `http://localhost:5173/admin`. Click **Sign in with Google**. The first owner visit initializes the backend when you save. Review the content kit, gallery, and theme before publishing. The admin's draft preview shows changes before they go live.

Check these cases on your configured project:

- Correct Google account opens the studio; a different account is denied.
- Draft changes do not alter the public portfolio until Publish.
- Revoke refresh tokens or disable the account; subsequent admin requests fail.
- Upload a file under 512 KiB, publish it in the gallery, then verify it on the public page. An unused/unpublished upload must return 404 to visitors.
- Try stale revisions from two studio tabs; the stale update must be rejected.
- Submit a contact message and review it in the owner's inbox.

Live Firebase owner-login and database verification has not yet run: public project configuration is supplied, but the private server credential still needs to be configured. No mock identity can edit the new admin, even in development.

## Hosting without paid Firebase services

This is a dynamic React/Worker app. Firebase Hosting's free static allowance does **not** include its server runtime; Firebase App Hosting/Functions require billing. Keep this app on a free Worker-capable host and use Firebase Spark for the backend. The existing Sites deployment is active and publicly accessible. Vercel can also host this project using its Next.js build; set the same server environment variables in the Vercel project and add its hostname to Firebase Authentication authorized domains. A standalone Cloudflare Workers Free deployment with a free `workers.dev` subdomain can use the new independent Firebase authentication, but its deployment configuration must be set explicitly—do not deploy the starter's placeholder database ID.

Use host secrets for the same environment variables in production. Production uses `__Host-anbu_owner`, `Secure`, `HttpOnly`, and `SameSite=Strict` cookies. HTTPS is required. Owner tokens expire within one hour, and Google login is required again. No public service-account secret is allowed.

## Existing data and maintenance

Legacy D1/R2 files and migrations are retained, but current runtime storage calls use Firestore. Nothing was deleted from the old backend. A local legacy draft and published snapshot were preserved in ignored `.sites-runtime/legacy-draft.json` and `.sites-runtime/legacy-published.json`. After configuring Firebase, use Overview → Import content backup to review either snapshot as a draft before saving/publishing. Overview → Export draft JSON creates future offline content backups. Media URLs must refer to files migrated to the new store. The bundled resume/photo remain available.

Monitor Firebase → Firestore → Usage. History keeps 20 published snapshots; uploads have a size limit. Rate-limit records use keyed IP hashes and are reused between windows. Review old messages/media/metrics periodically. No paid TTL, automatic backup, or point-in-time recovery is enabled. Export published content from the studio regularly and keep an offline backup.

## Zero-cost choices

Use the free host subdomain instead of buying a custom domain. Do not link a billing account in Firebase, Google AI Studio, or Cloudflare. Cloudflare Workers Free currently permits 100,000 requests/day with a 10 ms CPU allowance per request; check real traffic and CPU use before launch. The browser performs resume generation, keeping that expensive work away from the server. Free-tier quota exhaustion should return an error, never silently switch to a paid plan. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

The optional chatbot requires a Google AI Studio key in a free-tier project. Its availability and request limits are provider-controlled. Resume editing, analysis, and PDF/DOCX downloads work without it. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
