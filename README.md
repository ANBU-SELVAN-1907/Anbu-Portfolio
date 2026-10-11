# Anbu Selvan T — Portfolio & Resume Studio

A native Next.js 16 + React 19 portfolio for Vercel, with Firebase Spark email-link/Google authentication and Firestore.

A responsive editorial portfolio with an owner content studio, achievements gallery, three visual themes, custom chapters, interactive project walkthroughs, and a public resume builder.

## Start

```powershell
npm install
npm run dev
```

- Portfolio: http://localhost:5173/
- Owner studio: http://localhost:5173/admin
- Shareable resume tool: http://localhost:5173/resume-builder

The builder works without sign-up or cloud credentials. Configure Firebase Spark before owner sign-in and backend writes. Do not enable billing for the strict free setup.

## Guides

- [Firebase setup, free allowances, and Google sign-in](FIREBASE_SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Security checks and remaining setup](SECURITY.md)
- [Deployment and optional AI](DEPLOYMENT.md)
- [Resume builder features and limitations](RESUME_BUILDER.md)

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
node scripts/check-resume.mjs
node scripts/check-firebase.mjs
node scripts/check-firestore.mjs
npm run check:imports
```

Deploy the repository to Vercel Hobby using the Next.js preset. Firebase and Gemini configuration must be supplied privately through local/server environment files, never committed or pasted into chat.

The admin includes a dedicated **Resume download** tab: upload a PDF, save the draft, then publish. Visitors receive that exact PDF from **Get my resume**. Maximum free-plan upload: 4 MiB.

The studio supports 30-step undo/redo, tab-local draft recovery, searchable and collapsible entries, duplication, ordering, visibility controls, and JSON backups. Publishing and restoring use revision checks to protect concurrent edits.

Security checks cover verified owner tokens and account revocation, private draft files, same-origin mutations, malformed/oversized requests, upload signatures, and fresh Content Security Policy nonces. Live sign-in and cloud writes still require the private Firebase server credential described in the setup guide.
