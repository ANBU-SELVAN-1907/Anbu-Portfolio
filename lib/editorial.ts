import { entry, initialContent, type Content } from "./content";

// Content defaults are versioned separately from presentation. Existing edits survive.
export const editorialSettings = {
  visualTheme: "editorial",
  liveBackground: "on",
  galleryTitle: "Moments that moved me forward.",
  galleryNote: "Projects, credentials, and the work behind them.",
  builder: "on",
  heroNote: "Software meets the physical world.",
  labNote: "Open a project. Follow the signal.",
  aboutNote: "A little curiosity goes a long way.",
  credentialTitle: "Learning, with receipts.",
  credentialNote: "Cloud, AI, and the work of staying curious.",
  faqTitle: "Before we build.",
  chatbot: "on",
  chatTitle: "Ask about my work",
  chatIntro: "Explore my projects, experience, and skills with an AI guide.",
  lastUpdated: "2026-10-05",
  defaultTheme: "light",
  privacyNotice: "on",
  paperColor: "#f1eee7",
  inkColor: "#22241f",
  oliveColor: "#d8dfc6",
  journeyColor: "#2345c6",
  labColor: "#202621",
  heroStamp: "AI\n×\nIoT",
  labLabel: "01 / THE ENGINEERING LAB",
  aboutLabel: "02 / BEHIND THE SYSTEMS",
  toolkitLabel: "03 / THE TOOLKIT",
  journeyLabel: "04 / FIELD NOTES",
  credentialLabel: "05 / CREDENTIALS",
  contactLabel: "06 / YOUR NEXT IDEA",
};
export const verifiedCredentials = [
  entry({
    id: "aws-genai",
    title: "AWS Educate Introduction to Generative AI",
    subtitle: "Amazon Web Services",
    period: "Jul 2026",
    description: "Training badge · Introduction to Generative AI.",
    tags: "AWS, Generative AI",
    link: "https://www.linkedin.com/in/anbu-selvan-t",
  }),
  entry({
    id: "google-cloud",
    title: "Associate Cloud Engineer Certification",
    subtitle: "Google",
    period: "Jan 2026",
    description:
      "Cloud engineering certification listed on my LinkedIn profile.",
    tags: "Google Cloud",
    link: "https://www.linkedin.com/in/anbu-selvan-t",
  }),
  entry({
    id: "oracle-agentic",
    title: "Agentic AI Certified Foundations Associate",
    subtitle: "Oracle",
    period: "Aug 2026 · Expires Aug 2028",
    description: "Foundations of agentic AI.",
    tags: "Oracle, Agentic AI",
    link: "https://www.linkedin.com/in/anbu-selvan-t",
  }),
  entry({
    id: "sap-genai",
    title: "SAP Certified — SAP Generative AI Developer",
    subtitle: "SAP",
    period: "Aug 2026 · Expires Aug 2027",
    description: "Generative AI development certification.",
    tags: "SAP, Generative AI",
    link: "https://www.credly.com/badges/b1f16dd5-3c5e-4ceb-aa99-57c4daedabe0",
  }),
];
export const starterFaq = [
  entry({
    id: "collaboration",
    title: "What kind of work interests you?",
    description:
      "AI applications, agent workflows, connected devices, and real-time voice systems. If your idea brings intelligence into a useful real-world experience, let’s talk.",
  }),
  entry({
    id: "remote",
    title: "Where are you based?",
    description:
      "Chennai, India (UTC +05:30). Tell me your location, timeline, and collaboration needs when you get in touch.",
  }),
  entry({
    id: "source",
    title: "Can I see the source code?",
    description:
      "Public repositories are linked on GitHub. Some enterprise internship work is confidential; the case studies describe my process without exposing proprietary code.",
  }),
];
export function normalizeContent(c: Content): Content {
  return {
    ...c,
    profile: {
      ...c.profile,
      ...(c.profile.name === "Anbu Selvan" && c.profile.surname === "T"
        ? { name: "Anbu Selvan T", surname: "" }
        : {}),
    },
    settings: { ...editorialSettings, ...c.settings },
    sections: { faq: true, gallery: true, customSections: true, ...c.sections },
    faq: c.faq ?? starterFaq,
    gallery: c.gallery ?? [],
    customSections: c.customSections ?? [],
  };
}
export function newEditorialContent(c: Content = initialContent): Content {
  return normalizeContent({
    ...c,
    profile: {
      ...c.profile,
      photo: "/anbu-original.png",
      linkedin: "https://www.linkedin.com/in/anbu-selvan-t",
      headline: "Intelligence.\nIn the real world.",
      eyebrow: "ANBU SELVAN / ENGINEERING INTELLIGENCE",
    },
    education: c.education.map((x) =>
      x.id === "hits"
        ? {
            ...x,
            tags:
              x.tags ||
              "AI-IoT, LLM fine-tuning, AI on embedded systems, AI agents, Robotics & automation, BLE technology",
          }
        : x,
    ),
    sections: { ...c.sections, certifications: true },
    certifications: verifiedCredentials,
    gallery:
      c.gallery ??
      verifiedCredentials.map((x) => ({ ...x, id: "gallery-" + x.id })),
    settings: {
      ...c.settings,
      accent: "#ed6a32",
      workTitle: "Ideas, put to work.",
      aboutTitle: "Curious by nature.\nEngineer by choice.",
      skillsTitle: "From model to machine.",
      experienceTitle: "The story so far.",
    },
  });
}
export const themePresets = {
  editorial: {
    label: "Studio Paper",
    description: "Warm paper, orange signals, cobalt field notes.",
    paperColor: "#f1eee7",
    inkColor: "#22241f",
    accent: "#ed6a32",
    oliveColor: "#d8dfc6",
    journeyColor: "#2345c6",
    labColor: "#202621",
    defaultTheme: "light",
  },
  noir: {
    label: "Midnight Atlas",
    description: "Graphite, silver typography, electric lime.",
    paperColor: "#171a1c",
    inkColor: "#f2f3eb",
    accent: "#d1f16b",
    oliveColor: "#29322c",
    journeyColor: "#273b44",
    labColor: "#0f1416",
    defaultTheme: "light",
  },
  aurora: {
    label: "Indigo Current",
    description: "Ice blue, violet accents, a luminous technical mood.",
    paperColor: "#edf2fc",
    inkColor: "#17273f",
    accent: "#7046df",
    oliveColor: "#dae5f5",
    journeyColor: "#413386",
    labColor: "#19293a",
    defaultTheme: "light",
  },
} as const;
