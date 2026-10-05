import {
  admin,
  bucket,
  store,
  response,
  sameOrigin,
  snapshot,
  boundedBytes,
} from "@/lib/server";
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    if (Number(r.headers.get("content-length")) > 600_000)
      return response({ error: "Maximum upload size is 512 KB." }, 413);
    const form = await new Response(await boundedBytes(r, 600000), {
      headers: { "Content-Type": r.headers.get("Content-Type") || "" },
    }).formData();
    const f = form.get("file");
    if (!(f instanceof File) || f.size > 524288 || f.size === 0)
      return response({ error: "Select a file under 512 KB." }, 400);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const head = Array.from(bytes.slice(0, 12));
    const types: Record<string, boolean> = {
      "image/png": head.slice(0, 8).join() === "137,80,78,71,13,10,26,10",
      "image/jpeg": head[0] === 255 && head[1] === 216 && head[2] === 255,
      "image/webp":
        String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...head.slice(8, 12)) === "WEBP",
      "application/pdf": String.fromCharCode(...head.slice(0, 5)) === "%PDF-",
    };
    if (!types[f.type])
      return response(
        { error: "Use a valid PNG, JPEG, WebP image or PDF." },
        400,
      );
    const id = crypto.randomUUID();
    await bucket().put(id, bytes, { httpMetadata: { contentType: f.type } });
    try {
      await store.set("media", id, {
        id,
        name: f.name.slice(0, 180),
        type: f.type,
        size: f.size,
        created: new Date().toISOString(),
      });
    } catch (e) {
      await bucket().delete(id);
      throw e;
    }
    return response({ id, url: "/api/media/" + id, name: f.name });
  } catch (e) {
    console.error(e);
    return response({ error: "Upload failed. Please try again." }, 503);
  }
}
export async function DELETE(r: Request) {
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    const id = new URL(r.url).searchParams.get("id");
    if (!id) return response({ error: "Missing file." }, 400);
    const s = await snapshot();
    const retainedHistory = await store.list("history", 20);
    if (JSON.stringify([s, retainedHistory]).includes("/api/media/" + id))
      return response(
        {
          error:
            "This file is used in a draft, published content, or a retained version. Replace it or wait until that version leaves history before deleting it.",
        },
        409,
      );
    await bucket().delete(id);
    await store.remove("media", id);
    return response({ ok: true });
  } catch {
    return response({ error: "Unable to delete file." }, 503);
  }
}
