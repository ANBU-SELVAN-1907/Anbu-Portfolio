"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "sonner";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Save,
  ArrowUpRight,
  Check,
  LayoutDashboard,
  User,
  Layers,
  Cpu,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Settings,
  History,
  Folder,
  Quote,
  Award,
  Eye,
  Upload,
} from "lucide-react";
import { entry, type Content } from "@/lib/content";
import { contentSchema } from "@/lib/validation";
import {
  normalizeContent,
  themePresets,
  newEditorialContent,
} from "@/lib/editorial";
type Collection =
  | "projects"
  | "skills"
  | "experience"
  | "education"
  | "testimonials"
  | "certifications"
  | "faq"
  | "gallery"
  | "customSections";
type Media = {
  id: string;
  name: string;
  type: string;
  size: number;
  created: string;
};
type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  created: string;
  read: number;
};
type State = {
  draft: Content;
  published: Content;
  revision: number;
  updated: string;
  media: Media[];
  messages: Message[];
  history: { id: string; created: string }[];
  analytics: {
    day: string;
    views: number;
    contacts: number;
    resumes: number;
    attempts: number;
  }[];
  sources: { source: string; views: number }[];
};
const groups = [
  ["overview", "Overview", LayoutDashboard],
  ["profile", "Profile & hero", User],
  ["projects", "Projects", Layers],
  ["skills", "Skills", Cpu],
  ["experience", "Experience", Briefcase],
  ["education", "Education", GraduationCap],
  ["testimonials", "Testimonials", Quote],
  ["certifications", "Certifications", Award],
  ["faq", "Frequently asked questions", MessageSquare],
  ["gallery", "Achievements gallery", Award],
  ["customSections", "Custom chapters", Layers],
  ["media", "Media library", Folder],
  ["inbox", "Contact inbox", MessageSquare],
  ["history", "Version history", History],
  ["settings", "Site settings", Settings],
] as const;
const labels: Record<string, string> = {
  name: "Full name",
  surname: "Name suffix",
  role: "Professional title",
  eyebrow: "Hero eyebrow",
  headline: "Hero headline",
  intro: "Value proposition",
  bio: "About you",
  journey: "Your journey",
  personality: "What drives you",
  email: "Contact email",
  phone: "Phone",
  location: "Location",
  timezone: "Timezone",
  linkedin: "LinkedIn URL",
  github: "GitHub URL",
  photo: "Profile photo",
  resume: "Resume PDF",
  availability: "Contact invitation",
  contactTitle: "Contact headline",
  contactText: "Contact introduction",
  seoTitle: "Search engine title",
  seoDescription: "Search engine description",
  accent: "Accent color",
  motion: "Animated effects",
  analytics: "Aggregate visitor analytics",
  footer: "Footer line",
  workTitle: "Projects heading",
  aboutTitle: "About heading",
  skillsTitle: "Skills heading",
  experienceTitle: "Journey heading",
  title: "Title / name",
  subtitle: "Subtitle / role",
  period: "Dates / period",
  description: "Description / quote",
  tags: "Technologies / skills (comma-separated)",
  problem: "Problem & context",
  process: "Your role & process",
  outcome: "Outcome / impact",
  image: "Image",
  link: "Live demo / credential URL",
  code: "Source code URL",
};
Object.assign(labels, {
  paperColor: "Paper background color",
  inkColor: "Primary text color",
  oliveColor: "About section color",
  journeyColor: "Journey section color",
  labColor: "Projects and contact background",
  heroStamp: "Portrait stamp (one line per word)",
  labLabel: "Work chapter label",
  aboutLabel: "About chapter label",
  toolkitLabel: "Skills chapter label",
  journeyLabel: "Journey chapter label",
  credentialLabel: "Credentials chapter label",
  contactLabel: "Contact chapter label",
  heroNote: "Hero footnote",
  labNote: "Project section introduction",
  aboutNote: "About chapter note",
  credentialTitle: "Credentials heading",
  credentialNote: "Credentials introduction",
  faqTitle: "FAQ heading",
  chatbot: "Enable AI guide",
  chatTitle: "AI guide title",
  chatIntro: "AI guide introduction",
  lastUpdated: "Last updated (YYYY-MM-DD)",
  defaultTheme: "Default theme (light or dark)",
  privacyNotice: "Privacy preferences banner",
  visualTheme: "Visual theme (editorial, noir, aurora)",
  liveBackground: "Live background",
  builder: "Show resume builder app",
  galleryTitle: "Gallery headline",
  galleryNote: "Gallery introduction",
});
const collectionFields: Record<Collection, string[]> = {
  projects: [
    "title",
    "subtitle",
    "period",
    "description",
    "tags",
    "problem",
    "process",
    "outcome",
    "image",
    "link",
    "code",
  ],
  skills: ["title", "description", "tags"],
  experience: ["title", "subtitle", "period", "description", "tags", "link"],
  education: ["title", "subtitle", "period", "description", "tags", "link"],
  testimonials: ["title", "subtitle", "description"],
  certifications: [
    "title",
    "subtitle",
    "period",
    "description",
    "tags",
    "link",
  ],
  faq: ["title", "description"],
  gallery: [
    "title",
    "subtitle",
    "period",
    "description",
    "tags",
    "image",
    "link",
  ],
  customSections: ["title", "subtitle", "description", "image", "link", "tags"],
};
const longFields = [
  "headline",
  "intro",
  "bio",
  "journey",
  "personality",
  "contactText",
  "description",
  "problem",
  "process",
  "outcome",
  "seoDescription",
  "contactTitle",
  "aboutTitle",
  "heroStamp",
  "heroNote",
  "aboutNote",
  "chatIntro",
  "credentialNote",
];
export default function Studio({ email }: { email: string }) {
  const [data, setData] = useState<State | null>(null),
    [draft, setDraft] = useState<Content | null>(null),
    [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      run: () => void;
    } | null>(null),
    [picker, setPicker] = useState<((url: string) => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  async function load() {
    try {
      const r = await fetch("/api/admin");
      const b = (await r.json()) as State & {
        error: string;
        revision: number;
        updated: string;
        url: string;
      };
      if (!r.ok) throw Error(b.error);
      setData(b);
      setDraft(b.draft);
      revision.current = b.revision;
      setDirty(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin")
      .then(async (r) => {
        const b = (await r.json()) as State & { error: string };
        if (!r.ok) throw Error(b.error);
        return b;
      })
      .then((b) => {
        if (active) {
          setData(b);
          setDraft(b.draft);
          revision.current = b.revision;
          setDirty(false);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function api(body: unknown) {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const b = (await r.json()) as State & {
      error: string;
      revision: number;
      updated: string;
      url: string;
    };
    if (!r.ok) throw Error(b.error || "Unable to save.");
    return b;
  }
  async function save() {
    if (!draft) throw Error("Content not loaded");
    const b = await api({
      action: "save",
      content: draft,
      revision: revision.current,
    });
    revision.current = b.revision;
    setDirty(false);
    setData((d) =>
      d ? { ...d, updated: b.updated, draft, revision: b.revision } : d,
    );
    return b;
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function change(next: Content) {
    setDraft(next);
    setDirty(true);
  }
  function exportContent() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "portfolio-draft-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importContent(file: File) {
    if (file.size > 250000)
      throw Error("Portfolio backups must be under 250 KB.");
    const content = normalizeContent(JSON.parse(await file.text()));
    const result = contentSchema.safeParse(content);
    if (!result.success)
      throw Error(
        "This backup does not match the portfolio format: " +
          result.error.issues[0]?.message,
      );
    setConfirm({
      title: "Replace the current draft?",
      description:
        "This imports the backup into your draft. Review its content and media links before saving or publishing. Published content stays available.",
      run: () => {
        change(result.data);
        toast.success("Backup loaded into draft. Review before publishing.");
      },
    });
  }
  async function publish() {
    if (dirty) await save();
    const b = await api({ action: "publish", revision: revision.current });
    revision.current = b.revision;
    await load();
    toast.success("Portfolio published. Your changes are live.");
  }
  async function upload(file: File) {
    if (file.size > 524288)
      throw Error(
        "Keep uploads under 512 KB for free Firebase storage. Compress the image or PDF first.",
      );
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/media", { method: "POST", body: form });
    const b = (await r.json()) as State & {
      error: string;
      revision: number;
      updated: string;
      url: string;
    };
    if (!r.ok) throw Error(b.error);
    const fresh = (await fetch("/api/admin").then((r) => r.json())) as State;
    setData((d) => (d ? { ...d, media: fresh.media } : d));
    toast.success("File uploaded");
    return b.url;
  }
  function field(key: string, value: string, onChange: (v: string) => void) {
    const file = ["photo", "image", "resume"].includes(key);
    return (
      <label
        className={longFields.includes(key) ? "field wide" : "field"}
        key={key}
      >
        <span>{labels[key] || key}</span>
        {longFields.includes(key) ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={key === "bio" ? 5 : 3}
          />
        ) : (
          <Input
            value={value}
            type={
              key === "accent" || key.endsWith("Color")
                ? "color"
                : key === "lastUpdated"
                  ? "date"
                  : key === "email"
                    ? "email"
                    : "text"
            }
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {file && (
          <div className="field-tools">
            <button type="button" onClick={() => setPicker(() => onChange)}>
              Choose uploaded file
            </button>
            {key === "resume" && (
              <button type="button" onClick={() => onChange("/api/resume")}>
                Use auto-generated PDF
              </button>
            )}
          </div>
        )}
        {key === "resume" && (
          <small>
            The automatic PDF always uses your latest published content. A
            custom PDF must be updated manually.
          </small>
        )}
        {["headline", "contactTitle"].includes(key) && (
          <small>Use a new line for a deliberate line break.</small>
        )}
      </label>
    );
  }
  const collection = (name: Collection) =>
    draft && (
      <>
        <div className="editor-intro">
          <p>
            Add, edit, reorder, or hide entries. Changes stay in your draft
            until you publish.
          </p>
          <button
            className="button primary"
            onClick={() =>
              change({
                ...draft,
                [name]: [
                  ...(draft[name] ?? []),
                  entry({ title: "New " + name.replace(/s$/, "") }),
                ],
              })
            }
          >
            <Plus size={16} />
            Add entry
          </button>
        </div>
        {(draft[name] ?? []).length === 0 && (
          <div className="empty-state">
            No entries yet. Add your first one when you&apos;re ready.
          </div>
        )}
        {(draft[name] ?? []).map((x, i) => (
          <article className="entry-editor" key={x.id}>
            <div className="entry-header">
              <h3>
                {String(i + 1).padStart(2, "0")} / {x.title || "Untitled"}
              </h3>
              <div>
                <label className="switch-label">
                  <Switch
                    checked={x.visible}
                    onCheckedChange={(v) =>
                      change({
                        ...draft,
                        [name]: (draft[name] ?? []).map((a) =>
                          a.id === x.id ? { ...a, visible: v } : a,
                        ),
                      })
                    }
                  />
                  Visible
                </label>
                <button
                  aria-label="Move entry up"
                  disabled={i === 0}
                  onClick={() => {
                    const items = [...(draft[name] ?? [])];
                    [items[i - 1], items[i]] = [items[i], items[i - 1]];
                    change({ ...draft, [name]: items });
                  }}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  aria-label="Move entry down"
                  disabled={i === (draft[name] ?? []).length - 1}
                  onClick={() => {
                    const items = [...(draft[name] ?? [])];
                    [items[i + 1], items[i]] = [items[i], items[i + 1]];
                    change({ ...draft, [name]: items });
                  }}
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  aria-label="Delete entry"
                  onClick={() =>
                    setConfirm({
                      title: "Remove this entry?",
                      description:
                        "This removes the entry from your draft. The live portfolio stays unchanged until you publish.",
                      run: () =>
                        change({
                          ...draft,
                          [name]: (draft[name] ?? []).filter(
                            (a) => a.id !== x.id,
                          ),
                        }),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <div className="fields">
              {Object.entries(x)
                .filter(([k]) => collectionFields[name].includes(k))
                .map(([k, v]) =>
                  field(k, String(v), (value) =>
                    change({
                      ...draft,
                      [name]: (draft[name] ?? []).map((a) =>
                        a.id === x.id ? { ...a, [k]: value } : a,
                      ),
                    }),
                  ),
                )}
            </div>
          </article>
        ))}
      </>
    );
  useEffect(() => {
    const mc = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            definition: {
              name: string;
              description: string;
              inputSchema: Record<string, unknown>;
              annotations: { readOnlyHint: boolean };
              execute: (input: { section: string }) => {
                section: string;
                status: string;
              };
            },
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!mc?.registerTool) return;
    const abort = new AbortController();
    try {
      Promise.resolve(
        mc.registerTool(
          {
            name: "open_portfolio_editor",
            description:
              "Open a content category in the portfolio studio. Does not save or publish changes.",
            inputSchema: {
              type: "object",
              properties: {
                section: { type: "string", enum: groups.map((g) => g[0]) },
              },
              required: ["section"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input: { section: string }) {
              if (!groups.some((g) => g[0] === input.section))
                throw Error("Unknown studio section");
              setTab(input.section);
              return { section: input.section, status: "editor opened" };
            },
          },
          { signal: abort.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => abort.abort();
  }, []);
  if (!data || !draft)
    return (
      <main className="error-page">
        <p>{error || "Opening your studio…"}</p>
        {error && (
          <button className="button" onClick={load}>
            Try again
          </button>
        )}
      </main>
    );
  const total = (key: "views" | "contacts" | "resumes" | "attempts") =>
    data.analytics.reduce((n, d) => n + d[key], 0);
  return (
    <div className="studio">
      <Toaster theme="light" richColors />
      <Tabs value={tab} onValueChange={setTab} className="studio-layout">
        <aside className="studio-sidebar">
          <Link className="brand" href="/">
            anbu<span> / T</span>
          </Link>
          <p className="eyebrow">CONTENT STUDIO</p>
          <TabsList className="studio-nav">
            {groups.map(([id, title, Icon]) => (
              <TabsTrigger key={id} value={id}>
                <Icon size={17} />
                <span className="studio-tab-label">{title}</span>
                {id === "inbox" && data.messages.some((m) => !m.read) && (
                  <span className="inbox-dot" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="studio-account">
            <span>{email}</span>
            <a href="/signout-with-chatgpt?return_to=/admin">Sign out ↗</a>
          </div>
        </aside>
        <div className="studio-main">
          <header className="studio-header">
            <div>
              <p className="eyebrow">YOUR SPACE TO BUILD</p>
              <h1>{groups.find((g) => g[0] === tab)?.[1]}</h1>
            </div>
            <div className="studio-actions">
              <span>
                {dirty
                  ? "Unsaved changes"
                  : data.updated
                    ? "Draft saved"
                    : "Ready to edit"}
              </span>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await save();
                    toast.success("Draft saved");
                  })
                }
              >
                <Save size={15} />
                Save draft
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Publish your portfolio?",
                    description:
                      "Your saved draft and any current edits will replace the content visitors see.",
                    run: () => act(publish),
                  })
                }
              >
                Publish <ArrowUpRight size={16} />
              </button>
            </div>
          </header>
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          <div className="studio-body" inert={busy}>
            <TabsContent value="overview">
              <div className="welcome-panel">
                <p className="eyebrow">THE NEXT CHAPTER STARTS HERE</p>
                <h2>
                  Your work.
                  <br />
                  <span className="accent">Always evolving.</span>
                </h2>
                <p>
                  Everything you need to keep your portfolio current, in one
                  place.
                </p>
                <div className="actions">
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        if (dirty) await save();
                        window.location.assign("/admin/preview");
                      })
                    }
                  >
                    <Eye size={16} />
                    Preview draft
                  </button>
                  <a
                    className="text-button"
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View live portfolio ↗
                  </a>
                </div>
              </div>
              <div className="studio-card">
                <h3>Content backups</h3>
                <p>
                  Keep an offline copy of your draft or restore a content kit.
                  Imports remain drafts until you publish. Media files are
                  backed up separately.
                </p>
                <input
                  hidden
                  type="file"
                  accept=".json,application/json"
                  ref={backupRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) act(() => importContent(file));
                  }}
                />
                <div className="actions">
                  <button className="button" onClick={exportContent}>
                    Export draft JSON
                  </button>
                  <button
                    className="button"
                    onClick={() => backupRef.current?.click()}
                  >
                    Import content backup
                  </button>
                </div>
              </div>
              <div className="stat-grid">
                {[
                  [
                    "Published projects",
                    data.published.projects.filter((x) => x.visible).length,
                  ],
                  ["Page views · last 30 days", total("views")],
                  ["Resume downloads · 30 days", total("resumes")],
                  [
                    "Unread messages",
                    data.messages.filter((m) => !m.read).length,
                  ],
                ].map(([l, n]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <div className="analytics-extra">
                <div className="studio-card">
                  <h3>Contact form delivery</h3>
                  <strong>
                    {total("attempts")
                      ? Math.min(
                          100,
                          Math.round(
                            (total("contacts") / total("attempts")) * 100,
                          ),
                        ) + "%"
                      : "—"}
                  </strong>
                  <p>
                    {total("contacts")} delivered / {total("attempts")} attempts
                    · Last 30 days, opted-in visitors only. Counts are
                    approximate.
                  </p>
                </div>
                <div className="studio-card">
                  <h3>Campaign sources</h3>
                  {data.sources?.length ? (
                    data.sources.map((x) => (
                      <div className="source-row" key={x.source}>
                        <span>{x.source}</span>
                        <span>{x.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p>
                      No opted-in campaign traffic yet. Use ?utm_source=linkedin
                      on shared links.
                    </p>
                  )}
                </div>
              </div>
              <div className="studio-card">
                <h3>Make it yours</h3>
                <div className="quick-links">
                  <button onClick={() => setTab("profile")}>
                    Edit your introduction <ArrowUpRight />
                  </button>
                  <button onClick={() => setTab("projects")}>
                    Add your next project <ArrowUpRight />
                  </button>
                  <button onClick={() => setTab("media")}>
                    Upload a photo or resume <ArrowUpRight />
                  </button>
                </div>
              </div>
              <p className="muted">
                Analytics count opted-in page views and form submissions, not
                unique visitors. No advertising cookies or visitor profiles are
                created. Visitors can change their privacy choice at any time.
              </p>
            </TabsContent>
            <TabsContent value="profile">
              <div className="studio-card">
                <p className="muted">
                  Your name, story, contact details, and first impression.
                </p>
                <div className="fields">
                  {Object.entries(draft.profile).map(([k, v]) =>
                    field(k, v, (value) =>
                      change({
                        ...draft,
                        profile: { ...draft.profile, [k]: value },
                      }),
                    ),
                  )}
                </div>
              </div>
            </TabsContent>
            {(
              [
                "projects",
                "skills",
                "experience",
                "education",
                "testimonials",
                "certifications",
                "faq",
                "gallery",
                "customSections",
              ] as Collection[]
            ).map((n) => (
              <TabsContent value={n} key={n}>
                {collection(n)}
              </TabsContent>
            ))}
            <TabsContent value="settings">
              <div className="studio-card">
                <h3>Three visual directions</h3>
                <p>
                  Choose a theme, then fine-tune its colors below. Save and
                  publish to apply it.
                </p>
                <div className="theme-presets">
                  {Object.entries(themePresets).map(([id, preset]) => (
                    <button
                      key={id}
                      aria-pressed={draft.settings.visualTheme === id}
                      onClick={() =>
                        change({
                          ...draft,
                          settings: {
                            ...draft.settings,
                            ...Object.fromEntries(
                              Object.entries(preset).filter(
                                ([k]) => !["label", "description"].includes(k),
                              ),
                            ),
                            visualTheme: id,
                          },
                        })
                      }
                    >
                      <span
                        className="theme-swatch"
                        style={{
                          background: preset.paperColor,
                          color: preset.accent,
                        }}
                      >
                        Aa / 01
                      </span>
                      <strong>{preset.label}</strong>
                      <small>{preset.description}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="studio-card">
                <h3>Editorial content kit</h3>
                <p className="muted">
                  Apply the original portrait, updated LinkedIn URL, verified
                  credentials, and new editorial headings. Review the saved
                  draft before publishing.
                </p>
                <button
                  className="button"
                  onClick={() =>
                    setConfirm({
                      title: "Apply the new editorial content?",
                      description:
                        "This updates your photo, LinkedIn URL, hero and section headings, and certification entries in the draft. Other profile details and projects stay as they are.",
                      run: () => change(newEditorialContent(draft)),
                    })
                  }
                >
                  Apply verified content kit <Check size={16} />
                </button>
              </div>
              <div className="studio-card">
                <h3>Section visibility</h3>
                <div className="visibility-grid">
                  {Object.entries(draft.sections).map(([k, v]) => (
                    <label className="switch-label" key={k}>
                      <Switch
                        checked={v}
                        onCheckedChange={(value) =>
                          change({
                            ...draft,
                            sections: { ...draft.sections, [k]: value },
                          })
                        }
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
              <div className="studio-card">
                <h3>Brand & search</h3>
                <div className="fields">
                  {Object.entries(draft.settings).map(([k, v]) =>
                    [
                      "motion",
                      "analytics",
                      "chatbot",
                      "privacyNotice",
                      "liveBackground",
                      "builder",
                    ].includes(k) ? (
                      <label className="switch-label" key={k}>
                        <Switch
                          checked={v === "on"}
                          onCheckedChange={(value) =>
                            change({
                              ...draft,
                              settings: {
                                ...draft.settings,
                                [k]: value ? "on" : "off",
                              },
                            })
                          }
                        />
                        {labels[k]}
                      </label>
                    ) : (
                      field(k, v, (value) =>
                        change({
                          ...draft,
                          settings: { ...draft.settings, [k]: value },
                        }),
                      )
                    ),
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="media">
              <div className="editor-intro">
                <p>
                  PNG, JPEG, WebP and PDF · Up to 512 KB per file.
                  <br />
                  Files become public when used in published content.
                </p>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      act(async () => {
                        await upload(f);
                      });
                    e.target.value = "";
                  }}
                />
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} />
                  Upload file
                </button>
              </div>
              {!data.media.length && (
                <div className="empty-state">
                  Your media library is ready for its first upload.
                </div>
              )}
              <div className="media-grid">
                {data.media.map((m) => (
                  <article key={m.id}>
                    <div className="media-thumb">
                      {m.type.startsWith("image/") ? (
                        <img src={"/api/media/" + m.id} alt={m.name} />
                      ) : (
                        <span>PDF</span>
                      )}
                    </div>
                    <h3>{m.name}</h3>
                    <small>{(m.size / 1024).toFixed(0)} KB</small>
                    <div className="field-tools">
                      <button
                        onClick={() =>
                          navigator.clipboard
                            .writeText("/api/media/" + m.id)
                            .then(() => toast.success("File path copied"))
                            .catch(() => toast.error("Clipboard unavailable"))
                        }
                      >
                        Copy path
                      </button>
                      <button
                        onClick={() =>
                          setConfirm({
                            title: "Delete this file?",
                            description:
                              "Files used in your current draft or published portfolio cannot be deleted. Old version references may stop working.",
                            run: () =>
                              act(async () => {
                                const r = await fetch("/api/media?id=" + m.id, {
                                  method: "DELETE",
                                });
                                const b = (await r.json()) as State & {
                                  error: string;
                                  revision: number;
                                  updated: string;
                                  url: string;
                                };
                                if (!r.ok) throw Error(b.error);
                                setData({
                                  ...data,
                                  media: data.media.filter(
                                    (a) => a.id !== m.id,
                                  ),
                                });
                                toast.success("File deleted");
                              }),
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="inbox">
              <p className="muted">
                Messages sent through your portfolio. Replies open in your email
                app.
              </p>
              {!data.messages.length && (
                <div className="empty-state">
                  No messages yet. New inquiries will appear here.
                </div>
              )}
              {data.messages.map((m) => (
                <article className="studio-card message-card" key={m.id}>
                  <div className="entry-header">
                    <h3>
                      {m.name}
                      {!m.read && <span className="new-badge">New</span>}
                    </h3>
                    <small>{new Date(m.created).toLocaleString()}</small>
                  </div>
                  <a href={"mailto:" + m.email}>{m.email}</a>
                  <p>{m.message}</p>
                  <div className="actions">
                    <a
                      className="button"
                      href={
                        "mailto:" +
                        m.email +
                        "?subject=" +
                        encodeURIComponent("Re: Your portfolio inquiry")
                      }
                    >
                      Reply ↗
                    </a>
                    {!m.read && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await api({ action: "read", id: m.id });
                            setData({
                              ...data,
                              messages: data.messages.map((a) =>
                                a.id === m.id ? { ...a, read: 1 } : a,
                              ),
                            });
                          })
                        }
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() =>
                        setConfirm({
                          title: "Delete this message?",
                          description:
                            "This permanently removes the message from your inbox.",
                          run: () =>
                            act(async () => {
                              await api({ action: "delete-message", id: m.id });
                              setData({
                                ...data,
                                messages: data.messages.filter(
                                  (a) => a.id !== m.id,
                                ),
                              });
                            }),
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </TabsContent>
            <TabsContent value="history">
              <p className="muted">
                Your 20 most recent published versions. Restoring creates a
                draft for review before you publish again.
              </p>
              {!data.history.length && (
                <div className="empty-state">
                  Publish your first update to start version history.
                </div>
              )}
              {data.history.map((h, i) => (
                <div className="history-row" key={h.id}>
                  <div>
                    <h3>Published version {data.history.length - i}</h3>
                    <span>{new Date(h.created).toLocaleString()}</span>
                  </div>
                  <button
                    className="button"
                    onClick={() =>
                      setConfirm({
                        title: "Restore this version to your draft?",
                        description:
                          "This replaces your draft, including unsaved changes. Your live portfolio stays as it is.",
                        run: () =>
                          act(async () => {
                            await api({
                              action: "restore",
                              id: h.id,
                              revision: revision.current,
                            });
                            await load();
                            toast.success("Version restored to draft");
                          }),
                      })
                    }
                  >
                    Restore draft
                  </button>
                </div>
              ))}
            </TabsContent>
          </div>
        </div>
      </Tabs>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent className="studio-confirm">
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.description}
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
      <Dialog
        open={!!picker}
        onOpenChange={(v) => {
          if (!v) setPicker(null);
        }}
      >
        <DialogContent className="media-picker">
          <DialogTitle>Choose a file</DialogTitle>
          <DialogDescription>
            Select an uploaded file, or upload one now.
          </DialogDescription>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                act(async () => {
                  const url = await upload(f);
                  picker?.(url);
                  setPicker(null);
                });
            }}
          />
          <div className="media-grid">
            {data.media.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  picker?.("/api/media/" + m.id);
                  setPicker(null);
                }}
              >
                {m.type.startsWith("image/") ? (
                  <img src={"/api/media/" + m.id} alt={m.name} />
                ) : (
                  <span>PDF</span>
                )}
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
