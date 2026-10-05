import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
const out = path.resolve(".sites-runtime/firebase-tests");
await fs.mkdir(out, { recursive: true });
const config = {
  apiKey: "test-public-key",
  authDomain: "test.firebaseapp.com",
  projectId: "test-project",
  appId: "test-app",
};
await fs.writeFile(
  path.join(out, "env.mjs"),
  'export const env={FIREBASE_PROJECT_ID:"test-project",FIREBASE_API_KEY:"test-public-key",FIREBASE_SERVICE_ACCOUNT_JSON:"test"};',
);
await fs.writeFile(
  path.join(out, "headers.mjs"),
  "export async function cookies(){return {get(){return undefined;}}}",
);
await fs.writeFile(
  path.join(out, "firebase.mjs"),
  `export function firebaseConfig(){return ${JSON.stringify(config)}};export function firebaseReady(){return true};let bound;export const store={async get(){return bound || null},async atomic(c,id,change){const next=change(bound || null);if (!next)return null;bound=next.data;return next.result}};`,
);
let source = await fs.readFile("lib/firebase-auth.ts", "utf8");
source = source
  .replace('"./env"', '"./env.mjs"')
  .replace('"next/headers"', '"./headers.mjs"')
  .replace('"./firebase"', '"./firebase.mjs"');
await fs.writeFile(
  path.join(out, "auth.mjs"),
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText,
);
const { publicKey, privateKey } = await generateKeyPair("RS256"),
  jwk = await exportJWK(publicKey);
jwk.kid = "test-kid";
jwk.alg = "RS256";
let disabled = false,
  validSince = 0;
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes("service_accounts/v1/jwk/"))
    return Response.json({ keys: [jwk] });
  if (String(url).includes("accounts:lookup"))
    return Response.json({
      users: [
        {
          localId: "owner-uid",
          emailVerified: true,
          disabled,
          validSince: String(validSince),
        },
      ],
    });
  throw Error("Unexpected request in auth test.");
};
const { verifyOwnerToken } = await import(
  pathToFileURL(path.join(out, "auth.mjs"))
);
async function token(change = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: "owner-uid",
    email: "anbu.t80555@gmail.com",
    email_verified: true,
    auth_time: now,
    firebase: { sign_in_provider: "google.com" },
    ...change,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
    .setIssuer("https://securetoken.google.com/test-project")
    .setAudience("test-project")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}
assert.ok(await verifyOwnerToken(await token(), true));
assert.equal(
  await verifyOwnerToken(await token({ email: "other@example.test" })),
  null,
);
assert.equal(
  await verifyOwnerToken(await token({ email_verified: false })),
  null,
);
assert.equal(
  await verifyOwnerToken(
    await token({ firebase: { sign_in_provider: "password" } }),
  ),
  null,
);
assert.equal(
  await verifyOwnerToken(
    await token({ auth_time: Math.floor(Date.now() / 1000) - 600 }),
    true,
  ),
  null,
);
assert.equal(
  await verifyOwnerToken(await token({ sub: "different-uid" })),
  null,
);
disabled = true;
assert.equal(await verifyOwnerToken(await token()), null);
disabled = false;
validSince = Math.floor(Date.now() / 1000) + 30;
assert.equal(await verifyOwnerToken(await token()), null);
validSince = 0;
await assert.rejects(() => verifyOwnerToken("eyJhbGciOiJub25lIn0.e30."));
const signed = await token();
await assert.rejects(() => verifyOwnerToken(signed.slice(0, -5) + "wrong"));
globalThis.fetch = nativeFetch;
console.log(
  "Signed Firebase owner verification, verified email/provider checks, recent login, UID binding, disabled/revoked accounts, and forged-token rejection passed (mock Google transport, real cryptography).",
);
