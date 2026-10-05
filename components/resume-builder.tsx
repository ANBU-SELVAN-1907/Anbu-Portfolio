"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Download,
  Undo2,
  Redo2,
  Save,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  Sparkles,
  Upload,
  Eye,
  X,
  LoaderCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import {
  blankResume,
  newItem,
  resumeSchema,
  workspaceSchema,
  resumeBlocks,
  resumeText,
  importText,
  type ResumeDocument,
  type ResumeItem,
} from "@/lib/resume/model";
import ResumeDesign from "./resume-design";
import ResumeContentPreview from "./resume-content-preview";
import ResumePdfPreview from "./resume-pdf-preview";
import { analyzeResume } from "@/lib/resume/analyze";
import {
  exportPdf,
  exportDocx,
  filename,
  download,
  textExport,
} from "@/lib/resume/export";
import { readResumeFile, verifyPdf } from "@/lib/resume/import";
type Version = { id: string; created: string; resume: ResumeDocument };
type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
  resumeId: string;
  resumeTitle: string;
  resumeVersionId: string;
  note: string;
};
const key = "anbu-resume-studio-v1";
const headings = [
  "Experience",
  "Education",
  "Projects",
  "Certifications",
  "Awards",
  "Publications",
  "Languages",
  "Volunteer",
];
export default function ResumeBuilder() {
  const [r, setR] = useState<ResumeDocument>(blankResume),
    [docs, setDocs] = useState<ResumeDocument[]>([]),
    [versions, setVersions] = useState<Version[]>([]),
    [applications, setApplications] = useState<Application[]>([]),
    [active, setActive] = useState("Identity"),
    [ready, setReady] = useState(false),
    [storageBlocked, setStorageBlocked] = useState(false),
    [status, setStatus] = useState("Opening your local workspace…"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [historyCount, setHistoryCount] = useState(0),
    [exportOpen, setExportOpen] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [pdfUrl, setPdfUrl] = useState(""),
    [parseReport, setParseReport] = useState<{
      passed: boolean;
      text: string;
      pages: number;
    } | null>(null),
    [paste, setPaste] = useState(""),
    [copied, setCopied] = useState(false),
    [newHeading, setNewHeading] = useState("Awards"),
    [confirm, setConfirm] = useState<{ title: string; run: () => void } | null>(
      null,
    ),
    [aiConsent, setAiConsent] = useState(false),
    [tone, setTone] = useState<"concise" | "confident" | "executive">(
      "concise",
    ),
    [aiTask, setAiTask] = useState<"summary" | "cover-letter" | "interview">(
      "summary",
    ),
    [suggestion, setSuggestion] = useState<{
      text: string;
      questions: string[];
      apply: (text: string) => void;
    } | null>(null);
  const [undo, setUndo] = useState<ResumeDocument[]>([]);
  const [redo, setRedo] = useState<ResumeDocument[]>([]);
  const pdfRef = useRef("");
  const analysis = useMemo(() => analyzeResume(r), [r]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = workspaceSchema.parse(JSON.parse(raw));
          const valid = saved.documents;
          setDocs(valid);
          if (valid.length)
            setR(valid.find((x) => x.id === saved.active) || valid[0]);
          setVersions(saved.versions);
          setApplications(saved.applications);
        }
        setStatus("Drafts stay on this device.");
      } catch {
        setStorageBlocked(true);
        setStatus(
          "Local storage could not open. Download a JSON backup before leaving.",
        );
      }
      setReady(true);
    });
    return () => {
      disposed = true;
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    };
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    const timer = setTimeout(() => {
      try {
        const documents = [...docs.filter((d) => d.id !== r.id), r].slice(-10);
        localStorage.setItem(
          key,
          JSON.stringify({ documents, active: r.id, versions, applications }),
        );
        setStatus(
          "Saved on this device · " +
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        );
      } catch {
        setStatus("Could not autosave. Download a JSON backup now.");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [r, docs, versions, applications, ready, storageBlocked]);
  useEffect(() => {
    const updated = (e: StorageEvent) => {
      if (e.key === key) {
        setStorageBlocked(true);
        setStatus(
          "Another tab changed this workspace. Reload before continuing.",
        );
      }
    };
    addEventListener("storage", updated);
    return () => removeEventListener("storage", updated);
  }, []);
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );
  function change(next: ResumeDocument) {
    setUndo([...undo, r].slice(-40));
    setRedo([]);
    setHistoryCount((v) => v + 1);
    setR(next);
    setParseReport(null);
    setPdfUrl("");
    setReviewed(false);
  }
  function undoEdit() {
    const last = undo.at(-1);
    if (last) {
      setUndo(undo.slice(0, -1));
      setRedo([...redo, r]);
      setR(last);
      setHistoryCount((v) => v + 1);
      setParseReport(null);
      setPdfUrl("");
      setReviewed(false);
    }
  }
  function redoEdit() {
    const next = redo.at(-1);
    if (next) {
      setRedo(redo.slice(0, -1));
      setUndo([...undo, r]);
      setR(next);
      setHistoryCount((v) => v + 1);
      setParseReport(null);
      setPdfUrl("");
      setReviewed(false);
    }
  }
  function currentDocs() {
    return [...docs.filter((d) => d.id !== r.id), r];
  }
  function switchResume(next: ResumeDocument) {
    setDocs(currentDocs());
    setR(next);
    setUndo([]);
    setRedo([]);
    setActive("Identity");
    setPdfUrl("");
    setParseReport(null);
    setReviewed(false);
    setHistoryCount((v) => v + 1);
  }
  function version() {
    const versionId = crypto.randomUUID();
    setVersions((v) =>
      [
        {
          id: versionId,
          created: new Date().toISOString(),
          resume: structuredClone(r),
        },
        ...v,
      ].slice(0, 40),
    );
    setStatus("Version saved on this device.");
    return versionId;
  }
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  function validate() {
    const result = resumeSchema.safeParse(r);
    if (!result.success)
      throw Error(
        result.error.issues
          .map((x) => x.path.join(".") + ": " + x.message)
          .join("; "),
      );
    if (!r.basics.name.trim())
      throw Error("Add your full name before exporting.");
    return result.data;
  }
  async function createPdf() {
    const document = validate(),
      result = await exportPdf(document);
    const report = await verifyPdf(result.bytes, result.expectedText);
    setParseReport(report);
    if (!report.passed)
      throw Error(
        "Text verification failed. Review the plain-text view before exporting.",
      );
    if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    const url = URL.createObjectURL(
      new Blob([result.bytes as BlobPart], { type: "application/pdf" }),
    );
    pdfRef.current = url;
    setPdfUrl(url);
    return result;
  }
  async function exportFile(format: string) {
    await work(async () => {
      const document = validate();
      if (!reviewed)
        throw Error(
          "Confirm that you reviewed every claim before downloading.",
        );
      if (format === "pdf") {
        const result = await createPdf();
        download(
          new Blob([result.bytes as BlobPart], { type: "application/pdf" }),
          filename(document, "pdf"),
        );
      }
      if (format === "docx")
        download(await exportDocx(document), filename(document, "docx"));
      if (format === "txt")
        download(textExport(document), filename(document, "txt"));
      if (format === "json")
        download(
          new Blob([JSON.stringify(document, null, 2)], {
            type: "application/json",
          }),
          filename(document, "json"),
        );
      version();
    });
  }
  async function importFile(file: File) {
    await work(async () => {
      if (file.name.toLowerCase().endsWith(".json")) {
        if (file.size > 5 * 1024 * 1024)
          throw Error("JSON imports must be under 5 MB.");
        const data = JSON.parse(await file.text());
        if (data && Array.isArray(data.documents)) {
          const workspace = workspaceSchema.safeParse(data);
          if (!workspace.success)
            throw Error("This workspace backup is invalid.");
          setConfirm({
            title:
              "Restore this workspace backup? It replaces local resumes, versions, and applications.",
            run: () => {
              setDocs(workspace.data.documents);
              setVersions(workspace.data.versions);
              setApplications(workspace.data.applications);
              setR(
                workspace.data.documents.find(
                  (x) => x.id === workspace.data.active,
                ) ||
                  workspace.data.documents[0] ||
                  blankResume(),
              );
              setStorageBlocked(false);
              setActive("Identity");
            },
          });
          return;
        }
        const parsed = resumeSchema.safeParse(data);
        if (!parsed.success)
          throw Error("This JSON does not match the Resume Studio schema.");
        setConfirm({
          title: "Replace this draft with the imported resume?",
          run: () => change({ ...parsed.data, id: r.id }),
        });
      } else {
        const text = await readResumeFile(file);
        setPaste(text);
        setStatus("Text extracted locally. Review it below before importing.");
      }
    });
  }
  async function ai(
    task: "bullet" | "summary" | "cover-letter" | "interview",
    facts: string,
    apply: (text: string) => void,
  ) {
    await work(async () => {
      if (!aiConsent)
        throw Error("Enable consent before sending text to Google AI.");
      const res = await fetch("/api/resume-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          facts: facts.slice(0, 12000),
          jobDescription: r.jobDescription.slice(0, 12000),
          tone,
          consent: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        suggestion: string;
        questions: string[];
      };
      if (!res.ok) throw Error(data.error || "AI unavailable.");
      setSuggestion({
        text: data.suggestion,
        questions: data.questions,
        apply,
      });
    });
  }
  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    multi = false,
  ) => (
    <label className="resume-field" key={label}>
      <span>{label}</span>
      {multi ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={label.includes("bullet") ? 6 : 4}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
  function patchItem(
    sectionId: string,
    id: string,
    values: Partial<ResumeItem>,
  ) {
    change({
      ...r,
      sections: r.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((x) =>
                x.id === id ? { ...x, ...values } : x,
              ),
            }
          : s,
      ),
    });
  }
  const section = r.sections.find((s) => s.id === active);
  const nav = [
    "Identity",
    "Summary",
    "Skills",
    ...r.sections.map((s) => s.id),
    "Design",
    "Job match",
    "Text & parser",
    "Versions",
    "Applications",
    "Import",
    "Privacy",
  ];
  const label = (id: string) =>
    r.sections.find((s) => s.id === id)?.heading || id;
  return (
    <main className="resume-app" data-history={historyCount}>
      <a href="#resume-editor" className="skip">
        Skip to resume editor
      </a>
      <header className="resume-header">
        <a
          href="/resume-builder"
          className="resume-brand"
          aria-label="Resume Studio home"
        >
          <FileText size={24} />
          <span>Resume Studio</span>
        </a>
        <nav className="resume-header-actions" aria-label="Resume Studio links">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="resume-button resume-portfolio-link"
            aria-label="View portfolio (opens in a new tab)"
            title="View portfolio (opens in a new tab)"
          >
            <BriefcaseBusiness size={16} aria-hidden="true" />
            View portfolio
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <button
            className="resume-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  location.origin + "/resume-builder",
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setError(
                  "Copy the URL from your address bar to share this builder.",
                );
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Link copied" : "Share this tool"}
          </button>
        </nav>
      </header>
      <div className="resume-topbar" inert={busy}>
        <label className="resume-workspace-select">
          <span>Workspace</span>
          <select
            aria-label="Choose resume"
            value={r.id}
            onChange={(e) => {
              const next = currentDocs().find((x) => x.id === e.target.value);
              if (next) switchResume(next);
            }}
          >
            {currentDocs().map((d) => (
              <option key={d.id} value={d.id}>
                {d.title || "Untitled resume"}
              </option>
            ))}
          </select>
        </label>
        <button
          className="resume-icon"
          aria-label="Create a new resume"
          disabled={currentDocs().length >= 10}
          onClick={() => switchResume(blankResume())}
        >
          <Plus size={18} />
        </button>
        <button
          className="resume-icon"
          aria-label="Duplicate this resume"
          disabled={currentDocs().length >= 10}
          onClick={() =>
            switchResume({
              ...structuredClone(r),
              id: crypto.randomUUID(),
              title: r.title + " copy",
            })
          }
        >
          <Copy size={17} />
        </button>
        <span role="status" className="resume-save-status">
          {status}
        </span>
        <div className="resume-toolbar">
          <button
            className="resume-icon"
            aria-label="Undo"
            disabled={!undo.length}
            onClick={undoEdit}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="resume-icon"
            aria-label="Redo"
            disabled={!redo.length}
            onClick={redoEdit}
          >
            <Redo2 size={17} />
          </button>
          <button className="resume-button" onClick={version}>
            <Save size={16} />
            Save version
          </button>
          <button
            className="resume-button primary"
            disabled={busy}
            onClick={() => setExportOpen(true)}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
      <div className="resume-mobile-heading">
        <p>Free. No sign-up. Your draft stays on this device.</p>
        <button className="resume-button" onClick={() => setActive("Design")}>
          Templates and layout
        </button>
      </div>
      {storageBlocked && (
        <div className="resume-error" role="alert">
          <span>
            Autosave is paused to protect existing data. Reload to load another
            tab’s changes, or back up the saved data before resetting.
          </span>
          <button
            className="resume-button"
            onClick={() => {
              const raw = localStorage.getItem(key);
              if (raw)
                download(
                  new Blob([raw], { type: "application/json" }),
                  "Resume_Studio_Recovery.json",
                );
            }}
          >
            Back up saved data
          </button>
        </div>
      )}
      {busy && (
        <div className="resume-busy" role="status">
          <LoaderCircle className="spin" size={18} /> Working on your document…
        </div>
      )}
      {error && (
        <div className="resume-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}
      <div className="resume-workbench" inert={busy}>
        <aside className="resume-sidebar">
          <p className="resume-eyebrow">DOCUMENT SECTIONS</p>
          <nav aria-label="Resume sections">
            {nav.map((id, i) => (
              <button
                key={id}
                aria-current={active === id ? "page" : undefined}
                onClick={() => setActive(id)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {label(id)}
              </button>
            ))}
          </nav>
          <div className="resume-add-section">
            <label>
              Add section
              <select
                aria-label="New section heading"
                value={newHeading}
                onChange={(e) => setNewHeading(e.target.value)}
              >
                {headings.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <button
              className="resume-button"
              disabled={r.sections.length >= 12}
              onClick={() => {
                const id = crypto.randomUUID();
                change({
                  ...r,
                  sections: [
                    ...r.sections,
                    { id, heading: newHeading, visible: true, items: [] },
                  ],
                });
                setActive(id);
              }}
            >
              <Plus size={16} />
              Add section
            </button>
          </div>
          <p className="resume-private-note">
            <ShieldCheck size={17} />
            Editing and exports use your browser. AI is optional.
          </p>
        </aside>
        <section
          className="resume-editor"
          id="resume-editor"
          tabIndex={-1}
          aria-busy={busy}
        >
          <div className="resume-editor-heading">
            <p className="resume-eyebrow">
              {active === "Job match" ? "JOB DESCRIPTION" : "RESUME EDITOR"}
            </p>
            <h1>{label(active)}</h1>
          </div>
          {active === "Identity" && (
            <>
              <p className="resume-helper">
                Put contact details in the document body. A photo or graphic is
                never needed.
              </p>
              {field("Resume title", r.title, (v) =>
                change({ ...r, title: v }),
              )}
              {Object.entries(r.basics).map(([k, v]) =>
                field(
                  (
                    {
                      name: "Full name",
                      headline: "Target role / headline",
                      email: "Email",
                      phone: "Phone",
                      location: "City / country",
                      linkedin: "LinkedIn (HTTPS)",
                      website: "Portfolio / GitHub (HTTPS)",
                    } as Record<string, string>
                  )[k],
                  v,
                  (value) =>
                    change({ ...r, basics: { ...r.basics, [k]: value } }),
                ),
              )}
            </>
          )}
          {active === "Summary" && (
            <>
              {field("Section heading", r.presentation.summaryHeading, (v) =>
                change({
                  ...r,
                  presentation: {
                    ...r.presentation,
                    summaryHeading: v || "Summary",
                  },
                }),
              )}
              <label className="resume-consent">
                <input
                  type="checkbox"
                  checked={r.presentation.summaryVisible}
                  onChange={(e) =>
                    change({
                      ...r,
                      presentation: {
                        ...r.presentation,
                        summaryVisible: e.target.checked,
                      },
                    })
                  }
                />
                Include in exports
              </label>
              <p className="resume-helper">
                A few lines on your experience, strengths, and target role. Keep
                every claim factual.
              </p>
              {field(
                "Professional summary",
                r.summary,
                (v) => change({ ...r, summary: v }),
                true,
              )}
              <div className="resume-ai-box">
                <h3>Optional writing assistant</h3>
                <p>Suggestions are reviewed before they change your draft.</p>
                <label className="resume-consent">
                  <input
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(e) => setAiConsent(e.target.checked)}
                  />
                  Send my resume text and job description to Google AI.
                  Free-tier requests may be used to improve Google’s products.
                </label>
                <select
                  aria-label="AI writing tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                >
                  <option value="concise">Concise</option>
                  <option value="confident">Confident</option>
                  <option value="executive">Executive</option>
                </select>
                <select
                  aria-label="AI writing task"
                  value={aiTask}
                  onChange={(e) => setAiTask(e.target.value as typeof aiTask)}
                >
                  <option value="summary">Summary</option>
                  <option value="cover-letter">Cover letter</option>
                  <option value="interview">Interview questions</option>
                </select>
                <button
                  className="resume-button"
                  disabled={busy || !aiConsent}
                  onClick={() =>
                    ai(aiTask, resumeText(r), (text) => {
                      if (aiTask === "summary") change({ ...r, summary: text });
                      else
                        download(
                          new Blob([text], { type: "text/plain" }),
                          aiTask + ".txt",
                        );
                    })
                  }
                >
                  <Sparkles size={16} />
                  Generate suggestion
                </button>
              </div>
            </>
          )}
          {active === "Skills" && (
            <>
              {field("Section heading", r.presentation.skillsHeading, (v) =>
                change({
                  ...r,
                  presentation: {
                    ...r.presentation,
                    skillsHeading: v || "Skills",
                  },
                }),
              )}
              <label className="resume-consent">
                <input
                  type="checkbox"
                  checked={r.presentation.skillsVisible}
                  onChange={(e) =>
                    change({
                      ...r,
                      presentation: {
                        ...r.presentation,
                        skillsVisible: e.target.checked,
                      },
                    })
                  }
                />
                Include in exports
              </label>
              <p className="resume-helper">
                Use plain skill names. Include only skills you can explain or
                demonstrate.
              </p>
              {field(
                "Skills (comma-separated)",
                r.skills,
                (v) => change({ ...r, skills: v }),
                true,
              )}
            </>
          )}
          {section && (
            <>
              <div className="resume-section-tools">
                <label>
                  <input
                    type="checkbox"
                    checked={section.visible}
                    onChange={(e) =>
                      change({
                        ...r,
                        sections: r.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, visible: e.target.checked }
                            : s,
                        ),
                      })
                    }
                  />
                  Include in exports
                </label>
                {[-1, 1].map((direction) => (
                  <button
                    key={direction}
                    className="resume-icon"
                    aria-label={`Move section ${direction === -1 ? "up" : "down"}`}
                    disabled={
                      resumeBlocks(r).findIndex((b) => b.id === section.id) +
                        direction <
                        0 ||
                      resumeBlocks(r).findIndex((b) => b.id === section.id) +
                        direction >=
                        resumeBlocks(r).length
                    }
                    onClick={() => {
                      const order = resumeBlocks(r).map((b) => b.id),
                        at = order.indexOf(section.id);
                      [order[at], order[at + direction]] = [
                        order[at + direction],
                        order[at],
                      ];
                      change({ ...r, sectionOrder: order });
                    }}
                  >
                    {direction === -1 ? (
                      <ArrowUp size={16} />
                    ) : (
                      <ArrowDown size={16} />
                    )}
                  </button>
                ))}
                <button
                  className="resume-icon"
                  aria-label="Delete section"
                  onClick={() =>
                    setConfirm({
                      title: `Remove ${section.heading} and its entries?`,
                      run: () => {
                        change({
                          ...r,
                          sections: r.sections.filter(
                            (s) => s.id !== section.id,
                          ),
                        });
                        setActive("Identity");
                      },
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="resume-helper">
                Keep entries newest first. Dates: Jan 2026 or 2026-01. Bullets:
                one line per statement.
              </p>
              {field("Section heading", section.heading, (v) =>
                change({
                  ...r,
                  sections: r.sections.map((s) =>
                    s.id === section.id ? { ...s, heading: v } : s,
                  ),
                }),
              )}
              {section.items.map((item, i) => (
                <article key={item.id} className="resume-entry">
                  <div className="resume-entry-header">
                    <h3>
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {item.title || "New entry"}
                    </h3>
                    <div>
                      {[-1, 1].map((direction) => (
                        <button
                          className="resume-icon"
                          key={direction}
                          aria-label={`Move entry ${direction === -1 ? "up" : "down"}`}
                          disabled={
                            i + direction < 0 ||
                            i + direction >= section.items.length
                          }
                          onClick={() => {
                            const items = [...section.items];
                            [items[i], items[i + direction]] = [
                              items[i + direction],
                              items[i],
                            ];
                            change({
                              ...r,
                              sections: r.sections.map((s) =>
                                s.id === section.id ? { ...s, items } : s,
                              ),
                            });
                          }}
                        >
                          {direction === -1 ? (
                            <ArrowUp size={15} />
                          ) : (
                            <ArrowDown size={15} />
                          )}
                        </button>
                      ))}
                      <button
                        className="resume-icon"
                        aria-label="Delete resume entry"
                        onClick={() =>
                          setConfirm({
                            title: "Remove this entry?",
                            run: () =>
                              change({
                                ...r,
                                sections: r.sections.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        items: s.items.filter(
                                          (x) => x.id !== item.id,
                                        ),
                                      }
                                    : s,
                                ),
                              }),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {field(
                    "Role / degree / project / credential",
                    item.title,
                    (v) => patchItem(section.id, item.id, { title: v }),
                  )}
                  {field("Organization / institution", item.organisation, (v) =>
                    patchItem(section.id, item.id, { organisation: v }),
                  )}
                  {field("Location", item.location, (v) =>
                    patchItem(section.id, item.id, { location: v }),
                  )}
                  <div className="resume-date-row">
                    {field("Start date", item.start, (v) =>
                      patchItem(section.id, item.id, { start: v }),
                    )}
                    {!item.current &&
                      field("End date", item.end, (v) =>
                        patchItem(section.id, item.id, { end: v }),
                      )}
                  </div>
                  <label className="resume-consent">
                    <input
                      type="checkbox"
                      checked={item.current}
                      onChange={(e) =>
                        patchItem(section.id, item.id, {
                          current: e.target.checked,
                        })
                      }
                    />
                    Current role / ongoing
                  </label>
                  {field(
                    "Achievement bullets (one per line)",
                    item.bullets.join("\n"),
                    (v) =>
                      patchItem(section.id, item.id, {
                        bullets: v.split("\n").slice(0, 30),
                      }),
                    true,
                  )}
                  {field("Supporting link (HTTPS)", item.link, (v) =>
                    patchItem(section.id, item.id, { link: v }),
                  )}
                  {item.bullets.some(Boolean) && (
                    <button
                      className="resume-button"
                      disabled={busy || !aiConsent}
                      onClick={() =>
                        ai(
                          "bullet",
                          item.bullets.filter(Boolean).join("\n"),
                          (text) =>
                            patchItem(section.id, item.id, {
                              bullets: text
                                .split("\n")
                                .map((x) => x.replace(/^[-•]\s*/, ""))
                                .filter(Boolean),
                            }),
                        )
                      }
                    >
                      <Sparkles size={15} />
                      Review a bullet rewrite
                    </button>
                  )}
                </article>
              ))}
              <button
                className="resume-button primary"
                disabled={section.items.length >= 40}
                onClick={() =>
                  change({
                    ...r,
                    sections: r.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, items: [...s.items, newItem()] }
                        : s,
                    ),
                  })
                }
              >
                <Plus size={16} />
                Add {section.heading.toLowerCase()} entry
              </button>
            </>
          )}
          {active === "Design" && (
            <>
              <ResumeDesign resume={r} onChange={change} />
              <button
                className="resume-button"
                disabled={busy}
                onClick={() =>
                  work(async () => {
                    await createPdf();
                  })
                }
              >
                <Eye size={16} />
                Generate exact paginated preview
              </button>
            </>
          )}
          {active === "Job match" && (
            <>
              <p className="resume-helper">
                Paste the job description. The report finds common skills and
                repeated terms. Missing keywords are suggestions to review—not
                facts to add.
              </p>
              {field(
                "Job description",
                r.jobDescription,
                (v) => change({ ...r, jobDescription: v }),
                true,
              )}
              <div className="resume-keywords">
                {analysis.keywords.length ? (
                  analysis.keywords.map((k) => (
                    <span key={k.term} data-match={k.matched}>
                      {k.matched ? "✓ " : "+ "}
                      {k.term}
                    </span>
                  ))
                ) : (
                  <p>No keywords yet. Add a job description to compare.</p>
                )}
              </div>
              <p className="resume-helper">
                This is lexical matching with a small curated synonym list, not
                semantic ranking by an employer’s ATS.
              </p>
            </>
          )}
          {active === "Text & parser" && (
            <>
              <p className="resume-helper">
                This is the linear text generated from your data. Verify the
                actual PDF to compare its extracted text in reading order.
              </p>
              <button
                className="resume-button"
                disabled={busy}
                onClick={() =>
                  work(async () => {
                    await createPdf();
                  })
                }
              >
                <ShieldCheck size={16} />
                Verify PDF text round-trip
              </button>
              {parseReport && (
                <div className="resume-verification" role="status">
                  <strong>
                    {parseReport.passed
                      ? "Text round-trip passed"
                      : "Text mismatch detected"}
                  </strong>
                  <span>
                    {parseReport.pages} page(s). This check compares extracted
                    text with the expected export. It is not certification by
                    any commercial ATS.
                  </span>
                </div>
              )}
              <pre className="resume-text-view">
                {parseReport?.text ||
                  analysis.plainText ||
                  "Enter your details to see the text."}
              </pre>
              <dl className="resume-parse-fields">
                {Object.entries(r.basics).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {active === "Versions" && (
            <>
              <p className="resume-helper">
                Save a snapshot before tailoring a resume. Up to 40 versions
                stay on this device.
              </p>
              <button className="resume-button" onClick={version}>
                <Save size={16} />
                Save current version
              </button>
              {versions
                .filter((v) => v.resume.id === r.id)
                .map((v) => (
                  <article className="resume-version" key={v.id}>
                    <strong>{v.resume.title}</strong>
                    <time>{new Date(v.created).toLocaleString()}</time>
                    <button
                      className="resume-button"
                      onClick={() =>
                        setConfirm({
                          title:
                            "Restore this version? Your current draft will be saved as a version first.",
                          run: () => {
                            version();
                            change(structuredClone(v.resume));
                          },
                        })
                      }
                    >
                      Restore
                    </button>
                    <button
                      className="resume-icon"
                      aria-label="Delete saved version"
                      onClick={() =>
                        setConfirm({
                          title: "Delete this local version?",
                          run: () =>
                            setVersions((xs) =>
                              xs.filter((x) => x.id !== v.id),
                            ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
            </>
          )}
          {active === "Applications" && (
            <>
              <p className="resume-helper">
                Track jobs locally. Save a resume snapshot before recording an
                application.
              </p>
              <button
                className="resume-button"
                disabled={applications.length >= 100}
                onClick={() => {
                  const resumeVersionId = version();
                  setApplications((xs) => [
                    {
                      id: crypto.randomUUID(),
                      company: "",
                      role: "",
                      status: "Saved",
                      resumeId: r.id,
                      resumeTitle: r.title,
                      resumeVersionId,
                      note: "",
                    },
                    ...xs,
                  ]);
                }}
              >
                <Plus size={16} />
                Track an application
              </button>
              {applications.map((job) => (
                <article className="resume-entry" key={job.id}>
                  {field("Company", job.company, (v) =>
                    setApplications((xs) =>
                      xs.map((x) =>
                        x.id === job.id ? { ...x, company: v } : x,
                      ),
                    ),
                  )}
                  {field("Role", job.role, (v) =>
                    setApplications((xs) =>
                      xs.map((x) => (x.id === job.id ? { ...x, role: v } : x)),
                    ),
                  )}
                  <label className="resume-field">
                    Status
                    <select
                      value={job.status}
                      onChange={(e) =>
                        setApplications((xs) =>
                          xs.map((x) =>
                            x.id === job.id
                              ? { ...x, status: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      {[
                        "Saved",
                        "Applied",
                        "Interview",
                        "Offer",
                        "Rejected",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <p className="resume-helper">Resume: {job.resumeTitle}</p>
                  {field(
                    "Notes",
                    job.note,
                    (v) =>
                      setApplications((xs) =>
                        xs.map((x) =>
                          x.id === job.id ? { ...x, note: v } : x,
                        ),
                      ),
                    true,
                  )}
                  <button
                    className="resume-button"
                    onClick={() =>
                      setConfirm({
                        title: "Remove this application from the tracker?",
                        run: () =>
                          setApplications((xs) =>
                            xs.filter((x) => x.id !== job.id),
                          ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </article>
              ))}
            </>
          )}
          {active === "Import" && (
            <>
              <p className="resume-helper">
                Files are read locally. PDF/DOCX/TXT imports extract text for
                your review; they do not reliably infer every field. JSON
                backups preserve the complete structure.
              </p>
              <label className="resume-upload">
                <Upload size={22} />
                <span>Choose PDF, DOCX, TXT, or Resume Studio JSON</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.json"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {field("Review extracted or pasted text", paste, setPaste, true)}
              <button
                className="resume-button"
                disabled={!paste.trim()}
                onClick={() =>
                  setConfirm({
                    title:
                      "Create a draft from this text? Contact details will be detected; review and move the remaining text into sections.",
                    run: () =>
                      change({
                        ...importText(paste),
                        id: r.id,
                        title: r.title,
                      }),
                  })
                }
              >
                Import reviewed text
              </button>
            </>
          )}
          {active === "Privacy" && (
            <>
              <div className="resume-privacy-card">
                <ShieldCheck size={35} />
                <h2>You own this draft.</h2>
                <p>
                  Editing, imports, scores, and exports happen in your browser.
                  Drafts and versions are stored in this browser’s local
                  storage. Other people using this browser profile can access
                  them.
                </p>
                <p>
                  AI is optional and sends only the text used for the requested
                  action to Google after consent. We do not store those
                  requests. Shared builder links contain no resume data.
                </p>
                <p>
                  Download a JSON backup to move a resume between devices.
                  Clearing browser storage removes drafts.
                </p>
              </div>
              <button
                className="resume-button"
                onClick={() =>
                  download(
                    new Blob(
                      [
                        JSON.stringify(
                          { documents: currentDocs(), versions, applications },
                          null,
                          2,
                        ),
                      ],
                      { type: "application/json" },
                    ),
                    "Resume_Studio_Workspace_Backup.json",
                  )
                }
              >
                Export all local data
              </button>
              <button
                className="resume-button danger"
                onClick={() =>
                  setConfirm({
                    title:
                      "Erase all drafts, versions, and applications from this browser? Download a backup first.",
                    run: () => {
                      localStorage.removeItem(key);
                      setStorageBlocked(false);
                      setDocs([]);
                      setVersions([]);
                      setApplications([]);
                      setR(blankResume());
                      setUndo([]);
                      setRedo([]);
                      setStatus("Local data erased. A blank draft is ready.");
                    },
                  })
                }
              >
                Delete all local data
              </button>
              <button
                className="resume-button"
                onClick={() =>
                  setConfirm({
                    title: "Delete this resume from the workspace?",
                    run: () => {
                      const next = currentDocs().filter((d) => d.id !== r.id);
                      setDocs(next);
                      setVersions((xs) =>
                        xs.filter((v) => v.resume.id !== r.id),
                      );
                      setR(next[0] || blankResume());
                    },
                  })
                }
              >
                Delete current resume
              </button>
            </>
          )}
        </section>
        <aside className="resume-preview-panel">
          <div className="resume-score">
            <div>
              <span>WRITING READINESS</span>
              <strong>
                {analysis.score}
                <small>/100</small>
              </strong>
            </div>
            <p>
              {r.jobDescription
                ? "Includes JD keywords"
                : "Add a JD for keyword analysis"}
            </p>
          </div>
          <details className="resume-analysis">
            <summary>Score breakdown & improvements</summary>
            {analysis.breakdown.map((b) => (
              <div className="resume-score-row" key={b.label}>
                <span>{b.label}</span>
                <strong>
                  {b.value}/{b.max}
                </strong>
              </div>
            ))}
            <p>{analysis.disclaimer}</p>
            {analysis.issues.map((issue, i) => (
              <button
                key={i}
                onClick={() =>
                  setActive(
                    r.sections.find((s) => s.heading === issue.fix)?.id ||
                      issue.fix,
                  )
                }
              >
                {issue.message}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </details>
          <div className="resume-preview-title">
            <span>LIVE CONTENT PREVIEW</span>
            <button
              aria-label="Clear exact PDF preview"
              className="resume-icon"
              onClick={() => {
                setPdfUrl("");
                if (pdfRef.current) {
                  URL.revokeObjectURL(pdfRef.current);
                  pdfRef.current = "";
                }
              }}
            >
              {pdfUrl ? <X size={16} /> : <FileText size={16} />}
            </button>
          </div>
          {pdfUrl ? (
            <ResumePdfPreview url={pdfUrl} />
          ) : (
            <ResumeContentPreview resume={r} />
          )}
          <p className="resume-preview-caption">
            {analysis.words} words · {r.pageSize} · One column. Generate the PDF
            preview to see exact page breaks.
          </p>
        </aside>
      </div>
      <footer className="resume-footer">
        <span>Resume Studio · Your drafts, your words.</span>
        <button className="resume-button" onClick={() => setActive("Privacy")}>
          Privacy and backups
        </button>
      </footer>
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="resume-dialog">
          <DialogTitle>Export your resume</DialogTitle>
          <DialogDescription>
            PDF, editable Word, plain text, or a portable JSON backup. Downloads
            are always free.
          </DialogDescription>
          <label className="resume-consent">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the dates, skills, metrics, and claims. They reflect my
            real experience.
          </label>
          <div className="resume-export-options">
            {["pdf", "docx", "txt", "json"].map((format) => (
              <button
                key={format}
                className="resume-button"
                disabled={busy || !reviewed}
                onClick={() => exportFile(format)}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Download size={17} />
                )}
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>
          {parseReport && (
            <p role="status">
              {parseReport.passed
                ? "PDF text round-trip passed."
                : "PDF text check failed."}{" "}
              {parseReport.pages} page(s).
            </p>
          )}
          <p>
            PDF exports contain embedded fonts and tagged, selectable text. The
            check verifies extraction; it does not guarantee compatibility with
            every ATS.
          </p>
          {error && (
            <p className="resume-error" role="alert">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!suggestion}
        onOpenChange={(v) => {
          if (!v) setSuggestion(null);
        }}
      >
        <DialogContent className="resume-dialog">
          <DialogTitle>Review the suggestion.</DialogTitle>
          <DialogDescription>
            AI can make mistakes. Check each claim before accepting.
          </DialogDescription>
          <pre className="resume-text-view">{suggestion?.text}</pre>
          {suggestion?.questions.map((q, i) => (
            <p key={i}>{q}</p>
          ))}
          <div className="resume-export-options">
            <button
              className="resume-button"
              onClick={() => setSuggestion(null)}
            >
              Reject
            </button>
            <button
              className="resume-button primary"
              onClick={() => {
                suggestion?.apply(suggestion.text);
                setSuggestion(null);
              }}
            >
              Accept reviewed suggestion
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent className="resume-dialog">
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            You control this change. Cancel to keep the current draft.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.run();
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
