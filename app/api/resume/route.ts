import { published, track } from "@/lib/server";
import { resumePdf } from "@/lib/pdf";
export async function GET(r: Request) {
  try {
    const c = await published();
    const pdf = resumePdf(c);
    if (new URL(r.url).searchParams.get("analytics") === "1")
      await track("resumes").catch(console.error);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Anbu-Selvan-Resume.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Resume is temporarily unavailable.", { status: 503 });
  }
}
