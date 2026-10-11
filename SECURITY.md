# Security verification

Last checked: 2026-10-11. Runtime: Next.js 16.3.8 and React 19.2.6.

## Implemented protections

- Owner-only Firebase login: signed ID tokens, verified email, provider/project checks, recent authentication, UID binding and live disabled/revoked-account checks.
- HttpOnly, Secure production cookies with SameSite=Strict and a maximum one-hour lifetime. Same-origin checks protect mutations and sign-out.
- Firestore client rules deny all direct access. Server credentials are private and scoped to Firestore; they never enter client bundles or responses.
- Strict content schemas, bounded request bodies, controlled 400/413 errors, revision-checked transactions, separate drafts and publication history.
- Upload size/type/signature checks. Unpublished files remain private; referenced files cannot be deleted. Public PDFs download as attachments.
- Per-IP/global limits for public contact, login and AI endpoints. Analytics writes stop when the owner disables analytics.
- Fresh script nonces, no production script evaluation, no framing/plugins, HSTS, no-sniff and restricted device permissions.
- DOCX import extracts only bounded main-document XML, ignores attachments, rejects XML entities and checks actual inflated size rather than trusting ZIP metadata.
- Resume drafts remain in the visitor's browser. Optional AI requires consent and keeps its key server-only.

## Verification results

Lint, TypeScript, production build, real signed-token tests, mocked Firestore route tests, document export/import tests and automated production HTTP checks passed. Transport mocks do not establish that the owner's Firebase project is configured correctly.

The production dependency audit reported **zero known vulnerabilities**. The full audit still reports **five development-only findings** from one unpatched `braces` dependency in the Next.js ESLint → fast-glob → micromatch chain. npm currently has no patched release of braces 3.0.3. It processes trusted repository lint patterns rather than visitor requests. The official Next.js ESLint configuration is retained; CI audits production dependencies. Recheck this chain before introducing untrusted build input. [Upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

Dependency audits and regression tests are bounded checks, not a guarantee against every attack. Re-run checks after dependency or authentication changes.

## Live setup still required

The private `FIREBASE_SERVICE_ACCOUNT_JSON` is missing locally. Live email delivery, owner login, Firestore writes/rules and deployed-origin checks require the owner's configuration. The optional real AI guide also needs `GEMINI_API_KEY`. Configure secrets privately using FIREBASE_SETUP.md and DEPLOYMENT.md; never commit them or paste them into chat.

Use Firebase Spark and Vercel Hobby without a billing account. Quotas can stop service; this implementation does not enable paid upgrades. Store offline content/media backups and rotate any exposed private credential.
