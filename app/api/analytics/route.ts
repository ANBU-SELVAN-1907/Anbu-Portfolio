import { z } from "zod";
import {
  store,
  published,
  response,
  sameOrigin,
  limited,
  track,
  jsonBody,
} from "@/lib/server";
const schema = z
  .object({
    event: z.enum(["view", "form_attempt"]).default("view"),
    source: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,40}$/)
      .default("direct"),
  })
  .strict();
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r)) return response({}, 403);
    if (await limited(r, "view", 60, 3600)) return response({}, 429);
    const b = schema.safeParse(
      r.headers.get("content-type")?.includes("application/json")
        ? await jsonBody(r, 1000)
        : {},
    );
    if (!b.success) return response({}, 400);
    if ((await published()).settings.analytics !== "on")
      return response({ ok: true });
    await track(b.data.event === "view" ? "views" : "attempts");
    if (b.data.event === "view") {
      const day = new Date().toISOString().slice(0, 10),
        source = b.data.source;
      const id = day + ":" + source;
      await store.atomic("sources", id, (old) => ({
        data: { id, day, source, views: Number(old?.views || 0) + 1 },
        result: true,
      }));
    }
    return response({ ok: true });
  } catch {
    return response({}, 503);
  }
}
