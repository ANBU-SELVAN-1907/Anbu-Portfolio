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
await compile("lib/media.ts", "media-limits.mjs");
await compile("lib/hero-story.ts", "hero-story.mjs");
await compile("lib/firebase.ts", "firebase.mjs", {
  '"./env"': '"./env.mjs"',
  '"./media"': '"./media-limits.mjs"',
});
await compile("lib/content.ts", "content.mjs");
await compile("lib/editorial.ts", "editorial.mjs", {
  '"./content"': '"./content.mjs"',
  '"./hero-story"': '"./hero-story.mjs"',
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
  '"./media"': '"./media-limits.mjs"',
  '"./editorial"': '"./editorial.mjs"',
  '"./firebase"': '"./firebase.mjs"',
  '"./firebase-auth"': '"./auth.mjs"',
});
await compile("app/api/admin/route.ts", "admin.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/validation"': '"./validation.mjs"',
});
await compile("lib/public-media.ts", "public-media.mjs");
await compile("app/api/auth/email/route.ts", "email.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/firebase"': '"./firebase.mjs"',
});
await compile("lib/pdf.ts", "pdf.mjs");
await compile("app/api/resume/route.ts", "resume.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/pdf"': '"./pdf.mjs"',
});
await compile("app/api/media/route.ts", "media.mjs", {
  '"@/lib/media"': '"./media-limits.mjs"',
  '"@/lib/server"': '"./server.mjs"',
});
await compile("app/api/contact/route.ts", "contact.mjs", {
  '"@/lib/server"': '"./server.mjs"',
});
await compile("app/api/analytics/route.ts", "analytics.mjs", {
  '"@/lib/server"': '"./server.mjs"',
});

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
  if (u.hostname === "identitytoolkit.googleapis.com") {
    assert.equal(body.email, "anbu.t80555@gmail.com");
    assert.equal(body.requestType, "EMAIL_SIGNIN");
    assert.equal(body.continueUrl, "https://example.test/admin");
    assert.equal(body.canHandleCodeInApp, true);
    return Response.json({ email: body.email });
  }
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
    firebaseBucket.put("large", new Uint8Array(4194305), {
      httpMetadata: { contentType: "image/png" },
    }),
  );
  const original = new Uint8Array(
    await fs.readFile("public/hero-frames/01-eye.png"),
  );
  await firebaseBucket.put("original", original, {
    httpMetadata: { contentType: "image/png" },
  });
  assert.deepEqual((await firebaseBucket.get("original")).body, original);
  const chunkPath =
    "projects/test-project/databases/(default)/documents/portfolio_file_chunks/original:";
  const chunk = records.get(chunkPath + "0");
  const saved = chunk.fields.body.stringValue;
  chunk.fields.body.stringValue = "AAAA";
  await assert.rejects(() => firebaseBucket.get("original"));
  chunk.fields.body.stringValue = saved;
  await firebaseBucket.delete("original");
  assert.equal(await firebaseBucket.get("original"), null);
  assert.equal(
    [...records.keys()].filter((x) => x.startsWith(chunkPath)).length,
    0,
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
  for (const body of [
    null,
    [],
    { action: "unknown" },
    { action: "read", id: "../private" },
    { action: "publish", revision: -1 },
    { action: "publish", revision: 0, injected: true },
  ])
    assert.equal((await call(body)).status, 400);
  const malformed = (body) =>
    POST(
      new Request("https://example.test/api/admin", {
        method: "POST",
        headers: { Origin: "https://example.test" },
        body,
      }),
    );
  assert.equal((await malformed("{")).status, 400);
  assert.equal((await malformed("x".repeat(250001))).status, 413);
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
  assert.equal(
    state.published.settings.lastUpdated,
    new Date().toISOString().slice(0, 10),
  );
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

  content.experience[0].media = "/api/media/proof";
  assert.equal(isPublishedMedia(content, "proof"), true);
  content.experience[0].visible = false;
  assert.equal(isPublishedMedia(content, "proof"), false);
  content.experience[0].visible = true;
  content.sections.experience = false;
  assert.equal(isPublishedMedia(content, "proof"), false);

  content.settings.introEnabled = "on";
  content.settings.introFrames =
    "/api/media/intro-frame\n/hero-frames/11-finishing-pose.png";
  assert.equal(isPublishedMedia(content, "intro-frame"), true);
  content.settings.introEnabled = "off";
  assert.equal(isPublishedMedia(content, "intro-frame"), false);

  const { POST: sendEmail } = await import(
    pathToFileURL(path.join(out, "email.mjs"))
  );
  const send = async (
    email = "anbu.t80555@gmail.com",
    origin = "https://example.test",
  ) =>
    sendEmail(
      new Request("https://example.test/api/auth/email", {
        method: "POST",
        headers: { Origin: origin },
        body: JSON.stringify({ email }),
      }),
    );
  assert.equal((await send("other@example.test")).status, 403);
  assert.equal((await send(undefined, "https://other.example")).status, 403);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429);
  console.log(
    "Owner-only email link sending, exact callback origin and resend limits passed (mock Firebase delivery).",
  );
  const { GET: downloadResume } = await import(
    pathToFileURL(path.join(out, "resume.mjs"))
  );
  const { POST: uploadMedia } = await import(
    pathToFileURL(path.join(out, "media.mjs"))
  );
  assert.equal(
    (
      await uploadMedia(
        new Request("https://example.test/api/media", {
          method: "POST",
          headers: {
            Origin: "https://example.test",
            "Content-Type": "multipart/form-data; boundary=test",
          },
          body: "x".repeat(4259841),
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await uploadMedia(
        new Request("https://example.test/api/media", {
          method: "POST",
          headers: {
            Origin: "https://example.test",
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
      )
    ).status,
    400,
  );
  const originalBytes = new TextEncoder().encode(
    "%PDF-1.4\nUploaded resume byte-for-byte test\n%%EOF",
  );
  const upload = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "resume");
    return uploadMedia(
      new Request("https://example.test/api/media", {
        method: "POST",
        headers: { Origin: "https://example.test" },
        body: form,
      }),
    );
  };
  assert.equal(
    (await upload(new File(["wrong"], "test.png", { type: "image/png" })))
      .status,
    400,
  );
  const uploaded = await upload(
    new File([originalBytes], "My-resume.pdf", { type: "application/pdf" }),
  );
  assert.equal(uploaded.status, 200);
  const info = await uploaded.json();
  state = await (await GET()).json();
  const resumeContent = structuredClone(state.draft);
  resumeContent.profile.resume = info.url;
  assert.equal(
    (
      await call({
        action: "save",
        content: resumeContent,
        revision: state.revision,
      })
    ).status,
    200,
  );
  const publicBefore = await downloadResume(
    new Request("https://example.test/api/resume"),
  );
  assert.notDeepEqual(
    new Uint8Array(await publicBefore.arrayBuffer()),
    originalBytes,
  );
  const draftPdf = await downloadResume(
    new Request("https://example.test/api/resume?preview=1"),
  );
  assert.deepEqual(new Uint8Array(await draftPdf.arrayBuffer()), originalBytes);
  setAllowed(false);
  assert.equal(
    (
      await downloadResume(
        new Request("https://example.test/api/resume?preview=1"),
      )
    ).status,
    403,
  );
  setAllowed(true);
  state = await (await GET()).json();
  assert.equal(
    (await call({ action: "publish", revision: state.revision })).status,
    200,
  );
  const result = await downloadResume(
    new Request("https://example.test/api/resume"),
  );
  assert.equal(result.status, 200);
  assert.ok(result.headers.get("content-disposition").includes("attachment"));
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), originalBytes);
  const { POST: contact } = await import(
    pathToFileURL(path.join(out, "contact.mjs"))
  );
  const sendContact = (body, origin = "https://example.test") =>
    contact(
      new Request("https://example.test/api/contact", {
        method: "POST",
        headers: { Origin: origin },
        body: JSON.stringify(body),
      }),
    );
  const inquiry = {
    name: "Candidate",
    email: "candidate@example.test",
    message: "A valid project inquiry for testing.",
  };
  assert.equal(
    (await sendContact(inquiry, "https://other.example")).status,
    403,
  );
  assert.equal((await sendContact(null)).status, 400);
  const beforeMessages = (await store.list("messages", 200)).length;
  assert.equal(
    (await sendContact({ ...inquiry, website: "spam.test" })).status,
    200,
  );
  assert.equal((await store.list("messages", 200)).length, beforeMessages);
  assert.equal((await sendContact(inquiry)).status, 200);
  assert.equal((await store.list("messages", 200)).length, beforeMessages + 1);
  state = await (await GET()).json();
  const hiddenContact = structuredClone(state.draft);
  hiddenContact.sections.contact = false;
  hiddenContact.settings.analytics = "off";
  assert.equal(
    (
      await call({
        action: "save",
        content: hiddenContact,
        revision: state.revision,
      })
    ).status,
    200,
  );
  state = await (await GET()).json();
  assert.equal(
    (await call({ action: "publish", revision: state.revision })).status,
    200,
  );
  assert.equal((await sendContact(inquiry)).status, 404);
  const { POST: analytics } = await import(
    pathToFileURL(path.join(out, "analytics.mjs"))
  );
  const previousCommits = commits;
  const metric = await analytics(
    new Request("https://example.test/api/analytics", {
      method: "POST",
      headers: {
        Origin: "https://example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "view", source: "test" }),
    }),
  );
  assert.equal(metric.status, 200);
  assert.equal(
    commits,
    previousCommits,
    "Disabled analytics must not write rate-limit records.",
  );
  console.log(
    "Malformed/oversized requests, strict operations, publish dates, contact origin checks, honeypot and disabled form enforcement passed.",
  );
  console.log(
    "Resume PDF upload, PDF-only enforcement, private draft preview, public isolation and byte-for-byte published download passed.",
  );
  console.log(
    "Firestore REST encoding, transactions/conflict retry, atomic limits, 4 MiB original files with chunk integrity, private media, admin draft/publish/restore, origin and stale-revision checks passed (mock transport).",
  );
  const { env: runtimeEnv } = await import(
    pathToFileURL(path.join(out, "env.mjs"))
  );
  const savedCredential = runtimeEnv.FIREBASE_SERVICE_ACCOUNT_JSON;
  async function freshHealth(suffix) {
    const runtime = await import(
      pathToFileURL(path.join(out, "firebase.mjs")) + "?health=" + suffix
    );
    return runtime.firebaseHealth();
  }
  runtimeEnv.FIREBASE_SERVICE_ACCOUNT_JSON = "malformed";
  let health = await freshHealth("invalid");
  assert.equal(health.ok, false);
  assert.match(health.message, /complete JSON/);
  runtimeEnv.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    ...JSON.parse(savedCredential),
    project_id: "wrong-project",
  });
  health = await freshHealth("mismatch");
  assert.equal(health.ok, false);
  assert.match(health.message, /different project/);
  runtimeEnv.FIREBASE_SERVICE_ACCOUNT_JSON = savedCredential;
  health = await freshHealth("valid");
  assert.equal(health.ok, true);
  const transport = globalThis.fetch;
  for (const [status, message, expected] of [
    [403, "permission denied", /Cloud Datastore User/],
    [404, "The database (default) does not exist", /Create the/],
    [429, "quota", /quota/],
  ]) {
    globalThis.fetch = async (url, init) =>
      new URL(url).hostname === "firestore.googleapis.com"
        ? Response.json({ error: { message } }, { status })
        : transport(url, init);
    health = await freshHealth(String(status));
    assert.equal(health.ok, false);
    assert.match(health.message, expected);
  }
  console.log(
    "Firebase readiness diagnoses malformed keys, project mismatch, IAM denial, missing database and quotas without exposing credentials.",
  );
} finally {
  globalThis.fetch = realFetch;
}
