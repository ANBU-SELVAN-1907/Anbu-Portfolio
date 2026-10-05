# MASTER BRIEF: Enterprise ATS Resume Builder SaaS ("ResumeForge", working name)

> Paste this whole document into your AI coding assistant as the project context. Then build phase by phase (see Section 20).

---

## 0. YOUR ROLE (instruction to the AI)

You are a principal product architect, senior full-stack engineer, UX/UI designer, and ATS/recruiting domain expert. Build a production-grade, enterprise-level SaaS that turns a user's raw details (name, summary, experience, skills, etc.) into a **polished, ATS-parseable, downloadable PDF and editable DOCX resume**. It must be a serious competitor to Resume.io, Zety, Novoresume, Enhancv, Rezi, Jobscan, Kickresume and Teal.

Work in phases. Before coding each phase: restate the goals, list files to create, then implement. Write tested, typed, documented, production-ready code. Never use placeholder logic where real logic is possible.

---

## 1. PRODUCT VISION AND STORY

**The problem:** About 75%+ of large employers use an Applicant Tracking System (Workday, Taleo, Greenhouse, Lever, iCIMS, SuccessFactors, SmartRecruiters, Ashby, Jobvite, BambooHR). Most "pretty" resumes (columns, tables, text boxes, icons, images, graphics-as-text) get mis-parsed: names, dates, and job titles land in the wrong fields, keywords are lost, and the candidate is silently filtered out.

**The story:** Meet Priya, a software engineer in Chennai applying to Google, Infosys, Accenture, Amazon and 40 other companies. She types her details once. The app guides her, rewrites weak bullets into measurable achievements, compares her resume to each job description, shows a live ATS score plus exactly what to fix, and exports a perfectly parseable PDF and DOCX. She tailors a version per job in under 2 minutes, tracks applications, and gets more interviews.

**Promise (be honest in marketing):** "Built to pass the parsers of major ATS platforms." Do NOT promise "100% selection". No tool can guarantee hiring or shortlisting. Instead, guarantee **100% parse-safe output** via automated validation, and show proof (parse-simulation report).

**Positioning:** Most luxurious, fastest, smartest, and most trustworthy ATS resume builder: parse-verified exports, AI that never fabricates, premium design that is still ATS-safe.

---

## 2. TARGET USERS (PERSONAS)

1. **Fresher / student** (India, US, UK, EU, Gulf): needs guidance, project/intern sections, templates.
2. **Mid-career professional:** needs fast tailoring per job.
3. **Senior / executive:** needs concise, impact-led, 2-page resumes.
4. **Career switcher:** needs skills-first/hybrid format and transferable-skills mapping.
5. **Career coaches / colleges / bootcamps (B2B):** manage many users, brand templates, bulk reports.
6. **Enterprise HR / outplacement firms:** SSO, teams, audit logs, white label.

---

## 3. WHAT MAKES A RESUME GENUINELY ATS-FRIENDLY (NON-NEGOTIABLE RULES)

The export engine and validator must enforce these:

**Structure and layout**
- Single-column, linear reading order (no multi-column, no tables for layout, no text boxes, no floating shapes, no headers/footers holding key data like name or contact).
- Standard, recognized section headings: Summary/Professional Summary, Experience/Work Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages, Volunteer. Allow custom headings but warn when non-standard.
- Reverse-chronological as default; also offer functional/hybrid for career switchers (with warning).
- Consistent date format (e.g., `Jan 2022 – Present` or `01/2022 – Present`), always parseable.
- Contact info in the body (top), not in header/footer: name, phone, email, city/state/country, LinkedIn, portfolio/GitHub.

**Typography and files**
- Standard fonts only for export (Arial, Calibri, Helvetica, Times New Roman, Georgia, Garamond, Cambria, Verdana, Tahoma). Embed fonts correctly in PDF.
- Body 10–12pt, headings 12–16pt, name up to 20–24pt. Standard bullets (• or -) only; no custom glyph icons.
- No images, profile photos (default off; optional with warning, region-aware: photos common in DE/FR/Gulf but harmful for US/UK bias compliance), no skill bars/rating dots/charts/progress circles (these are unparseable and meaningless to ATS).
- Icons for phone/email/etc. must never replace text labels. If used, they must be decorative only and the text must remain.
- Page size: Letter (US/Canada) or A4 (rest of world), auto by region.
- File outputs: **text-selectable PDF (real text layer, tagged PDF, correct reading order, metadata title/author/keywords)** and **clean DOCX** (real Word styles: Heading 1/2, List Bullet, Normal; no tables/text boxes for layout; proper numbering). Optional: TXT and JSON Resume export.
- File name format: `Firstname_Lastname_Role_Resume.pdf`.

