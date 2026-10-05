import { resumeText, type ResumeDocument } from "./model";
const known = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Java",
  "C++",
  "C#",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Git",
  "CI/CD",
  "REST API",
  "GraphQL",
  "Machine Learning",
  "Deep Learning",
  "Natural Language Processing",
  "Data Analysis",
  "Excel",
  "Power BI",
  "Tableau",
  "Project Management",
  "Communication",
  "Leadership",
  "Agile",
  "Scrum",
  "FastAPI",
  "LangChain",
  "LangGraph",
  "CrewAI",
  "TensorFlow",
  "PyTorch",
  "Raspberry Pi",
  "ESP32",
  "STM32",
  "Linux",
  "Embedded Systems",
  "IoT",
  "LLM",
  "Generative AI",
  "Cybersecurity",
  "Figma",
  "HTML",
  "CSS",
];
const stop = new Set(
  "the a an of in on to with and or for is are be will you your we our as at by from this that have has minimum required preferred experience skills role work team responsibilities ability strong excellent years must candidate company job about looking using understanding knowledge develop development degree equivalent relevant including such etc engineer engineering software demonstrated proficient proficiency requirement requirements programming technology technologies working position technical please apply".split(
    " ",
  ),
);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, term: string) =>
  new RegExp(`(^|[^a-z0-9])${escape(term)}($|[^a-z0-9])`, "i").test(text);
