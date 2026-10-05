import { notFound } from "next/navigation";
import ResumeBuilder from "@/components/resume-builder";
import { published } from "@/lib/server";
export const metadata = {
  title: "Resume Studio | Professional Resume Builder",
  icons: { icon: "/resume-studio.svg" },
  description:
    "Build a single-column resume, compare job keywords, and download PDF or editable Word. Free, with local drafts and no sign-up.",
};
export const dynamic = "force-dynamic";
export default async function BuilderPage() {
  const c = await published();
  if (c.settings.builder !== "on") notFound();
  return <ResumeBuilder />;
}