**Content**
- Keyword alignment with the job description: exact phrases, acronyms and spelled-out forms (e.g., "Search Engine Optimization (SEO)").
- Action verb + task + measurable result bullets (XYZ / STAR / CAR formats).
- Length guidance: 1 page (<10 yrs), 2 pages (10+), CV mode for academia.
- Avoid first-person pronouns, clichés, buzzword stuffing, hidden white text, keyword stuffing (these are penalized and unethical; detect and block).

---

## 4. CORE FEATURE SET (GOD-MODE LEVEL)

### 4.1 Onboarding and data entry
- Guided wizard plus freeform "quick start": the user types name, role, and key particulars; the app builds a first draft in under 60 seconds.
- Import from: existing PDF/DOCX resume (parse and structure), LinkedIn PDF export, LinkedIn profile URL (user-consented data only), JSON Resume, plain text paste, Google Drive/Dropbox/OneDrive.
- "Interview mode": a conversational AI asks questions section by section (what did you achieve? what numbers?) and writes bullets from the answers.
- Autosave on every keystroke, version history, undo/redo, offline-tolerant drafts.
- Profile Vault: one master profile (all jobs, projects, skills) from which tailored resumes are generated by selecting relevant items.

### 4.2 AI Engine (core differentiator)
- **Bullet Enhancer:** rewrites weak lines into impact bullets; shows before/after; user accepts/rejects each.
- **Summary Generator:** role- and seniority-aware, 3 tones (concise, confident, executive).
- **JD Tailoring:** paste job description or URL; the app extracts must-have vs nice-to-have skills, responsibilities, seniority, and keywords; maps them to the user's real experience; suggests edits. Output a tailored resume version in one click.
- **Keyword Gap Analysis:** matched / missing / over-used keywords with placement suggestions (skills section, summary, bullets).
- **Skills Extractor and Taxonomy:** normalizes skills (ESCO, O*NET, Lightcast-style taxonomy), handles synonyms and acronyms.
- **Cover Letter and LinkedIn headline/About generator** matching the resume.
- **Interview prep Q&A** generated from resume + JD.
- **Hallucination guardrails (critical):** AI may only rephrase and quantify using facts the user provided; if a metric is missing, it asks the user instead of inventing numbers. Show a "verify claims" checklist before export. All AI actions are logged and reversible.
- **Prompt/Model layer:** provider-agnostic (OpenAI / Anthropic / Google / local), with fallback, caching, structured JSON output with schema validation, retries, cost and latency tracking, per-plan quotas, PII redaction in logs.

### 4.3 ATS Scoring and Parse Simulation (the trust engine)
- **Live ATS Score (0–100)** with a transparent breakdown:
  - Parseability (structure, fonts, layout) 30%
  - Section completeness and headings 15%
  - Keyword match to JD 25%
  - Content quality (action verbs, metrics, length, tense consistency) 20%
  - Formatting consistency and dates 10%
- **Parse Simulator:** run the exported file through an internal parser and show "what the ATS sees": extracted name, email, phone, titles, companies, dates, skills, education, in a structured table. Highlight mismatches in red with one-click fixes. Optionally integrate open-source/commercial parsers (e.g., Affinda, Sovren/Textkernel, RChilli APIs, or spaCy/Docling-based custom parser) for cross-checking.
- **Plain-text view** and **copy-paste test** (extracts text in reading order; catches scrambled order).
- **Issue Fixer:** each issue has severity (critical/warn/info), explanation, and an auto-fix button.
- **Per-ATS profiles:** Workday, Taleo, Greenhouse, Lever, iCIMS, SuccessFactors, SmartRecruiters: known quirks and checks per platform.
- **Region profiles:** US/Canada, UK/Ireland, EU, India, Gulf/UAE, Australia/NZ, Singapore (photo, DOB, nationality, page-size and CV conventions).
- Disclose that scores are estimates; never claim an official ATS score.

