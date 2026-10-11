import { admin, bucket, published, snapshot, track } from "@/lib/server";
import { resumePdf } from "@/lib/pdf";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  try {
    const query = new URL(r.url).searchParams;
    const preview = query.get("preview") === "1";
    if (preview && !(await admin()))
      return new Response("Admin sign-in required.", { status: 403 });
    const c = preview ? (await snapshot()).draft : await published();
    const source = c.profile.resume;
    if (!source) return new Response("No resume published.", { status: 404 });
    let pdf: Uint8Array;
    const media = source.match(/^\/api\/media\/([a-f0-9-]{36})$/);
    if (media) {
      const file = await bucket().get(media[1]);
      if (!file || file.httpMetadata.contentType !== "application/pdf")
        return new Response("Resume PDF is unavailable.", { status: 404 });
      pdf = file.body;
    } else if (source === "/api/resume") {
      pdf = resumePdf(c);
    } else if (source === "/resume.pdf") {
      // A fixed bundled path only; never fetch an arbitrary owner-supplied URL.
      return new Response(null, {
        status: 307,
        headers: { Location: "/resume.pdf", "Cache-Control": "no-store" },
      });
    } else if (source.startsWith("https://")) {
      return new Response(null, {
        status: 307,
        headers: { Location: source, "Cache-Control": "no-store" },
      });
    } else
      return new Response("Select a PDF in the owner studio.", { status: 404 });
    if (!preview && query.get("analytics") === "1")
      await track("resumes").catch(() => {});
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="Anbu-Selvan-T-Resume.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Resume is temporarily unavailable.", { status: 503 });
  }
}
