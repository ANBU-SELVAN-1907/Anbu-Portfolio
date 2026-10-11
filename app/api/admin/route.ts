import { z } from "zod";
import {
  requestFailure,
  admin,
  store,
  snapshot,
  ensureContent,
  response,
  sameOrigin,
  jsonBody,
} from "@/lib/server";
import { contentSchema } from "@/lib/validation";
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const id = z.string().uuid();
const operation = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("save"), revision, content: contentSchema })
    .strict(),
  z.object({ action: z.literal("publish"), revision }).strict(),
  z.object({ action: z.literal("restore"), revision, id }).strict(),
  z.object({ action: z.literal("read"), id }).strict(),
  z.object({ action: z.literal("delete-message"), id }).strict(),
]);
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!(await admin()))
      return response({ error: "Admin sign-in required." }, 403);
    const s = await snapshot();
    const [messages, media, history, analytics, sourceRows] = await Promise.all(
      [
        store.list("messages", 200),
        store.list("media", 300),
        store.list("history", 20),
        store.list("analytics", 30, "day"),
        store.list("sources", 500, "day"),
      ],
    );
    const cutoff = new Date(Date.now() - 29 * 86400000)
        .toISOString()
        .slice(0, 10),
      totals: Record<string, number> = {};
    for (const x of sourceRows)
      if (String(x.day) >= cutoff)
        totals[String(x.source)] =
          (totals[String(x.source)] || 0) + Number(x.views);
    const sources = Object.entries(totals)
      .map(([source, views]) => ({ source, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
    return response({
      ...s,
      messages,
      media,
      history: history.map(({ id, created }) => ({ id, created })),
      analytics,
      sources,
    });
  } catch {
    return response(
      {
        error:
          "Could not load the studio. Check Firebase configuration or retry.",
      },
      503,
    );
  }
}
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r) || !(await admin()))
      return response({ error: "Admin authorization required." }, 403);
    const parsed = operation.safeParse(await jsonBody(r));
    if (!parsed.success)
      return response(
        {
          error: parsed.error.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        },
        400,
      );
    const b = parsed.data;
    if (
      b.action === "save" ||
      b.action === "publish" ||
      b.action === "restore"
    ) {
      await ensureContent();
      if (!Number.isInteger(b.revision) || b.revision < 0)
        return response({ error: "Invalid content revision." }, 400);
      let payload = "";
      if (b.action === "save") {
        const result = contentSchema.safeParse(b.content);
        if (!result.success)
          return response(
            {
              error: result.error.issues
                .map((i) => i.path.join(".") + ": " + i.message)
                .join("; "),
            },
            400,
          );
        payload = JSON.stringify(result.data);
      }
      if (b.action === "restore") {
        const saved = await store.get("history", String(b.id));
        if (!saved) return response({ error: "Version not found." }, 404);
        const restored = contentSchema.safeParse(
          JSON.parse(String(saved.payload)),
        );
        if (!restored.success)
          return response(
            {
              error:
                "That saved version has an incompatible format. Export it before migrating.",
            },
            400,
          );
        payload = JSON.stringify(restored.data);
      }
      const created = new Date().toISOString(),
        id = crypto.randomUUID();
      const row = await store.atomic("content", "main", (old) => {
        if (!old || Number(old.revision) !== b.revision) return null;
        const revision = Number(old.revision) + 1;
        const data = {
          ...old,
          revision,
          updated: created,
          ...(b.action === "publish"
            ? {
                published: JSON.stringify({
                  ...contentSchema.parse(JSON.parse(String(old.draft))),
                  settings: {
                    ...contentSchema.parse(JSON.parse(String(old.draft)))
                      .settings,
                    lastUpdated: created.slice(0, 10),
                  },
                }),
              }
            : { draft: payload }),
        };
        return {
          data,
          result: {
            revision,
            updated: created,
            restored: b.action === "restore",
          },
          extra:
            b.action === "publish"
              ? [
                  {
                    collection: "history",
                    id,
                    data: { id, payload: String(old.draft), created },
                  },
                ]
              : [],
        };
      });
      if (!row)
        return response(
          {
            error:
              "Content changed in another tab. Reload before saving or publishing.",
          },
          409,
        );
      if (b.action === "publish") {
        const history = await store.list("history", 40).catch(() => []);
        await Promise.all(
          history.slice(20).map((x) => store.remove("history", String(x.id))),
        ).catch(() => {});
      }
      return response(row);
    }
    if (b.action === "read") {
      await store.patch("messages", String(b.id), { read: 1 });
      return response({ ok: true });
    }
    if (b.action === "delete-message") {
      await store.remove("messages", String(b.id));
      return response({ ok: true });
    }
    return response({ error: "Unknown operation." }, 400);
  } catch (e) {
    const failure = requestFailure(e);
    if (failure) return failure;
    return response(
      {
        error:
          "Your change could not be saved. Your input has been kept; please retry.",
      },
      503,
    );
  }
}