### 4.4 Template System
- 30+ launch templates (target 100+), in categories: Classic, Modern, Executive, Tech/Engineering, Creative-safe, Fresher, Academic CV, Finance/Consulting, Healthcare, Government.
- Every template is **ATS-certified by automated tests** (single flow, real text, proper styles). A badge shows "ATS-verified" only if it passes the test suite.
- Customization: font pair, size scale, line spacing, margins, accent color (used only for text/rules), section order drag-and-drop, show/hide sections, bullet style, date format, one/two-page fitting ("Auto-fit to 1 page" with smart trimming suggestions).
- Design-token-based template engine (JSON config → renders to HTML/CSS for preview, PDF, and DOCX from the SAME data model so the outputs always match).
- Luxury look comes from typography, whitespace, hairline rules, refined color palettes, and small-caps headings, never from images or columns.

### 4.5 Export Engine
- **PDF:** server-side render (headless Chromium/Playwright or a PDF library like React-PDF/WeasyPrint/Typst) producing tagged, text-searchable, font-embedded, small-size PDFs. Validate after render: text extractable, reading order correct, fonts embedded, no images-of-text.
- **DOCX:** generate with `docx` library (JS) or `python-docx`/Open XML with real styles, numbering, hyperlinks, and page setup. Must open perfectly in Word, Google Docs, LibreOffice and Pages and be fully editable.
- Also: TXT, JSON Resume, HTML (public resume link), and optional "ATS-safe + designed" dual download (plain version for ATS upload, designed version for emailing humans).
- Post-export QA: run the parse simulator automatically on the produced file and block "ATS-verified" labeling if it fails.

### 4.6 Job Application Tracking (retention feature)
- Kanban board (Saved, Applied, Interview, Offer, Rejected), linked to the exact resume version sent.
- Chrome extension: one-click "Save job + extract JD + tailor resume"; autofill support for common application forms.
- Reminders, follow-up email templates, analytics (response rate per resume version).

### 4.7 Collaboration and Review
- Share link for feedback (comments, suggestions), mentor/coach mode, approval flow, version compare (diff view).

### 4.8 Enterprise and B2B
- Organizations, workspaces, roles (Owner, Admin, Coach, Member, Viewer), SSO (SAML/OIDC), SCIM, audit logs, data residency options, white-label branding, custom templates, bulk import/export, usage dashboards, API and webhooks, SLA.

### 4.9 Monetization (SaaS)
- Free (limited templates, 1 resume, watermark-free PDF but limited AI), Pro (monthly/annual), Career Coach/Team, Enterprise. Regional pricing (INR, USD, EUR, GBP, AED), Stripe + Razorpay + PayPal, GST/VAT invoices, coupons, referrals, trials, dunning, cancellation flow, usage metering.
- Never hold a user's resume hostage: free users can always download their own data.

---

## 5. UI / UX REQUIREMENTS (LUXURY, ELEGANT, USER-FRIENDLY)

**Design language:** "quiet luxury": generous whitespace, refined serif+sans pairing (e.g., Fraunces/Playfair headings + Inter/Geist body for the app UI), deep ink/ivory/champagne-gold or slate/emerald palettes, soft shadows, subtle glass effects, 8pt grid, 12–16px radii, micro-interactions at 150–250ms, no clutter.

**Key screens**
1. Landing page: hero with live resume preview, ATS score animation, proof of parse-simulation, templates gallery, pricing, FAQ, trust (privacy, security).
2. Auth: email, Google, LinkedIn, GitHub, magic link, passkeys, MFA.
3. Dashboard: resumes, versions, ATS scores, applications, AI credits.
4. **Editor (the hero screen):** three-pane layout:
   - Left: section navigator (drag to reorder, completion indicators).
   - Center: focused form/rich-text editing with inline AI suggestions and real-time validation.
   - Right: pixel-accurate live preview (page-break aware, zoom, A4/Letter toggle) with a collapsible ATS Score and Issues panel.
   - Command palette (Cmd/Ctrl+K), keyboard shortcuts, split/focus mode.
5. JD Tailor screen: JD on the left, keyword heatmap and suggestions on the right.
6. Parse Simulator screen: "What the ATS sees" view.
7. Template gallery with filters, instant preview with the user's data.
8. Export modal: format, filename, version, final checklist, ATS verification badge.
9. Settings, billing, team admin, privacy center (export/delete data).

**UX principles**
- First resume downloaded in under 5 minutes; first draft in under 60 seconds.
- Progressive disclosure, smart defaults, zero dead ends, helpful empty states, inline examples ("good vs bad bullet").
- Mobile-first responsive (editing on phone must be excellent), PWA support, tablet split view.
- Dark/light/system themes, WCAG 2.2 AA accessibility (keyboard, screen reader, contrast, reduced motion), RTL support (Arabic, Urdu, Hebrew), i18n (English, Hindi, Tamil, Spanish, French, German, Arabic, etc.) with locale-aware dates and number formats.
- Performance: LCP < 2s, INP < 200ms, preview update < 100ms, Lighthouse 95+.
- Skeletons, optimistic updates, toasts, undo, never lose user data.

