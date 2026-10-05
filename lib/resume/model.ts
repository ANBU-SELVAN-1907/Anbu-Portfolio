import { z } from "zod";
const text = z.string().max(6000);
const safeLink = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (() => {
        try {
          return new URL(v).protocol === "https:";
        } catch {
          return false;
        }
      })(),
    "Use an HTTPS URL.",
  );
export const resumeItemSchema = z
  .object({
    id: z.string().max(100),
    title: text,
    organisation: text,
    location: text,
    start: z.string().max(40),
    end: z.string().max(40),
    current: z.boolean(),
    bullets: z.array(text).max(30),
    link: safeLink,
  })
  .strict();
export const sectionSchema = z
  .object({
    id: z.string().max(100),
    heading: z.string().min(1).max(80),
    visible: z.boolean(),
    items: z.array(resumeItemSchema).max(40),
  })
  .strict();
export const resumeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().max(100),
    title: z.string().max(100),
    basics: z
      .object({
        name: text,
        headline: text,
        email: z.string().max(254),
        phone: z.string().max(100),
        location: z.string().max(200),
        linkedin: safeLink,
        website: safeLink,
      })
      .strict(),
    summary: text,
    skills: text,
    sections: z.array(sectionSchema).max(12),
    template: z.enum(["classic", "technical", "executive"]),
    pageSize: z.enum(["A4", "Letter"]),
    fontSize: z.number().min(10).max(12),
    margin: z.number().min(36).max(64),
    jobDescription: z.string().max(20000),
    sectionOrder: z.array(z.string().max(100)).max(14).default([]),
    presentation: z
      .object({
        summaryHeading: z.string().min(1).max(80).default("Summary"),
        skillsHeading: z.string().min(1).max(80).default("Skills"),
        summaryVisible: z.boolean().default(true),
        skillsVisible: z.boolean().default(true),
        nameSize: z.number().min(20).max(30).default(24),
        lineSpacing: z.number().min(1.15).max(1.6).default(1.3),
        sectionSpacing: z.number().min(8).max(22).default(12),
        bulletIndent: z.number().min(8).max(24).default(12),
        accent: z.enum(["black", "navy", "slate"]).default("black"),
      })
      .strict()
      .default({}),
  })
  .strict()
  .superRefine((r, ctx) => {
    const ids = r.sections.map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Section IDs must be unique." });
    for (const s of r.sections)
      if (new Set(s.items.map((x) => x.id)).size !== s.items.length)
        ctx.addIssue({ code: "custom", message: "Item IDs must be unique." });
  });
export type ResumeDocument = z.infer<typeof resumeSchema>;
export type ResumeItem = z.infer<typeof resumeItemSchema>;
export const applicationSchema = z
  .object({
    id: z.string().max(100),
    company: z.string().max(300),
    role: z.string().max(300),
    status: z.enum(["Saved", "Applied", "Interview", "Offer", "Rejected"]),
    resumeId: z.string().max(100),
    resumeTitle: z.string().max(100),
    resumeVersionId: z.string().max(100).default(""),
    note: z.string().max(6000),
  })
  .strict();
export const workspaceSchema = z
  .object({
    documents: z.array(resumeSchema).max(10),
    active: z.string().max(100).optional(),
    versions: z
      .array(
        z
          .object({
            id: z.string().max(100),
            created: z.string().max(100),
            resume: resumeSchema,
          })
          .strict(),
      )
      .max(40)
      .default([]),
    applications: z.array(applicationSchema).max(100).default([]),
  })
  .strict();
export const newItem = (): ResumeItem => ({
  id: crypto.randomUUID(),
  title: "",
  organisation: "",
  location: "",
  start: "",
  end: "",
  current: false,
  bullets: [],
  link: "",
});
export function blankResume(): ResumeDocument {
  return {
    sectionOrder: [],
    presentation: {
      summaryHeading: "Summary",
      skillsHeading: "Skills",
      summaryVisible: true,
      skillsVisible: true,
      nameSize: 24,
      lineSpacing: 1.3,
      sectionSpacing: 12,
      bulletIndent: 12,
      accent: "black",
    },
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: "My resume",
    basics: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
    },
    summary: "",
    skills: "",
    sections: ["Experience", "Education", "Projects", "Certifications"].map(
      (heading) => ({
        id: crypto.randomUUID(),
        heading,
        visible: true,
        items: [],
      }),
    ),
    template: "classic",
    pageSize: "A4",
    fontSize: 11,
    margin: 45,
    jobDescription: "",
  };
}
export function resumeText(r: ResumeDocument) {
  const lines = [
    r.basics.name,
    r.basics.headline,
    [r.basics.email, r.basics.phone, r.basics.location]
      .filter(Boolean)
      .join(" | "),
    r.basics.linkedin,
    r.basics.website,
  ];
  for (const s of resumeBlocks(r).filter((x) => x.visible)) {
    if (s.text !== undefined) {
      if (s.text.trim()) lines.push("", s.heading, s.text);
      continue;
    }
    if (!s.items?.length) continue;
    lines.push("", s.heading);
    for (const i of s.items)
      lines.push(
        [i.title, i.organisation, i.location].filter(Boolean).join(" | "),
        [i.start, i.current ? "Present" : i.end].filter(Boolean).join(" – "),
        ...i.bullets.filter((b) => b.trim()).map((b) => "- " + b),
        i.link,
      );
  }
  return lines
    .filter((x, i, a) => x || a[i - 1])
    .join("\n")
    .trim();
}
export function importText(raw: string): ResumeDocument {
  const text = raw.slice(0, 30000),
    r = blankResume(),
    lines = text
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  r.basics.name = lines[0]?.slice(0, 100) || "";
  r.basics.headline = lines[1]?.slice(0, 150) || "";
  r.basics.email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || "";
  r.basics.phone =
    text.match(/(?:\+\d{1,3}[ -]?)?(?:\(?\d{3,5}\)?[ -]?){2,3}\d{3,5}/)?.[0] ||
    "";
  r.summary = lines.slice(2).join("\n").slice(0, 6000);
  return r;
}

export type ResumeBlock = {
  id: string;
  heading: string;
  visible: boolean;
  text?: string;
  items?: ResumeItem[];
};
export function resumeBlocks(r: ResumeDocument): ResumeBlock[] {
  const all: ResumeBlock[] = [
    {
      id: "summary",
      heading: r.presentation.summaryHeading,
      visible: r.presentation.summaryVisible,
      text: r.summary,
    },
    {
      id: "skills",
      heading: r.presentation.skillsHeading,
      visible: r.presentation.skillsVisible,
      text: r.skills,
    },
    ...r.sections,
  ];
  const ordered = [...new Set(r.sectionOrder)]
    .map((id) => all.find((b) => b.id === id))
    .filter((b): b is ResumeBlock => !!b);
  return [
    ...ordered,
    ...all.filter((b) => !ordered.some((o) => o.id === b.id)),
  ];
}
