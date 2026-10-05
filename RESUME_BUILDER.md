# Resume Studio implementation

Public route: `/resume-builder`. Resume Studio is a neutral standalone workspace within the portfolio; its header, footer, title, and favicon do not use the portfolio owner's name. Sharing its link does not share resume data.

## Working core

- Canonical strict Zod model in `lib/resume/model.ts`; one data source for preview, PDF, DOCX, TXT, JSON, and analysis.
- Local workspace: up to 10 resumes, autosave, duplicate, undo/redo, up to 40 explicit versions, restore, and deletion confirmation.
- Add, hide, rename, remove, and reorder sections/entries. Contact, summary, skills, jobs, projects, education, certificates, and custom sections.
- Three single-column templates with visual thumbnails: Classic, Technical, Executive. A4/Letter, 10–12 pt body, 20–30 pt name size, adjustable margins, line spacing, section spacing, heading color, and hanging bullet indentation. Executive centers the introduction in both preview and exports. Summary and Skills can be renamed, hidden, and moved among all other sections. Existing v1 backups receive default presentation settings on import.
- PDF: embedded/subset Liberation Sans fonts, real selectable text, structure tags, metadata, measured line wrapping, automatic page breaks, PDF.js extraction comparison before download. Unsupported text fails verification instead of receiving a misleading badge.
- DOCX: editable paragraphs, heading styles, proper bullet numbering, Arial, hyperlinks, and page setup; no layout tables or floating text boxes.
- Explainable rule-based writing-readiness estimate with completeness, content, date, and optional lexical keyword checks. Missing skills are never inserted automatically. The small curated synonym list is documented in code.
- Local PDF/DOCX/TXT extraction and reviewed text import. This does not claim accurate automatic field segmentation. Native Resume Studio JSON preserves the structure.
- Application tracker: Saved/Applied/Interview/Offer/Rejected, linked to the active resume identity and an explicit saved snapshot.
- Optional server Gemini summary, bullet rewrite, cover letter, and interview suggestions; explicit Google-data consent, review/reject, origin checks, bounded inputs, IP/global quotas, structured output validation, unsupported-number rejection. AI is unavailable until its key is configured.
- Local privacy center and data export/delete. No resume content is sent to Firebase by the public builder. Keep a JSON backup because local browser storage can be cleared.

## Limits of the master brief

The brief is an enterprise SaaS roadmap. This release implements the practical free portfolio tool, not a paid enterprise platform. It does not include billing, teams/SSO/SCIM, a browser extension, external ATS-vendor certification, 30+ independently validated templates, a 500-document parser benchmark, legal compliance certification, SLA, cloud resume syncing/sharing, full i18n/RTL, or guaranteed Lighthouse/ATS compatibility scores. Firebase owner auth is for the portfolio admin; visitors do not need an account to use the builder.

PDF round-trip validation proves that this exported file's text is extractable in the expected order. It does not prove hiring suitability or compatibility with every employer's parser. The estimate is not an official ATS score. AI output still requires human review: number rejection cannot establish truth of every non-numeric claim.

Future upgrades should keep the canonical schema and export interfaces. Introduce migrations when changing the schema, retain free data downloads, and require explicit consent before adding cloud sync or external parsers.