---

## 6. SYSTEM ARCHITECTURE

**Style:** modular monolith first, with clean boundaries that can split into microservices (Auth, Resume, Template, AI, ATS-Analysis, Export, Billing, Notification, Analytics).

**Suggested stack (adjust if justified)**
- **Frontend:** Next.js (App Router) + React + TypeScript, Tailwind CSS + shadcn/ui + Radix, Framer Motion, TanStack Query, Zustand, React Hook Form + Zod, TipTap/Lexical for rich text, dnd-kit for drag and drop. Storybook + Chromatic for the design system.
- **Backend API:** NestJS (TypeScript) or FastAPI (Python) for AI/NLP workers. REST + OpenAPI, with GraphQL optional. Zod/Pydantic validation everywhere.
- **Database:** PostgreSQL (Prisma/Drizzle ORM) with JSONB for resume documents, pgvector for semantic matching; Redis for cache, rate limits, queues; OpenSearch/Meilisearch for template and skills search.
- **Queues/Workers:** BullMQ or Celery for export, AI, and parsing jobs; idempotent jobs, retries, dead-letter queues.
- **Storage:** S3-compatible object store (encrypted), signed URLs, lifecycle rules.
- **Export workers:** isolated containers running Playwright/Typst/docx generators with strict resource limits.
- **AI/NLP:** LLM gateway service + spaCy/transformers for NER, skill extraction, section detection, embeddings for JD-to-resume matching.
- **Auth:** Auth.js/Clerk/Keycloak/Ory, OAuth2/OIDC, JWT + refresh rotation, MFA, passkeys (WebAuthn).
- **Infra:** Docker, Kubernetes (or ECS/Cloud Run), Terraform, CDN (Cloudflare), multi-AZ, blue/green deploys, feature flags (Unleash/LaunchDarkly).
- **Observability:** OpenTelemetry, Prometheus/Grafana, Sentry, structured logs, product analytics (PostHog), uptime SLOs (99.9%+).
- **CI/CD:** GitHub Actions: lint, typecheck, unit, integration, e2e, visual regression, security scans, SBOM, preview environments.

**Single source of truth:** a canonical **Resume JSON schema** (compatible with and extending JSON Resume) from which preview, PDF, DOCX, TXT and ATS analysis are all derived. Never maintain separate content models per output.

---

## 7. CANONICAL DATA MODEL (SUMMARY)

- `User`, `Organization`, `Membership`, `Subscription`, `Plan`, `UsageMeter`
- `MasterProfile` (all career data) → `Resume` (a selection + ordering + overrides) → `ResumeVersion` (immutable snapshots) → `Export` (file, format, checksum, validation report)
- `Resume.content` JSON: `basics` (name, headline, email, phone, location, links), `summary`, `work[]` (company, title, location, start, end, current, bullets[], skills[]), `education[]`, `skills[]` (grouped, with normalized IDs), `projects[]`, `certifications[]`, `awards[]`, `publications[]`, `languages[]`, `volunteer[]`, `custom[]`
- `Template` (design tokens, layout rules, ATS-certification status, version)
- `JobDescription` (raw, parsed requirements, embeddings) → `TailoringSession` (suggestions, accepted changes)
- `AtsReport` (scores, issues, parse simulation, per-ATS results, timestamp, resume version)
- `Application` (job, status, resume version, notes, reminders)
- `AiRun` (prompt version, model, tokens, cost, input hash, output, accept/reject)
- `AuditLog`, `ApiKey`, `Webhook`, `Consent`

Include migrations, seed data, indexes, row-level security for multi-tenancy, soft deletes, and GDPR delete/export flows.

---

## 8. ATS ANALYSIS ENGINE: IMPLEMENTATION DETAILS

