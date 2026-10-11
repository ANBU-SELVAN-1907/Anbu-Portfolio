import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import ts from "typescript";

// Real presigner and application code; cloud transports are isolated in memory.
// No real keys, accounts, uploads or private portfolio content are used.
const out = path.resolve(".sites-runtime/r2-tests");
await fs.mkdir(out, { recursive: true });
async function compile(source, target, replacements = {}) {
  let code = await fs.readFile(source, "utf8");
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(from, to);
  await fs.writeFile(
    path.join(out, target),
    ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  );
}
const load = (name) => import(pathToFileURL(path.join(out, name)).href);
await fs.writeFile(
  path.join(out, "env.mjs"),
  `export const env={R2_ACCOUNT_ID:"${"0".repeat(32)}",R2_BUCKET_NAME:"test-private-files",R2_ACCESS_KEY_ID:"test-only-id",R2_SECRET_ACCESS_KEY:"test-only-secret"};`,
);
await compile("lib/media.ts", "media.mjs");
await compile("lib/r2.ts", "r2.mjs", {
  '"./env"': '"./env.mjs"',
  '"./media"': '"./media.mjs"',
});
await fs.writeFile(
  path.join(out, "firebase.mjs"),
  `
export const records=new Map(), legacy=new Map();
export let failAck=false, failReads=false;
export function failure(ack,reads){failAck=ack;failReads=reads;}
export const store={
  async get(c,id){if(failReads)throw Error("transport unavailable");return records.get(c+"/"+id)||null;},
  async set(c,id,d){records.set(c+"/"+id,{...d});},
  async patch(c,id,d){records.set(c+"/"+id,{...(records.get(c+"/"+id)||{}),...d});},
  async remove(c,id){records.delete(c+"/"+id);},
  async list(c){return [...records].filter(([k])=>k.startsWith(c+"/")).map(([,v])=>v);},
  async atomic(c,id,change){const x=change(records.get(c+"/"+id)||null);if(!x)return null;
    records.set(c+"/"+id,x.data);for(const e of x.extra||[])records.set(e.collection+"/"+e.id,e.data);
    if(failAck&&c==="storage_usage")throw Error("uncertain acknowledgement");return x.result;}
};
export const firebaseBucket={async get(id){return legacy.get(id)||null;},async delete(id){legacy.delete(id);}};
`,
);
await compile("lib/storage.ts", "storage.mjs", {
  '"./firebase"': '"./firebase.mjs"',
  '"./r2"': '"./r2.mjs"',
});
await fs.writeFile(
  path.join(out, "server.mjs"),
  `
import {store} from "./firebase.mjs";import {fileBucket} from "./storage.mjs";
export {store};export let allowed=true;
export const content={profile:{photo:"",resume:""},settings:{},sections:{gallery:true},gallery:[]};
export function owner(value){allowed=value;}
export async function admin(){return allowed?{email:"owner@example.test"}:null;}
export function sameOrigin(r){return r.headers.get("origin")===new URL(r.url).origin;}
export const response=(data,status=200)=>Response.json(data,{status});
export async function jsonBody(r){return r.json();}
export function requestFailure(){return null;}
export async function limited(){return false;}
export const bucket=()=>fileBucket;
export async function published(){return content;}
export async function snapshot(){return {draft:content,published:content};}
`,
);
await compile("lib/public-media.ts", "public-media.mjs");
await compile("app/api/media/upload/route.ts", "upload.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/media"': '"./media.mjs"',
  '"@/lib/r2"': '"./r2.mjs"',
});
await compile("app/api/media/[id]/route.ts", "download.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/public-media"': '"./public-media.mjs"',
  '"@/lib/storage"': '"./storage.mjs"',
});
await compile("app/api/storage/route.ts", "maintenance.mjs", {
  '"@/lib/server"': '"./server.mjs"',
  '"@/lib/firebase"': '"./firebase.mjs"',
  '"@/lib/r2"': '"./r2.mjs"',
});
const objects = new Map();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function put(key, bytes, type, sha256 = digest(bytes)) {
  objects.set(key, {
    bytes: Uint8Array.from(bytes),
    type,
    sha256,
    etag: '"' + digest(bytes) + '"',
  });
}
const originalSend = S3Client.prototype.send;
let copyRace = false;
S3Client.prototype.send = async function (command) {
  const x = command.input,
    name = command.constructor.name,
    row = objects.get(x.Key);
  if (name === "PutObjectCommand") {
    put(x.Key, x.Body, x.ContentType, x.Metadata.sha256);
    return {};
  }
  if (name === "DeleteObjectCommand") {
    objects.delete(x.Key);
    return {};
  }
  if (name === "ListObjectsV2Command")
    return {
      Contents: [...objects]
        .filter(([k]) => k.startsWith(x.Prefix))
        .map(([Key, v]) => ({
          Key,
          Size: v.bytes.length,
          LastModified: new Date(),
        })),
    };
  if (name === "CopyObjectCommand") {
    const source = objects.get(x.CopySource.slice(x.Bucket.length + 1));
    if (copyRace || !source || source.etag !== x.CopySourceIfMatch)
      throw Error("PreconditionFailed");
    put(x.Key, source.bytes, x.ContentType, x.Metadata.sha256);
    return {};
  }
  if (!row) throw Error("NoSuchKey");
  if (name === "HeadObjectCommand")
    return {
      ContentLength: row.bytes.length,
      ContentType: row.type,
      Metadata: { sha256: row.sha256 },
      ETag: row.etag,
    };
  if (name === "GetObjectCommand") {
    if (x.IfMatch && row.etag !== x.IfMatch) throw Error("PreconditionFailed");
    const body = Readable.from([row.bytes.slice(0, 3), row.bytes.slice(3)]);
    body.transformToByteArray = async () => Uint8Array.from(row.bytes);
    return { Body: body, ContentType: row.type };
  }
  throw Error("Unexpected command " + name);
};
try {
  const r2 = await load("r2.mjs"),
    upload = await load("upload.mjs"),
    download = await load("download.mjs"),
    maintenance = await load("maintenance.mjs");
  const server = await load("server.mjs"),
    db = await load("firebase.mjs"),
    { env } = await load("env.mjs");
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  const request = (body, origin = "https://portfolio.test") =>
    new Request("https://portfolio.test/api/media/upload", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const reservation = {
    action: "prepare",
    name: "original.png",
    type: "image/png",
    size: png.length,
    sha256: digest(png),
  };
  assert.equal(
    (await upload.POST(request(reservation, "https://foreign.test"))).status,
    403,
  );
  server.owner(false);
  assert.equal((await upload.POST(request(reservation))).status, 403);
  assert.equal(
    (await maintenance.GET(new Request("https://portfolio.test/api/storage")))
      .status,
    403,
  );
  server.owner(true);
  assert.equal(
    (
      await upload.POST(
        request({ ...reservation, size: 100 * 1024 * 1024 + 1 }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await upload.POST(request({ ...reservation, purpose: "resume" }))).status,
    400,
  );
  assert.equal(
    (await upload.POST(request({ ...reservation, type: "text/html" }))).status,
    400,
  );
  const preparedResponse = await upload.POST(request(reservation));
  assert.equal(preparedResponse.status, 200);
  const prepared = await preparedResponse.json(),
    signed = new URL(prepared.uploadUrl);
  assert.equal(
    signed.hostname,
    env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  );
  assert.equal(signed.searchParams.get("X-Amz-Expires"), "300");
  assert.ok(
    signed.searchParams.get("X-Amz-SignedHeaders").includes("content-type"),
  );
  assert.ok(
    signed.searchParams
      .get("X-Amz-SignedHeaders")
      .includes("x-amz-meta-sha256"),
  );
  assert.equal(prepared.headers["x-amz-meta-sha256"], digest(png));
  put("incoming/" + prepared.id, png, "image/png");
  assert.equal(
    (await upload.POST(request({ action: "finish", id: prepared.id }))).status,
    200,
  );
  assert.deepEqual(objects.get("media/" + prepared.id).bytes, png);
  assert.equal(db.records.get("media/" + prepared.id).storage, "r2");
  assert.equal(db.records.get("storage_usage/main").bytes, png.length);
  assert.equal(
    (await upload.POST(request({ action: "finish", id: prepared.id }))).status,
    409,
  );
  put("incoming/" + prepared.id, new Uint8Array([0]), "image/png");
  assert.deepEqual(
    objects.get("media/" + prepared.id).bytes,
    png,
    "Replayed PUT cannot mutate the published key",
  );

  const invalid = randomUUID();
  put(
    "incoming/" + invalid,
    new Uint8Array(png.length),
    "image/png",
    digest(png),
  );
  await assert.rejects(
    r2.r2VerifyAndPromote(invalid, {
      size: png.length,
      type: "image/png",
      sha256: digest(png),
    }),
    /integrity/,
  );
  assert.equal(objects.has("media/" + invalid), false);
  put("incoming/" + invalid, png, "image/png");
  copyRace = true;
  await assert.rejects(
    r2.r2VerifyAndPromote(invalid, {
      size: png.length,
      type: "image/png",
      sha256: digest(png),
    }),
    /PreconditionFailed/,
  );
  copyRace = false;
  await assert.rejects(r2.r2DownloadUrl("backups/../../secret"), /Invalid/);

  server.owner(false);
  const get = (id, suffix = "") =>
    download.GET(
      new Request("https://portfolio.test/api/media/" + id + suffix),
      { params: Promise.resolve({ id }) },
    );
  assert.equal((await get(prepared.id)).status, 404, "Draft file is private");
  server.content.gallery = [
    { visible: true, media: "/api/media/" + prepared.id },
  ];
  const publicDownload = await get(prepared.id);
  assert.equal(publicDownload.status, 302);
  assert.equal(
    publicDownload.headers.get("Cache-Control"),
    "private, no-store",
  );
  assert.equal(
    new URL(publicDownload.headers.get("Location")).searchParams.get(
      "X-Amz-Expires",
    ),
    "60",
  );
  assert.equal(
    (await (await get(prepared.id, "?info=1")).json()).type,
    "image/png",
  );
  server.content.gallery[0].visible = false;
  assert.equal((await get(prepared.id)).status, 404);
  server.owner(true);
  const videoId = randomUUID();
  db.records.set("media/" + videoId, {
    id: videoId,
    storage: "r2",
    type: "video/mp4",
  });
  assert.equal(
    new URL((await get(videoId)).headers.get("Location")).searchParams.get(
      "X-Amz-Expires",
    ),
    "3600",
  );

  const capped = await (await upload.POST(request(reservation))).json();
  put("incoming/" + capped.id, png, "image/png");
  db.records.set("storage_usage/main", { bytes: 9_000_000_000 });
  assert.equal(
    (await upload.POST(request({ action: "finish", id: capped.id }))).status,
    503,
  );
  assert.equal(objects.has("media/" + capped.id), false);
  db.records.set("storage_usage/main", { bytes: png.length });
  const uncertain = await (await upload.POST(request(reservation))).json();
  put("incoming/" + uncertain.id, png, "image/png");
  db.failure(true, true);
  assert.equal(
    (await upload.POST(request({ action: "finish", id: uncertain.id }))).status,
    503,
  );
  assert.ok(
    objects.has("media/" + uncertain.id),
    "Unknown commit result must preserve original bytes",
  );
  db.failure(false, false);

  const legacyId = randomUUID();
  db.legacy.set(legacyId, {
    body: png,
    httpMetadata: { contentType: "image/png" },
  });
  db.records.set("media/" + legacyId, {
    id: legacyId,
    type: "image/png",
    size: png.length,
    created: new Date().toISOString(),
  });
  assert.equal(
    (await maintenance.POST(request({ action: "migrate" }))).status,
    200,
  );
  assert.equal(db.records.get("media/" + legacyId).storage, "r2");
  assert.deepEqual((await r2.r2Read("media/" + legacyId)).body, png);
  assert.ok(db.legacy.has(legacyId), "Migration preserves source copies");
  const backupResponse = await maintenance.POST(request({ action: "backup" }));
  assert.equal(backupResponse.status, 200);
  const backup = await backupResponse.json(),
    backupKey = new URL(backup.url, "https://portfolio.test").searchParams.get(
      "backup",
    );
  const exported = JSON.parse(
    Buffer.from(objects.get(backupKey).bytes).toString(),
  );
  assert.equal(exported.schema, 1);
  assert.ok(exported.content.draft);
  assert.equal(JSON.stringify(exported).includes("test-only-secret"), false);
  server.owner(false);
  assert.equal(
    (await maintenance.GET(new Request("https://portfolio.test" + backup.url)))
      .status,
    403,
  );
  server.owner(true);
  assert.equal(
    (await maintenance.GET(new Request("https://portfolio.test" + backup.url)))
      .status,
    302,
  );
  env.R2_SECRET_ACCESS_KEY = "";
  assert.equal((await upload.POST(request(reservation))).status, 503);
  console.log(
    "PASS: R2 signatures, original bytes, tamper/race rejection, upload authorization/limits, private publication, migration and private backups.",
  );
} finally {
  S3Client.prototype.send = originalSend;
}
