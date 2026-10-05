# Anbu Selvan T — Portfolio & Resume Studio

A responsive editorial portfolio with an owner content studio, achievements gallery, three visual themes, custom chapters, interactive project walkthroughs, and a public resume builder.

## Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

- Portfolio: http://localhost:5173/
- Owner studio: http://localhost:5173/admin
- Shareable resume tool: http://localhost:5173/resume-builder

The builder works without sign-up or cloud credentials. Configure Firebase Spark before owner sign-in and backend writes. Do not enable billing for the strict free setup.

## Guides

- [Firebase setup, free allowances, and Google sign-in](FIREBASE_SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment and optional AI](DEPLOYMENT.md)
- [Resume builder features and limitations](RESUME_BUILDER.md)

## Checks

```powershell
npm run typecheck
npm run build
node scripts/check-resume.mjs
node scripts/check-firebase.mjs
node scripts/check-firestore.mjs
```

The portfolio and Resume Studio are publicly accessible without login. Only portfolio administration requires verified owner authentication. The active Firebase project is `anbu-portfolio-b91f6`; its public project identifiers are provided in the example environment files. Fill `FIREBASE_API_KEY` from Firebase Project settings in your ignored local environment file and host environment settings. The private server credential and owner UID still need to be configured.

## Deploy to Vercel

Import this GitHub repository as a Next.js project. Use the repository root and `npm run build`; leave the output directory at its default. In project environment settings, add `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, and `FIREBASE_APP_ID` using `.env.example` and your Firebase web app configuration. The API key placeholder is intentionally blank. Add the private `FIREBASE_SERVICE_ACCOUNT_JSON` directly in Vercel as a sensitive server variable. After the first authorized Google login, set `FIREBASE_OWNER_UID` and redeploy.

Enable Google sign-in and create the default Firestore database in the Firebase console. Publish the rules in `firebase/firestore.rules`, apply the index exemptions in `firebase/firestore.indexes.json`, and add your exact deployed hostname to Firebase Authentication's authorized domains. See `FIREBASE_SETUP.md` for details.

This repository contains the application source, bundled assets, export fonts, database rules, configuration, and validation scripts. Dependencies, generated builds, local drafts, environment secrets, and credential files are excluded. Optional AI features require a privately configured `GEMINI_API_KEY`.
