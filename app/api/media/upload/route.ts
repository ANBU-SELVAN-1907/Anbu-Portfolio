import { z } from "zod";
import {
  admin,
  store,
  sameOrigin,
  jsonBody,
  response,
  requestFailure,
  limited,
} from "@/lib/server";
import { MAX_MEDIA_BYTES, mediaTypes } from "@/lib/media";
import { r2Ready, r2UploadUrl, r2VerifyAndPromote, r2Remove } from "@/lib/r2";
import type { RecordData } from "@/lib/firebase";
export const maxDuration = 300;
const prepare = z
  .object({
    action: z.literal("prepare"),
    name: z.string().trim().min(1).max(180),
    type: z.string().refine((x) => mediaTypes.includes(x)),
    size: z.number().int().positive().max(MAX_MEDIA_BYTES),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    purpose: z.enum(["resume", "media"]).default("media"),
  })
  .strict();
const finish = z
  .object({ action: z.literal("finish"), id: z.string().uuid() })
  .strict();
export async function POST(r: Request) {
  let claimed: string | undefined;
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    if (!r2Ready())
      return response(
        {
          error:
            "R2 needs configuration. Follow R2_SETUP.md and add its private credentials to Vercel.",
        },
        503,
      );
    const parsed = z
      .union([prepare, finish])
      .safeParse(await jsonBody(r, 2048));
    if (!parsed.success)
      return response(
        { error: "Choose a supported original file up to 100 MiB." },
        400,
      );
    const b = parsed.data;
    if (b.action === "prepare") {
      if (b.purpose === "resume" && b.type !== "application/pdf")
        return response({ error: "Your resume must be a PDF." }, 400);
      if (await limited(r, "r2-upload", 20, 3600))
        return response(
          { error: "Upload request limit reached. Retry later." },
          429,
        );
      const id = crypto.randomUUID(),
        created = new Date().toISOString();
      const url = await r2UploadUrl(id, b.type, b.sha256);
      await store.set("uploads", id, {
        ...b,
        id,
        status: "pending",
        created,
        expires: Date.now() + 1200000,
      });
      return response({
        id,
        uploadUrl: url,
        headers: { "Content-Type": b.type, "x-amz-meta-sha256": b.sha256 },
      });
    }
    const pending = await store.atomic("uploads", b.id, (old) => {
      if (
        !old ||
        old.status === "completed" ||
        Number(old.expires) < Date.now() ||
        (old.status === "processing" && Number(old.lease) > Date.now())
      )
        return null;
      return {
        data: { ...old, status: "processing", lease: Date.now() + 300000 },
        result: old,
      };
    });
    if (!pending)
      return response(
        {
          error:
            "Upload expired, is already complete, or is being verified. Try a fresh upload.",
        },
        409,
      );
    claimed = b.id;
    await r2VerifyAndPromote(b.id, {
      size: Number(pending.size),
      type: String(pending.type),
      sha256: String(pending.sha256),
    });
    const accepted = await store.atomic("storage_usage", "main", (old) => {
      const bytes = Number(old?.bytes || 0) + Number(pending.size);
      if (bytes > 9_000_000_000) return null;
      return {
        data: { bytes },
        result: true,
        extra: [
          {
            collection: "media",
            id: b.id,
            data: {
              id: b.id,
              name: String(pending.name),
              type: String(pending.type),
              size: Number(pending.size),
              sha256: String(pending.sha256),
              storage: "r2",
              created: String(pending.created),
            },
          },
          {
            collection: "uploads",
            id: b.id,
            data: { ...pending, status: "completed" } as RecordData,
          },
        ],
      };
    });
    if (!accepted) {
      await r2Remove(`media/${b.id}`);
      throw Error(
        "The app's 9 GB managed-file limit has been reached. Remove unused files before uploading.",
      );
    }
    claimed = undefined;
    return response({
      id: b.id,
      url: `/api/media/${b.id}`,
      name: pending.name,
    });
  } catch (error) {
    if (claimed) {
      // An uncertain commit must not delete a file that is already referenced.
      try {
        const committed = await store.get("media", claimed);
        if (!committed) await r2Remove(`media/${claimed}`).catch(() => {});
        await store
          .patch("uploads", claimed, {
            status: committed ? "completed" : "failed",
          })
          .catch(() => {});
      } catch {
        /* Preserve files if the commit outcome cannot be checked. */
      }
    }
    return (
      requestFailure(error) ||
      response(
        {
          error:
            error instanceof Error && error.message.includes("9 GB")
              ? error.message
              : "R2 upload verification failed. Check the credentials/CORS setup or retry the original file.",
        },
        503,
      )
    );
  }
}
