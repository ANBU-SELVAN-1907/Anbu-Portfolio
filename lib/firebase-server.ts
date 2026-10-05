import { env } from "./env";
import type { Content } from "./content";
import { normalizeContent, newEditorialContent } from "./editorial";
import { firebaseBucket, firebaseReady, store } from "./firebase";
import { firebaseOwner } from "./firebase-auth";
export { store } from "./firebase";
export const bucket = () => firebaseBucket;
export const admin = firebaseOwner;
export async function snapshot() {
  const row = firebaseReady() ? await store.get("content", "main") : null;
  return row
    ? {
        draft: normalizeContent(JSON.parse(String(row.draft)) as Content),
        published: normalizeContent(
          JSON.parse(String(row.published)) as Content,
        ),
        revision: Number(row.revision),
        updated: String(row.updated),
      }
    : {
        draft: newEditorialContent(),
        published: newEditorialContent(),
        revision: 0,
        updated: "",
      };
}
export async function published() {
  return (await snapshot()).published;
}
export async function ensureContent() {
  const s = JSON.stringify(newEditorialContent());
  await store.atomic("content", "main", (old) =>
    old
      ? null
      : {
          data: {
            draft: s,
            published: s,
            revision: 0,
            updated: new Date().toISOString(),
          },
          result: true,
        },
  );
}
export function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(r: Request) {
  return r.headers.get("origin") === new URL(r.url).origin;
}
export async function boundedBytes(r: Request, max: number) {
  if (Number(r.headers.get("content-length")) > max)
    throw Error("Request too large.");
  const reader = r.body?.getReader();
  if (!reader) throw Error("Missing body.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.length;
    if (bytes > max) {
      await reader.cancel();
      throw Error("Request too large.");
    }
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.length;
  }
  return body;
}
export async function jsonBody(r: Request, max = 250000) {
  return JSON.parse(new TextDecoder().decode(await boundedBytes(r, max)));
}
export async function limited(
  r: Request,
  kind: string,
  max: number,
  seconds: number,
) {
  if (!firebaseReady()) throw Error("Firebase backend needs configuration.");
  const ip =
      env.VERCEL === "1"
        ? r.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim()
            .slice(0, 80) || "unknown"
        : "local",
    salt = env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + ":" + kind + ":" + salt),
  );
  const id = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const now = Math.floor(Date.now() / 1000),
    expires = (Math.floor(now / seconds) + 1) * seconds;
  return (
    (await store.atomic("limits", id, (old) => {
      const count =
        old && Number(old.expires) > now ? Number(old.count) + 1 : 1;
      return {
        data: { id, count, expires, created: new Date().toISOString() },
        result: count > max,
      };
    })) || false
  );
}
export async function track(
  kind: "views" | "contacts" | "resumes" | "attempts",
) {
  if ((await published()).settings.analytics !== "on" || !firebaseReady())
    return;
  const day = new Date().toISOString().slice(0, 10);
  await store.atomic("analytics", day, (old) => ({
    data: {
      ...(old || { day, views: 0, contacts: 0, resumes: 0, attempts: 0 }),
      [kind]: Number(old?.[kind] || 0) + 1,
    },
    result: true,
  }));
}