const aliases: Record<string, string[]> = {
  JavaScript: ["JS"],
  TypeScript: ["TS"],
  "Natural Language Processing": ["NLP"],
  "Machine Learning": ["ML"],
  "Google Cloud": ["GCP"],
  "REST API": ["REST APIs", "RESTful"],
  "Generative AI": ["GenAI"],
  LLM: ["large language model", "large language models"],
};
export type Issue = {
  severity: "warning" | "info";
  message: string;
  fix: string;
};
export function analyzeResume(r: ResumeDocument) {
  const text = resumeText(r),
    issues: Issue[] = [];
  const jd = r.jobDescription.trim();
  const terms = known.filter((k) => contains(jd, k));
  const counts: Record<string, number> = {};
  for (const word of jd.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [])
    if (!stop.has(word)) counts[word] = (counts[word] || 0) + 1;
  for (const [word, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]))
    if (
      n >= 2 &&
      !terms.some((k) => k.toLowerCase().includes(word)) &&
      terms.length < 35
    )
      terms.push(word);
  const keywords = terms.map((term) => ({
    term,
    matched:
      contains(text, term) ||
      (aliases[term] || []).some((a) => contains(text, a)),
    count: (
      text.toLowerCase().match(new RegExp(escape(term.toLowerCase()), "g")) ||
      []
    ).length,
  }));
  let complete = 15,
    quality =
      (r.presentation.summaryVisible && r.summary.trim()) ||
      (r.presentation.skillsVisible && r.skills.trim()) ||
      r.sections.some((s) => s.visible && s.items.length)
        ? 20
        : 0,
    dates = r.sections.some((s) => s.visible && s.items.length) ? 10 : 0;
  if (!r.basics.name.trim()) {
    complete -= 4;
    issues.push({
      severity: "warning",
      message: "Add your full name.",
      fix: "Identity",
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.basics.email)) {
    complete -= 3;
    issues.push({
      severity: "warning",
      message: "Add a valid contact email.",
      fix: "Identity",
    });
  }
  if (!r.basics.headline.trim()) {
    complete -= 2;
    issues.push({
      severity: "warning",
      message: "Add a clear target role.",
      fix: "Identity",
    });
  }
  if (!(r.presentation.summaryVisible && r.summary.trim())) {
    complete -= 2;
    issues.push({
      severity: "info",
      message: "A concise summary helps explain your fit.",
      fix: "Summary",
    });
  }
  if (!(r.presentation.skillsVisible && r.skills.trim())) {
    complete -= 2;
    issues.push({
      severity: "warning",
      message: "List your relevant skills.",
      fix: "Skills",
    });
  }
  const visible = r.sections.filter((x) => x.visible && x.items.length),
    items = visible.flatMap((s) => s.items);
  if (!items.length) {
    complete -= 2;
    issues.push({
      severity: "warning",
      message: "Add experience, education, or a project.",
      fix: "Experience",
    });
  }
  const bullets = items.flatMap((x) => x.bullets),
    weak = bullets.filter((b) =>
      /^(responsible for|helped|worked on|duties|participated)/i.test(b.trim()),
    ),
    long = bullets.filter((b) => b.length > 280),
    metrics = bullets.filter((b) => /\d/.test(b));
  if (weak.length) {
    quality -= Math.min(5, weak.length);
    issues.push({
      severity: "info",
      message: `${weak.length} bullet(s) start weakly. Describe your action and real result.`,
      fix: "Experience",
    });
  }
  if (long.length) {
    quality -= 3;
    issues.push({
      severity: "info",
      message: `Shorten ${long.length} long bullet(s).`,
      fix: "Experience",
    });
  }
  if (bullets.length && !metrics.length) {
    quality -= 2;
    issues.push({
      severity: "info",
      message:
        "Add a measurable result where you have evidence. Never invent numbers.",
      fix: "Experience",
    });
  }
  if (/\b(I|my|me)\b/.test(text)) {
    quality -= 2;
    issues.push({
      severity: "info",
      message:
        "Use direct achievement statements instead of first-person pronouns.",
      fix: "Summary",
    });
  }
  if (
    new Set(bullets.map((x) => x.toLowerCase().trim())).size < bullets.length
  ) {
    quality -= 3;
    issues.push({
      severity: "warning",
      message: "Remove duplicate bullets.",
      fix: "Experience",
    });
  }
  if (
    /\b(results[- ]driven professional|dynamic individual|synergiz\w*|highly motivated self[- ]starter|passionate professional)\b/i.test(
      text,
    )
  ) {
    issues.push({
      severity: "info",
      message:
        "Replace generic claims with a specific skill, contribution, or result you can explain.",
      fix: "Summary",
    });
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 80) {
    quality -= 15;
    issues.push({
      severity: "info",
      message: "The resume needs more relevant evidence and context.",
      fix: "Experience",
    });
  }
  if (words > 900) {
    quality -= 3;
    issues.push({
      severity: "info",
      message: "Consider shortening this resume or choosing a two-page format.",
      fix: "Summary",
    });
  }
  const dateOk = (v: string) =>
    !v ||
    /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}|\d{4}-\d{2}|\d{4}|\d{2}\/\d{4})$/i.test(
      v,
    );
  for (const i of items)
    if (!dateOk(i.start) || !dateOk(i.end)) {
      dates = Math.max(0, dates - 2);
      issues.push({
        severity: "warning",
        message: `Use consistent dates for ${i.title || "an entry"} (e.g. Jan 2026).`,
        fix: visible.find((s) => s.items.includes(i))?.heading || "Experience",
      });
    }
  const standard = new Set([
    "experience",
    "work experience",
    "education",
    "projects",
    "certifications",
    "awards",
    "publications",
    "languages",
    "volunteer",
    "volunteer experience",
  ]);
  for (const s of visible)
    if (!standard.has(s.heading.toLowerCase()))
      issues.push({
        severity: "info",
        message: `“${s.heading}” is a custom heading; common headings are easier to recognize.`,
        fix: s.heading,
      });
  if (keywords.some((x) => x.count > 8)) {
    quality -= 3;
    issues.push({
      severity: "warning",
      message:
        "A keyword appears more than eight times. Review for repetition or stuffing.",
      fix: "Skills",
    });
  }
  const match = keywords.length
    ? Math.round(
        (25 * keywords.filter((x) => x.matched).length) / keywords.length,
      )
    : null;
  const breakdown = [
    { label: "Linear structure", value: text.trim() ? 30 : 0, max: 30 },
    { label: "Completeness", value: Math.max(0, complete), max: 15 },
    { label: "Content guidance", value: Math.max(0, quality), max: 20 },
    { label: "Dates & consistency", value: dates, max: 10 },
    ...(match !== null
      ? [{ label: "JD keyword coverage", value: match, max: 25 }]
      : []),
  ];
  const score = Math.round(
    (100 * breakdown.reduce((n, x) => n + x.value, 0)) /
      breakdown.reduce((n, x) => n + x.max, 0),
  );
  return {
    score,
    breakdown,
    keywords,
    issues,
    words,
    plainText: text,
    disclaimer:
      "An explainable writing and keyword estimate, not an official ATS score or a hiring prediction. Structure reflects this app’s template; exported-file verification is separate.",
  };
}