1. **Layout checks:** inspect generated PDF/DOCX (pdfminer/pdf.js/PyMuPDF; docx XML) for tables, multi-column geometry, images, text boxes, header/footer content, font embedding, unusual glyphs, hidden text.
2. **Parsing pipeline:** text extraction in reading order → section segmentation → NER for names/orgs/titles/dates → date normalization → skill matching against taxonomy → structured output compared against the source JSON (round-trip fidelity score).
3. **Keyword engine:** TF-IDF + BM25 + embedding similarity; handles stemming, synonyms, acronyms, multi-word phrases; distinguishes required vs preferred; detects keyword stuffing.
4. **Content-quality engine:** weak-verb detection, passive voice, missing metrics, tense consistency (past for old roles, present for current), bullet length (1–2 lines), repetition, typos, personal pronouns, buzzword density.
5. **Scoring:** deterministic, explainable, versioned rules plus ML assist; every deduction maps to an actionable fix. Publish a "How we score" page.
6. **Regression suite:** a corpus of 500+ real-world-style resumes and 20+ ATS parser behaviors to guard against template regressions in CI.

---

## 9. SECURITY, PRIVACY, COMPLIANCE

- Resumes are highly sensitive PII. Encrypt in transit (TLS 1.3) and at rest (AES-256, KMS-managed keys); field-level encryption for phone/address if needed.
- GDPR, CCPA/CPRA, India DPDP Act 2023: consent management, data export, right to delete (hard delete within 30 days, including backups policy), DPA for B2B, data residency options.
- SOC 2 Type II and ISO 27001 readiness: audit logs, access reviews, secrets management, least privilege, vulnerability scanning, pen tests.
- OWASP ASVS: CSRF, XSS, SSRF (JD URL fetcher must be sandboxed), injection, file upload scanning (ClamAV), zip-bomb and malicious-PDF defenses, rate limiting, bot protection, WAF.
- AI privacy: no training on user data without explicit opt-in; PII redaction in logs; zero-data-retention endpoints for enterprise.
- Anti-fraud: do not help fabricate experience; flag inconsistencies (overlapping dates, impossible timelines) as warnings.

---

## 10. QUALITY, TESTING, RELIABILITY

- Unit, integration, contract, e2e (Playwright), visual regression for every template at multiple data lengths (short/long/overflow), accessibility tests (axe), load tests (k6), chaos tests for workers.
- **Golden-file tests:** each template renders PDF + DOCX from fixture resumes; automated assertions on text order, fonts, no tables, page count, and parse-round-trip accuracy ≥ 98% on name/email/phone/titles/dates.
- Manual compatibility matrix: Word (Win/Mac), Google Docs, LibreOffice, Pages, Acrobat, Chrome/Safari PDF viewers, ATS upload sandboxes where available.
- SLOs: export success ≥ 99.9%, p95 export < 6s, p95 API < 300ms, zero data-loss policy (autosave + versioning).

---

## 11. ANALYTICS AND GROWTH

- Funnel tracking (visit → signup → first resume → first export → paid), activation metrics, AI acceptance rate, ATS score uplift, user-reported interview rate.
- SEO engine: programmatic pages (resume examples per role/industry/country, ATS guides, "resume for [job]" pages), blog, free tools (ATS checker, resume scanner, bullet rewriter, keyword finder) as top-of-funnel lead gen.
- Referral program, affiliate program for coaches and colleges, public API for partners.

---

## 12. ADMIN PANEL

User/org management, subscriptions, refunds, AI cost monitoring, template management and certification pipeline, content moderation, feature flags, support impersonation (audited), health dashboards, A/B tests.

---

## 13. DIFFERENTIATORS VS COMPETITORS (MUST SHIP)

1. Parse-verified exports with a visible proof report (competitors only claim it).
2. One data model → identical PDF/DOCX/preview (no layout drift).
3. Hallucination-safe AI that asks for real metrics instead of inventing them.
4. Per-ATS and per-region profiles.
5. One-click JD tailoring with a full audit trail and diff.
6. Luxury design that is still 100% single-column and parse-safe.
7. Chrome extension plus application tracker tied to resume versions.
8. Transparent scoring methodology and honest claims.
9. Enterprise controls (SSO, SCIM, white-label) at a fair price.
10. Fast: first draft in 60 seconds.

---

## 14. LEGAL AND ETHICS

Honest marketing (no guarantee of employment), clear AI disclosures, bias-awareness guidance (photo, age, gender, marital status recommendations by region), accessibility statement, terms and privacy policy, cookie consent, DMCA process for templates, licensed fonts only (Google Fonts/OFL or purchased licenses).

---

## 15. FOLDER STRUCTURE (MONOREPO)

