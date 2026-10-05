import type { Content } from "./content";
export function isPublishedMedia(content: Content, id: string) {
  const path = "/api/media/" + id;
  if ([content.profile.photo, content.profile.resume].includes(path))
    return true;
  for (const collection of [
    "projects",
    "experience",
    "education",
    "skills",
    "testimonials",
    "certifications",
    "gallery",
    "customSections",
  ] as const) {
    if (!content.sections[collection]) continue;
    if (
      content[collection]?.some(
        (x) => x.visible && [x.image, x.link, x.code].includes(path),
      )
    )
      return true;
  }
  return false;
}
