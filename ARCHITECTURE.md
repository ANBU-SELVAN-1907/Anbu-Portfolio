# Architecture

## Runtime and boundaries

The existing Vinext/React app runs server pages/API routes in a Cloudflare Worker. Firebase Spark supplies Authentication and Firestore through HTTPS. No Supabase, paid Cloud Storage, Functions, App Hosting, or billing service is required by the new runtime. Legacy D1/R2 schemas and files remain retained for data migration and are not deleted.

`lib/firebase.ts` is the server storage boundary. It obtains scoped OAuth tokens from a private service-account key and calls Firestore REST. `lib/firebase-server.ts` exposes content snapshots, initialization, bounded request bodies, publication-aware reads, rate limits, and aggregate metrics. Content and large file/history fields are exempt from indexing through `firebase/firestore.indexes.json`.

## Identity

`components/firebase-login.tsx` loads only public web configuration and lazy-loads Firebase Google sign-in. Firebase credentials use in-memory client persistence. `/api/auth/session` verifies the ID token through `lib/firebase-auth.ts`: RS256 signature, Firebase project issuer/audience, expiration, issued/auth times, Google provider, verified owner email, pinned/bound UID, and live account revocation state. Only anbu.t80555@gmail.com can become the portfolio owner.

The browser receives a short-lived HttpOnly session cookie, Secure with the __Host prefix in production, SameSite=Strict, and no refresh token. Every admin endpoint verifies the identity. Mutations also require exact same-origin requests. ChatGPT mock/trusted headers cannot grant studio access. Firebase direct-client rules deny all reads and writes; the service account has narrowly scoped Firestore IAM access and remains server-only.

## Content and files

Content is a strict versioned schema. Draft saves and publishes use Firestore transactions with revision checks. Publishing atomically writes live content and its history snapshot. Only public, enabled, visible content exposes file links. The owner can restore snapshots into a draft; publishing is a separate action. Up to 20 published versions are retained.

Spark-compatible uploads use private Firestore documents, capped at 512 KiB. Binary files are base64 encoded, share database storage, and never use Cloud Storage. Uploads have bounded request streams and signature/type checks. API access determines whether a file is published. Deletion refuses current and retained-history references. This is a deliberate small-portfolio tradeoff; large media belong in bundled assets or a future object-store adapter.

## Public presentation

`components/portfolio.tsx` composes the story; portrait, project lab, gallery, ambient canvas, dock, marquee, chat, and contact are separate components. `app/portfolio.css` is the public design system; `app/studio.css` is the admin design system. `lib/editorial.ts` normalizes new fields without deleting existing edits and supplies three theme presets. Custom chapters use bounded cards/typography; gallery images have fixed aspect ratios and pagination.

The live network runs at a bounded frame rate and pauses offscreen/hidden or for reduced motion. CSS background drift uses transforms; reduced motion and admin motion/background controls disable it. Theme/privacy preferences are browser-local, while owner content is persistent in Firestore.

## Resume Studio

`/resume-builder` is a separate public app promoting the portfolio. `lib/resume/model.ts` is the canonical data and workspace schema. `analyze.ts` gives explainable local writing/keyword guidance. `export.ts` generates tagged embedded-font PDF and editable DOCX from the same model. `import.ts` extracts local file text and verifies the actual PDF round-trip. `components/resume-pdf-preview.tsx` renders exact generated pages using PDF.js without relying on the browser's embedded PDF plugin.

Drafts, versions, and job tracking remain local to the visitor's browser. Autosave is paused on malformed storage or cross-tab changes rather than overwriting unknown data. The privacy center exports/deletes local data. Public share links contain no resume data. Optional AI sends the requested text to Google only after consent, validates structured output, rejects unsupported numeric claims, and requires review before applying suggestions. See RESUME_BUILDER.md for working features and limits relative to the enterprise brief.

## Verification and deployment

Real JWT cryptography tests use mocked Google transport; document tests generate all templates/page sizes and verify extraction, fonts, tags, and DOCX styles. Live Firebase security/rules/storage flows still require the user's project configuration. No deployment has occurred because the retained Sites project returns project_not_found. See FIREBASE_SETUP.md and DEPLOYMENT.md.
