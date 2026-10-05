import { admin, bucket, published, response } from "@/lib/server";
import { isPublishedMedia } from "@/lib/public-media";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      return new Response("Not found", { status: 404 });
    const c = await published();
    const isPublic = isPublishedMedia(c, id);
    if (!isPublic && !(await admin()))
      return response({ error: "Not found" }, 404);
    const f = await bucket().get(id);
    if (!f) return new Response("Not found", { status: 404 });
    return new Response(f.body, {
      headers: {
        "Content-Type":
          f.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition":
          f.httpMetadata?.contentType === "application/pdf"
            ? 'attachment; filename="resume.pdf"'
            : "inline",
      },
    });
  } catch {
    return new Response("File unavailable", { status: 503 });
  }
}
