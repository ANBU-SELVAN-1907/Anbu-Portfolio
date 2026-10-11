import {
  requestFailure,
  admin,
  bucket,
  store,
  response,
  sameOrigin,
  snapshot,
  boundedBytes,
} from "@/lib/server";
import { LEGACY_MAX_MEDIA_BYTES as MAX_MEDIA_BYTES } from "@/lib/media";
import { r2Remove } from "@/lib/r2";
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    if (Number(r.headers.get("content-length")) > MAX_MEDIA_BYTES + 65536)
      return response({ error: "Maximum upload size is 4 MiB." }, 413);
    if (!r.headers.get("content-type")?.startsWith("multipart/form-data;"))
      return response({ error: "Use the upload form to choose a file." }, 400);
    const form = await new Response(
      await boundedBytes(r, MAX_MEDIA_BYTES + 65536),
      {
        headers: { "Content-Type": r.headers.get("Content-Type") || "" },
      },
    )
      .formData()
      .catch(() => null);
    if (!form) return response({ error: "The upload form is invalid." }, 400);
    const f = form.get("file");
    const resume = form.get("purpose") === "resume";
    if (!(f instanceof File) || f.size > MAX_MEDIA_BYTES || f.size === 0)
      return response(
        { error: "Select a nonempty original file up to 4 MiB." },
        400,
      );
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
    if (!types[f.type] || (resume && f.type !== "application/pdf"))
      return response(
        {
          error: resume
            ? "Your resume must be a PDF file."
            : "Use a valid PNG, JPEG, WebP image or PDF.",
        },
        400,
      );
    const id = crypto.randomUUID();
    await bucket().put(id, bytes, { httpMetadata: { contentType: f.type } });
    try {
      const saved = await store.atomic("storage_usage", "main", (old) => {
        const total = Number(old?.bytes || 0) + f.size;
        return total > 9_000_000_000
          ? null
          : {
              data: { bytes: total },
              result: true,
              extra: [
                {
                  collection: "media",
                  id,
                  data: {
                    id,
                    name: f.name.slice(0, 180),
                    type: f.type,
                    size: f.size,
                    storage: "r2",
                    created: new Date().toISOString(),
                  },
                },
              ],
            };
      });
      if (!saved) throw Error("Managed R2 storage limit reached.");
    } catch (e) {
      try {
        if (!(await store.get("media", id)))
          await r2Remove(`media/${id}`).catch(() => {});
      } catch {
        /* Preserve objects on an uncertain commit. */
      }
      throw e;
    }
    return response({ id, url: "/api/media/" + id, name: f.name });
  } catch (e) {
    const failure = requestFailure(e);
    if (failure) return failure;
    return response({ error: "Upload failed. Please try again." }, 503);
  }
}
export async function DELETE(r: Request) {
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    const id = new URL(r.url).searchParams.get("id");
    if (!id || !/^[a-f0-9-]{36}$/.test(id))
      return response({ error: "Choose a valid file." }, 400);
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
    // Claim the release once. A failed/uncertain counter update can overcount,
    // but retries and concurrent deletes must never undercount managed storage.
    const released = await store.atomic("media", id, (media) =>
      media?.storage === "r2" && !media.usageReleased
        ? {
            data: { ...media, usageReleased: true },
            result: Number(media.size),
          }
        : null,
    );
    if (released !== null)
      await store.atomic("storage_usage", "main", (old) => ({
        data: {
          bytes: Math.max(0, Number(old?.bytes || 0) - released),
        },
        result: true,
      }));
    await store.remove("media", id);
    return response({ ok: true });
  } catch {
    return response({ error: "Unable to delete file." }, 503);
  }
}