```
/apps
  /web            (Next.js app)
  /api            (NestJS or FastAPI)
  /workers        (export, ai, parse)
  /extension      (Chrome extension)
  /admin
/packages
  /resume-schema  (Zod + JSON Schema, shared types)
  /template-engine(tokens, renderers: html, pdf, docx, txt)
  /ats-engine     (rules, parser, scorer)
  /ui             (design system)
  /ai-gateway
  /config
/infra            (terraform, k8s, docker)
/docs             (ADR, API, scoring methodology)
/tests            (fixtures, golden files, e2e)
```

---

## 16. API SURFACE (MINIMUM)

`POST /auth/*` · `GET/POST/PATCH/DELETE /resumes` · `POST /resumes/import` · `GET /resumes/:id/versions` · `POST /resumes/:id/export?format=pdf|docx|txt|json` · `POST /resumes/:id/ats-analyze` · `POST /resumes/:id/tailor` (JD input) · `POST /ai/enhance-bullet` · `POST /ai/summary` · `POST /ai/cover-letter` · `GET /templates` · `GET/POST /applications` · `POST /billing/checkout` · webhooks (Stripe, Razorpay) · public API with API keys and rate limits. Everything documented in OpenAPI with typed SDKs.

---

## 17. ACCEPTANCE CRITERIA (DEFINITION OF DONE FOR v1)

- A new user goes from signup to a downloaded ATS-verified PDF and DOCX in under 5 minutes.
- Every shipped template passes all automated ATS tests; DOCX opens cleanly in Word and Google Docs and is fully editable.
- Parse simulator round-trip accuracy ≥ 98% on core fields across the test corpus.
- JD tailoring never adds facts the user did not provide.
- Editor preview and exported PDF match visually (page breaks included).
- Lighthouse ≥ 95, WCAG 2.2 AA pass, responsive from 360px to 4K.
- Security checklist passed, GDPR/DPDP flows working, backups and restore tested.
- Documentation complete: README, architecture decisions, runbooks, API docs, scoring methodology.

---

## 18. SAMPLE USER FLOW (END TO END)

1. User lands, clicks "Build my resume", signs up with Google.
2. Chooses: start from scratch / upload existing / import LinkedIn.
3. Enters name, target role, country; the app selects region profile (e.g., India → A4, no photo recommended).
4. Fills or interviews through Experience, Education, Skills, Projects; AI polishes bullets with the user's approval.
5. Picks a template; sees live preview and ATS score (e.g., 78).
6. Pastes a job description; sees missing keywords; accepts suggested edits; score rises to 92.
7. Opens Parse Simulator; confirms every field is read correctly.
8. Clicks Export → PDF and DOCX; sees "ATS-verified" report; downloads.
9. Saves the job to the tracker; applies; follows up using generated email.

---

## 19. NON-FUNCTIONAL TARGETS

Scale to 1M users and 10k concurrent editors; horizontal autoscaling; cost-aware AI routing (small models for cheap tasks, large models for tailoring); multi-region read replicas; 99.95% availability; RPO ≤ 5 min, RTO ≤ 1 hr.

---

## 20. BUILD ORDER (PHASES FOR THE AI TO FOLLOW)

**Phase 1 (Foundation):** monorepo, design system, auth, resume JSON schema, database, basic editor with live preview, 3 ATS-safe templates, PDF export.
**Phase 2 (Core value):** DOCX export, import (PDF/DOCX/LinkedIn), ATS rule engine v1, live score, issue fixer, plain-text view.
**Phase 3 (Intelligence):** AI gateway, bullet enhancer, summary, JD tailoring, keyword gap analysis, parse simulator, hallucination guardrails.
**Phase 4 (Scale of templates and polish):** 30 templates with certification pipeline, region and per-ATS profiles, versioning and diff, i18n/RTL.
**Phase 5 (SaaS):** billing, plans, quotas, tracker, Chrome extension, share and feedback, analytics, SEO tools.
**Phase 6 (Enterprise):** orgs, SSO/SCIM, audit logs, white-label, API, admin panel, compliance hardening.

For each phase deliver: architecture notes, code, tests, migration scripts, docs, and a demo script. Ask me only when a decision blocks progress; otherwise choose sensible defaults and document them.

---

## 21. FIRST INSTRUCTION TO THE AI

"Start with Phase 1. First output: (a) final tech-stack decision with reasoning, (b) the complete Resume JSON schema, (c) the monorepo scaffold, (d) the design tokens for the luxury theme, (e) the first ATS-safe template with HTML preview, PDF export and tests. Then continue phase by phase."
