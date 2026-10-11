# Architecture

## Runtime and boundaries

The Next.js 16/React 19 app runs server pages/API routes on Vercel using its Node.js runtime. Firebase Spark supplies Authentication and Firestore through HTTPS. No Supabase, paid Cloud Storage, Functions, App Hosting, or billing service is required by the new runtime. Legacy D1/R2 schemas and local data remain in the workspace for migration. They are excluded from the GitHub/Vercel application source.

`lib/firebase.ts` is the server storage boundary. It obtains scoped OAuth tokens from a private service-account key and calls Firestore REST. `lib/firebase-server.ts` exposes content snapshots, initialization, bounded request bodies, publication-aware reads, rate limits, and aggregate metrics. Content and large file/history fields are exempt from indexing through `firebase/firestore.indexes.json`.

## Identity

Public content reads only the published snapshot. On Firebase outages or project/configuration errors, visitors receive bundled public content and sanitized server diagnostics. Private drafts never serve as a fallback. Admin reads and writes still fail closed, so an outage cannot grant editing access.

`components/firebase-login.tsx` loads only public web configuration and preloads Firebase email-link/Google sign-in. Firebase credentials use in-memory client persistence. `/api/auth/session` verifies the ID token through `lib/firebase-auth.ts`: RS256 signature, Firebase project issuer/audience, expiration, issued/auth times, Google/email provider, verified owner email, pinned/bound UID, and live account revocation state. Only anbu.t80555@gmail.com can become the portfolio owner.

The browser receives a short-lived HttpOnly session cookie, Secure with the __Host prefix in production, SameSite=Strict, and no refresh token. Every admin endpoint verifies the identity. Mutations also require exact same-origin requests. ChatGPT mock/trusted headers cannot grant studio access. Firebase direct-client rules deny all reads and writes; the service account has narrowly scoped Firestore IAM access and remains server-only.

## Content and files

Content is a strict versioned schema. Draft saves and publishes use Firestore transactions with revision checks. Publishing atomically writes live content and its history snapshot. Only public, enabled, visible content exposes file links. The owner can restore snapshots into a draft; publishing is a separate action. Up to 20 published versions are retained.

Spark-compatible uploads use private Firestore documents, capped at 4 MiB. Binary files are base64 encoded, share database storage, and never use Cloud Storage. Uploads have bounded request streams and signature/type checks. API access determines whether a file is published. Deletion refuses current and retained-history references. This is a deliberate small-portfolio tradeoff; large media belong in bundled assets or a future object-store adapter.

## Public presentation

`components/portfolio.tsx` composes the story; portrait, project lab, gallery, ambient canvas, dock, marquee, chat, and contact are separate components. `app/portfolio.css` is the public design system; `app/studio.css` is the admin design system. `lib/editorial.ts` normalizes new fields without deleting existing edits and supplies three theme presets. Custom chapters use bounded cards/typography; gallery images have fixed aspect ratios and pagination.

The animated contour field runs at a bounded frame rate and pauses offscreen/hidden or for reduced motion. It uses fewer curves on mobile, limits pixel density, and reacts gently to pointer movement. CSS background drift uses transforms; reduced motion and admin motion/background controls disable it. Theme/privacy preferences are browser-local, while owner content is persistent in Firestore.

The admin keeps 30 undo/redo snapshots and stores an unsaved recovery copy in this tab's session storage. Recovery always requires review; it never publishes automatically. Collections support search, progressive loading, collapse, duplication, ordering and visibility. Save/publish conflicts are rejected by the server revision guard. Session cookies are cleared through Firebase-specific sign-out, with a dirty-draft confirmation.

`proxy.ts` creates a fresh script nonce per page request and forwards it for Next.js rendering. Pages are dynamic to keep nonces valid. Production disallows script evaluation and arbitrary inline scripts, blocks framing and plugins, and restricts network destinations. Inline styles support animation parameters; HTTPS responses upgrade insecure resources. Global headers include HSTS, no-sniff and restricted camera/microphone/location access.

## Resume Studio

`/resume-builder` is a separate public app promoting the portfolio. `lib/resume/model.ts` is the canonical data and workspace schema. `analyze.ts` gives explainable local writing/keyword guidance. `export.ts` generates tagged embedded-font PDF and editable DOCX from the same model. `import.ts` extracts local file text and verifies the actual PDF round-trip. `components/resume-pdf-preview.tsx` renders exact generated pages using PDF.js without relying on the browser's embedded PDF plugin.

Drafts, versions, and job tracking remain local to the visitor's browser. Autosave is paused on malformed storage or cross-tab changes rather than overwriting unknown data. The privacy center exports/deletes local data. Public share links contain no resume data. Optional AI sends the requested text to Google only after consent, validates structured output, rejects unsupported numeric claims, and requires review before applying suggestions. See RESUME_BUILDER.md for working features and limits relative to the enterprise brief.

## Verification and deployment

Real JWT cryptography tests use mocked Google transport; document tests generate all templates/page sizes and verify extraction, fonts, tags, and DOCX styles. Live Firebase security/rules/storage flows still require the user's project configuration. GitHub and Vercel are the selected source/hosting path. Live Firebase and Vercel verification require configuration in the owner account. See FIREBASE_SETUP.md and DEPLOYMENT.md.

`/api/resume` resolves the published PDF, serves uploaded bytes with an attachment filename, and supports owner-only draft downloads. Uploading a resume never changes the public download before publishing. Server variables use `lib/env.ts`; no runtime Cloudflare bindings remain.

`/api/auth/email` sends Firebase email links only to the owner address with same-origin validation, bounded input, IP/global limits and a callback on this app. Email completion confirms the address and exchanges a verified ID token for a server session. Both email and Google login remain locked while the backend credential is missing.
