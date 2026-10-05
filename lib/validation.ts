import { z } from "zod";
import { editorialSettings } from "./editorial";
const text = z.string().max(10000);
const url = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      /^\/(?!\/)[a-zA-Z0-9/_?=%.~-]*$/.test(v) ||
      (() => {
        try {
          return new URL(v).protocol === "https:";
        } catch {
          return false;
        }
      })(),
    "Use an HTTPS URL or a local media path.",
  );
const item = z
  .object({
    id: z.string().min(1).max(100),
    title: text,
    subtitle: text,
    period: text,
    description: text,
    tags: text,
    problem: text,
    process: text,
    outcome: text,
    image: url,
    link: url,
    code: url,
    visible: z.boolean(),
  })
  .strict();
const list = z
  .array(item)
  .max(100)
  .refine(
    (xs) => new Set(xs.map((x) => x.id)).size === xs.length,
    "Entry IDs must be unique.",
  );
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const contentSchema = z
  .object({
    profile: z
      .object({
        name: text,
        surname: text,
        role: text,
        eyebrow: text,
        headline: text,
        intro: text,
        bio: text,
        journey: text,
        personality: text,
        email: z.string().email(),
        phone: text,
        location: text,
        timezone: text,
        linkedin: url,
        github: url,
        photo: url,
        resume: url,
        availability: text,
        contactTitle: text,
        contactText: text,
      })
      .strict(),
    sections: z
      .object({
        about: z.boolean(),
        projects: z.boolean(),
        skills: z.boolean(),
        experience: z.boolean(),
        education: z.boolean(),
        testimonials: z.boolean(),
        certifications: z.boolean(),
        contact: z.boolean(),
        faq: z.boolean().default(true),
        gallery: z.boolean().default(true),
        customSections: z.boolean().default(true),
      })
      .strict(),
    projects: list,
    skills: list,
    experience: list,
    education: list,
    testimonials: list,
    certifications: list,
    faq: list.optional(),
    gallery: list.optional(),
    customSections: list
      .refine((xs) => xs.length <= 20, "Use up to 20 custom chapters.")
      .optional(),
    settings: z
      .object({
        visualTheme: z
          .enum(["editorial", "noir", "aurora"])
          .default("editorial"),
        liveBackground: z.enum(["on", "off"]).default("on"),
        builder: z.enum(["on", "off"]).default("on"),
        galleryTitle: text.default(editorialSettings.galleryTitle),
        galleryNote: text.default(editorialSettings.galleryNote),
        paperColor: color.default(editorialSettings.paperColor),
        inkColor: color.default(editorialSettings.inkColor),
        oliveColor: color.default(editorialSettings.oliveColor),
        journeyColor: color.default(editorialSettings.journeyColor),
        labColor: color.default(editorialSettings.labColor),
        heroStamp: text.default(editorialSettings.heroStamp),
        labLabel: text.default(editorialSettings.labLabel),
        aboutLabel: text.default(editorialSettings.aboutLabel),
        toolkitLabel: text.default(editorialSettings.toolkitLabel),
        journeyLabel: text.default(editorialSettings.journeyLabel),
        credentialLabel: text.default(editorialSettings.credentialLabel),
        contactLabel: text.default(editorialSettings.contactLabel),
        seoTitle: text,
        seoDescription: text,
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        motion: z.enum(["on", "off"]),
        analytics: z.enum(["on", "off"]),
        footer: text,
        workTitle: text,
        aboutTitle: text,
        skillsTitle: text,
        experienceTitle: text,
        heroNote: text.default(editorialSettings.heroNote),
        labNote: text.default(editorialSettings.labNote),
        aboutNote: text.default(editorialSettings.aboutNote),
        credentialTitle: text.default(editorialSettings.credentialTitle),
        credentialNote: text.default(editorialSettings.credentialNote),
        faqTitle: text.default(editorialSettings.faqTitle),
        chatbot: z.enum(["on", "off"]).default("on"),
        chatTitle: text.default(editorialSettings.chatTitle),
        chatIntro: text.default(editorialSettings.chatIntro),
        lastUpdated: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .default(editorialSettings.lastUpdated),
        defaultTheme: z.enum(["light", "dark"]).default("light"),
        privacyNotice: z.enum(["on", "off"]).default("on"),
      })
      .strict(),
  })
  .strict();
