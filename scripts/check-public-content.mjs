import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const out = path.resolve(".sites-runtime/public-content-tests");
await fs.mkdir(out, { recursive: true });
async function compile(name, replacements = {}) {
  let source = await fs.readFile(`lib/${name}.ts`, "utf8");
  for (const [from, to] of Object.entries(replacements))
    source = source.replaceAll(from, to);
  await fs.writeFile(
    path.join(out, `${name}.mjs`),
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  );
}
await compile("content");
await compile("editorial", { '"./content"': '"./content.mjs"' });
await fs.writeFile(path.join(out, "env.mjs"), "export const env={};");
await fs.writeFile(
  path.join(out, "auth.mjs"),
  "export async function firebaseOwner(){return null;}",
);
await fs.writeFile(
  path.join(out, "firebase.mjs"),
  `export let configured=false,row=null,failure=null,reads=0;
export function setState(c,r=null,f=null){configured=c;row=r;failure=f;reads=0;}
export function firebaseReady(){return configured;}
export const firebaseBucket={};
export const store={async get(){reads++;if(failure)throw failure;return row;}};`,
);
await compile("firebase-server", {
  '"./env"': '"./env.mjs"',
  '"./editorial"': '"./editorial.mjs"',
  '"./firebase"': '"./firebase.mjs"',
  '"./firebase-auth"': '"./auth.mjs"',
});
const load = (name) => import(pathToFileURL(path.join(out, `${name}.mjs`)));
const { published, snapshot } = await load("firebase-server");
const { newEditorialContent } = await load("editorial");
const backend = await load("firebase");
const fallback = newEditorialContent();
const errors = [];
const originalLog = console.error;
console.error = (...args) => errors.push(args);
try {
  backend.setState(false);
  assert.deepEqual(await published(), fallback);
  assert.equal(backend.reads, 0);
  backend.setState(true);
  assert.deepEqual(await published(), fallback);
  const publicContent = structuredClone(fallback);
  publicContent.profile.intro = "Published content visible to visitors.";
  backend.setState(true, {
    published: JSON.stringify(publicContent),
    draft: "MALFORMED_PRIVATE_DRAFT_SENTINEL",
    revision: 1,
  });
  assert.deepEqual(await published(), publicContent);
  await assert.rejects(snapshot, SyntaxError);
  for (const [failure, reason] of [
    [
      new Error("Firebase configuration mismatch."),
      "firebase_project_mismatch",
    ],
    [new Error("Firebase request failed (403)."), "firestore_http_403"],
    [
      new Error("Firebase server authorization failed."),
      "service_account_authorization_failed",
    ],
    [new Error("PRIVATE_CREDENTIAL_SENTINEL"), "content_read_failed"],
  ]) {
    backend.setState(true, null, failure);
    assert.deepEqual(await published(), fallback);
    assert.equal(errors.at(-1)[1].reason, reason);
    await assert.rejects(snapshot, failure);
  }
  backend.setState(true, {
    published: "MALFORMED_PRIVATE_PUBLISHED_SENTINEL",
    draft: JSON.stringify(publicContent),
  });
  assert.deepEqual(await published(), fallback);
  assert.equal(errors.at(-1)[1].reason, "invalid_json");
  assert.ok(!JSON.stringify(errors).includes("PRIVATE_"));
  await assert.rejects(snapshot, SyntaxError);
} finally {
  console.error = originalLog;
}
console.log(
  "Public content survives Firebase outages and project mismatches; drafts remain private and admin reads stay strict.",
);
