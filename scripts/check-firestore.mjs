import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { generateKeyPair, exportPKCS8 } from "jose";
const out = path.resolve(".sites-runtime/firestore-tests");
await fs.mkdir(out, { recursive: true });
const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const env = {
  FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_API_KEY: "test-key",
  FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  FIREBASE_APP_ID: "test-app",
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "test@test-project.iam.gserviceaccount.com",
    project_id: "test-project",
    private_key: await exportPKCS8(privateKey),
  }),
};
await fs.writeFile(
  path.join(out, "env.mjs"),
  "export const env=" + JSON.stringify(env) + ";",
);
async function compile(file, target, replacements = {}) {
  let s = await fs.readFile(file, "utf8");
  for (const [a, b] of Object.entries(replacements)) s = s.replaceAll(a, b);
  await fs.writeFile(
    path.join(out, target),
    ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  );
}
await compile("lib/firebase.ts", "firebase.mjs", {
  '"./env"': '"./env.mjs"',
});
await compile("lib/content.ts", "content.mjs");
await compile("lib/editorial.ts", "editorial.mjs", {
  '"./content"': '"./content.mjs"',
});
await compile("lib/validation.ts", "validation.mjs", {
  '"./editorial"': '"./editorial.mjs"',
});
await fs.writeFile(
  path.join(out, "auth.mjs"),
  'export let allowed=true;export function setAllowed(v){allowed=v;}export async function firebaseOwner(){return allowed ? {email:"owner@example.test"}:null;}',
);
await compile("lib/firebase-server.ts", "server.mjs", {
  '"./env"': '"./env.mjs"',
  '"./editorial"': '"./editorial.mjs"',
  '"./firebase"': '"./firebase.mjs"',
  '"./firebase-auth"': '"./auth.mjs"',
});
await compile("app/api/admin/route.ts", "admin.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/validation"': '"./validation.mjs"',
});
await compile("lib/public-media.ts", "public-media.mjs");
const records = new Map();
let conflicts = 0,
  commits = 0,
  rollbacks = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url),
    body = init.body
      ? JSON.parse(String(init.body).startsWith("{") ? init.body : "{}")
      : {};
  if (u.hostname === "oauth2.googleapis.com")
    return Response.json({ access_token: "test-token", expires_in: 3600 });
  assert.equal(u.hostname, "firestore.googleapis.com");
  assert.equal(init.headers.Authorization, "Bearer test-token");
  if (u.pathname.endsWith(":beginTransaction"))
    return Response.json({ transaction: "test-transaction" });
  if (u.pathname.endsWith(":rollback")) {
    rollbacks++;
    return Response.json({});
  }
  if (u.pathname.endsWith(":commit")) {
    commits++;
    if (conflicts-- > 0)
      return Response.json({ error: "conflict" }, { status: 409 });
    for (const w of body.writes) records.set(w.update.name, w.update);
    return Response.json({ commitTime: new Date().toISOString() });
  }
  if (u.pathname.endsWith(":runQuery")) {
    const q = body.structuredQuery,
      rows = [...records.values()].filter((x) =>
        x.name.includes("/" + q.from[0].collectionId + "/"),
      );
    rows.sort((a, b) =>
      String(
        b.fields[q.orderBy[0].field.fieldPath]?.stringValue || "",
      ).localeCompare(
        String(a.fields[q.orderBy[0].field.fieldPath]?.stringValue || ""),
      ),
    );
    return Response.json(
      rows.slice(0, q.limit).map((document) => ({ document })),
    );
  }
  const name = decodeURIComponent(u.pathname.replace("/v1/", ""));
  if (init.method === "PATCH") {
    const old = records.get(name);
    const fields = u.searchParams.has("updateMask.fieldPaths")
      ? { ...old?.fields, ...body.fields }
      : body.fields;
    const doc = { name, fields };
    records.set(name, doc);
    return Response.json(doc);
  }
  if (init.method === "DELETE") {
    records.delete(name);
    return new Response(null, { status: 204 });
  }
  return records.has(name)
    ? Response.json(records.get(name))
    : Response.json({}, { status: 404 });
};
try {
  const { store, firebaseBucket, firebaseReady } = await import(
    pathToFileURL(path.join(out, "firebase.mjs"))
  );
  assert.ok(firebaseReady());
  await store.set("test", "a:1", {
    string: "hello",
    number: 7,
    bool: false,
    empty: null,
  });
  assert.deepEqual(await store.get("test", "a:1"), {
    string: "hello",
    number: 7,
    bool: false,
    empty: null,
  });
  await store.patch("test", "a:1", { number: 8 });
  assert.equal((await store.get("test", "a:1")).string, "hello");
  assert.equal(await store.get("test", "missing"), null);
  await assert.rejects(() => store.get("test", "../../escape"));
  conflicts = 1;
  assert.equal(
    await store.atomic("test", "a:1", (d) => ({
      data: { ...d, number: Number(d.number) + 1 },
      result: "ok",
      extra: [{ collection: "test", id: "b", data: { created: "now" } }],
    })),
    "ok",
  );
  assert.equal((await store.get("test", "a:1")).number, 9);
  assert.ok(rollbacks);
  assert.ok(await store.get("test", "b"));
  assert.equal(await store.atomic("test", "a:1", () => null), null);
  const bytes = new Uint8Array(524288);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  await firebaseBucket.put("file", bytes, {
    httpMetadata: { contentType: "image/png" },
  });
  assert.deepEqual((await firebaseBucket.get("file")).body, bytes);
  assert.ok(
    records.get(
      "projects/test-project/databases/(default)/documents/portfolio_files/file",
    ).fields.body.stringValue.length < 1048487,
  );
  await assert.rejects(() =>
    firebaseBucket.put("large", new Uint8Array(524289), {
      httpMetadata: { contentType: "image/png" },
    }),
  );
  await firebaseBucket.delete("file");
  assert.equal(await firebaseBucket.get("file"), null);
  const { limited, boundedBytes } = await import(
    pathToFileURL(path.join(out, "server.mjs"))
  );
  const request = new Request("https://example.test/api", {
    headers: { "cf-connecting-ip": "192.0.2.1" },
  });
  assert.equal(await limited(request, "test", 1, 3600), false);
  assert.equal(await limited(request, "test", 1, 3600), true);
  await assert.rejects(() =>
    boundedBytes(
      new Request("https://example.test", {
        method: "POST",
        body: "oversized",
      }),
      2,
    ),
  );
  const { GET, POST } = await import(
      pathToFileURL(path.join(out, "admin.mjs"))
    ),
    { setAllowed } = await import(pathToFileURL(path.join(out, "auth.mjs")));
  setAllowed(false);
  assert.equal((await GET()).status, 403);
  setAllowed(true);
  const call = async (body, origin = "https://example.test") =>
    POST(
      new Request("https://example.test/api/admin", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  let state = await (await GET()).json();
  const content = structuredClone(state.draft);
  content.profile.intro = "Test draft, never deployed.";
  assert.equal(
    (
      await call(
        { action: "save", content, revision: 0 },
        "https://other.example",
      )
    ).status,
    403,
  );
  const bad = structuredClone(content);
  bad.profile.github = "javascript:alert(1)";
  assert.equal(
    (await call({ action: "save", content: bad, revision: 0 })).status,
    400,
  );
  assert.equal(
    (await call({ action: "save", content, revision: 0 })).status,
    200,
  );
  state = await (await GET()).json();
  assert.equal(state.draft.profile.intro, content.profile.intro);
  assert.notEqual(state.published.profile.intro, content.profile.intro);
  assert.equal(
    (await call({ action: "save", content, revision: 0 })).status,
    409,
  );
  assert.equal((await call({ action: "publish", revision: 1 })).status, 200);
  state = await (await GET()).json();
  assert.equal(state.published.profile.intro, content.profile.intro);
  assert.equal(state.history.length, 1);
  assert.equal(
    (await call({ action: "restore", id: state.history[0].id, revision: 2 }))
      .status,
    200,
  );
  const { isPublishedMedia } = await import(
    pathToFileURL(path.join(out, "public-media.mjs"))
  );
  content.gallery = [
    {
      ...content.projects[0],
      id: "g",
      image: "/api/media/file",
      visible: false,
    },
  ];
  assert.equal(isPublishedMedia(content, "file"), false);
  content.gallery[0].visible = true;
  assert.equal(isPublishedMedia(content, "file"), true);
  content.sections.gallery = false;
  assert.equal(isPublishedMedia(content, "file"), false);
  console.log(
    "Firestore REST encoding, transactions/conflict retry, atomic limits, 512 KiB files, private media, admin draft/publish/restore, origin and stale-revision checks passed (mock transport).",
  );
} finally {
  globalThis.fetch = realFetch;
}
