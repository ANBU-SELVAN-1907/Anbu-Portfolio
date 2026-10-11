import {
  admin,
  store,
  snapshot,
  response,
  sameOrigin,
  jsonBody,
  requestFailure,
  limited,
} from "@/lib/server";
import { firebaseBucket } from "@/lib/firebase";
import {
  r2Ready,
  r2Backups,
  r2Put,
  r2Read,
  r2DownloadUrl,
  r2Remove,
} from "@/lib/r2";
import { createHash } from "node:crypto";
export const maxDuration = 300;
export async function GET(r: Request) {
  if (!(await admin()))
    return response({ error: "Admin sign-in required." }, 403);
  try {
    const download = new URL(r.url).searchParams.get("backup");
    if (download)
      return new Response(null, {
        status: 302,
        headers: {
          Location: await r2DownloadUrl(download),
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    if (!r2Ready())
      return response({
        ready: false,
        backups: [],
        legacyFiles: 0,
        message:
          "Add the four R2 environment variables in Vercel. See R2_SETUP.md.",
      });
    const [backups, media, usage] = await Promise.all([
      r2Backups(),
      store.list("media", 10000),
      store.get("storage_usage", "main"),
    ]);
    return response({
      ready: true,
      backups,
      legacyFiles: media.filter((x) => x.storage !== "r2").length,
      bytes: Number(usage?.bytes || 0),
      message:
        "R2 connected. Originals and backups stay private until explicitly published or downloaded by the owner.",
    });
  } catch {
    return response(
      {
        error:
          "R2 could not connect. Check the account ID, private credentials and bucket permissions.",
      },
      503,
    );
  }
}
export async function POST(r: Request) {
  let migration = false;
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    if (!r2Ready())
      return response({ error: "Configure R2 first. See R2_SETUP.md." }, 503);
    const b = await jsonBody(r, 512);
    if (b.action !== "backup" && b.action !== "migrate")
      return response({ error: "Choose backup or migrate." }, 400);
    if (await limited(r, "r2-maintenance", 10, 3600))
      return response(
        { error: "Maintenance limit reached. Retry later." },
        429,
      );
    if (b.action === "backup") {
      const backups = await r2Backups();
      if (backups.reduce((n, x) => n + x.size, 0) > 500_000_000)
        return response(
          {
            error:
              "Backups reached the 500 MB safety limit. Download/archive older backups in Cloudflare before creating more.",
          },
          409,
        );
      const [content, media, history, messages, analytics, sources] =
        await Promise.all([
          snapshot(),
          store.list("media", 10000),
          store.list("history", 20),
          store.list("messages", 10000),
          store.list("analytics", 10000, "day"),
          store.list("sources", 10000, "day"),
        ]);
      const created = new Date().toISOString(),
        objectKey = `backups/${created.replaceAll(":", "-")}-${crypto.randomUUID()}.json`;
      const bytes = new TextEncoder().encode(
        JSON.stringify(
          {
            schema: 1,
            created,
            content,
            media,
            history,
            messages,
            analytics,
            sources,
          },
          null,
          2,
        ),
      );
      if (bytes.length > 20_000_000)
        return response(
          {
            error:
              "This export exceeds 20 MB. Export collections in smaller batches.",
          },
          413,
        );
      await r2Put(objectKey, bytes, "application/json");
      return response({
        ok: true,
        message:
          "Private R2 backup created. It contains application data and references to original files.",
        url: `/api/storage?backup=${encodeURIComponent(objectKey)}`,
      });
    }
    const lock = await store.atomic("migration", "main", (old) =>
      Number(old?.lease || 0) > Date.now()
        ? null
        : { data: { lease: Date.now() + 300000 }, result: true },
    );
    if (!lock)
      return response({ error: "A migration batch is already running." }, 409);
    migration = true;
    const files = (await store.list("media", 10000)).filter(
      (x) => x.storage !== "r2",
    );
    let moved = 0;
    for (const row of files.slice(0, 10)) {
      const id = String(row.id),
        original = await firebaseBucket.get(id);
      if (!original) throw Error("Legacy file is missing.");
      const digest = await r2Put(
        `media/${id}`,
        original.body,
        original.httpMetadata.contentType,
      );
      const verified = await r2Read(`media/${id}`);
      if (createHash("sha256").update(verified.body).digest("hex") !== digest)
        throw Error("Migration integrity mismatch.");
      const accepted = await store.atomic("storage_usage", "main", (old) => {
        const bytes = Number(old?.bytes || 0) + original.body.length;
        return bytes > 9_000_000_000
          ? null
          : {
              data: { bytes },
              result: true,
              extra: [
                {
                  collection: "media",
                  id,
                  data: {
                    ...row,
                    size: original.body.length,
                    sha256: digest,
                    storage: "r2",
                  },
                },
              ],
            };
      });
      if (!accepted) {
        await r2Remove(`media/${id}`);
        throw Error("Managed storage limit reached.");
      }
      moved++;
    }
    return response({
      ok: true,
      message: `Moved ${moved} original files to R2. ${Math.max(0, files.length - moved)} remain. Legacy copies were preserved.`,
    });
  } catch (error) {
    return (
      requestFailure(error) ||
      response(
        {
          error:
            "Storage operation failed. Source files remain intact; check R2/Firebase setup before retrying.",
        },
        503,
      )
    );
  } finally {
    if (migration)
      await store.patch("migration", "main", { lease: 0 }).catch(() => {});
  }
}
