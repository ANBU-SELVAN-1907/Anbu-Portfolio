import { admin, bucket, published, response, store } from "@/lib/server";
import { isPublishedMedia } from "@/lib/public-media";
import { storageDownload } from "@/lib/storage";
export async function GET(
  request: Request,
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
    if (new URL(request.url).searchParams.get("info") === "1") {
      const info = await store.get("media", id);
      return info
        ? response({ type: info.type, name: info.name, size: info.size })
        : response({ error: "Not found" }, 404);
    }
    const download = await storageDownload(id);
    if (download)
      return new Response(null, {
        status: 302,
        headers: {
          Location: download,
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    const f = await bucket().get(id);
    if (!f) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(f.body).buffer, {
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
