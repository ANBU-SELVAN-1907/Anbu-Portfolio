import { env } from "./env";
import { importPKCS8, SignJWT } from "jose";
import { MAX_MEDIA_BYTES, MEDIA_CHUNK_BYTES } from "./media";
type Value = {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  nullValue?: null;
};
type Document = {
  name: string;
  fields?: Record<string, Value>;
  updateTime?: string;
};
export type RecordData = Record<string, string | number | boolean | null>;
let access: { value: string; expires: number; email: string } | undefined;
class FirebaseSetupError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export function firebaseSetupMessage(error: unknown) {
  return error instanceof FirebaseSetupError ? error.message : null;
}
function serviceAccount() {
  let account: {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };
  try {
    let parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || "");
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (!parsed || typeof parsed !== "object") throw Error();
    account = parsed;
  } catch {
    throw new FirebaseSetupError(
      "credential",
      "Replace FIREBASE_SERVICE_ACCOUNT_JSON in Vercel with the complete JSON downloaded from Firebase → Project settings → Service accounts. Redeploy after saving.",
    );
  }
  if (account.project_id !== env.FIREBASE_PROJECT_ID)
    throw new FirebaseSetupError(
      "project",
      `The private Firebase credential belongs to a different project. Use a service account from ${env.FIREBASE_PROJECT_ID}, then redeploy Vercel.`,
    );
  if (
    typeof account.client_email !== "string" ||
    typeof account.private_key !== "string"
  )
    throw new FirebaseSetupError(
      "credential",
      "The Firebase service-account JSON is incomplete. Download a new private key for this project, update Vercel, and redeploy.",
    );
  return {
    email: account.client_email,
    key: account.private_key.replaceAll("\\n", "\n"),
  };
}
export function firebaseConfig() {
  return {
    apiKey: env.FIREBASE_API_KEY || "",
    authDomain: env.FIREBASE_AUTH_DOMAIN || "",
    projectId: env.FIREBASE_PROJECT_ID || "",
    appId: env.FIREBASE_APP_ID || "",
  };
}
export function firebaseAuthReady() {
  const c = firebaseConfig();
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}
export function firebaseReady() {
  const c = firebaseConfig();
  return Boolean(
    c.apiKey &&
    c.authDomain &&
    c.projectId &&
    c.appId &&
    env.FIREBASE_SERVICE_ACCOUNT_JSON,
  );
}
async function accessToken() {
  const a = serviceAccount();
  if (access && access.expires > Date.now() + 60000 && access.email === a.email)
    return access.value;
  const key = await importPKCS8(a.key, "RS256").catch(() => {
    throw new FirebaseSetupError(
      "key",
      "The Firebase private key cannot be read. Paste the complete downloaded JSON into FIREBASE_SERVICE_ACCOUNT_JSON in Vercel, then redeploy.",
    );
  });
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(a.email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!r.ok)
    throw new FirebaseSetupError(
      "authorization",
      "Google rejected the Firebase server credential. Generate a new private key in this Firebase project, update FIREBASE_SERVICE_ACCOUNT_JSON in Vercel, and redeploy.",
    );
  const result = (await r.json()) as {
    access_token: string;
    expires_in: number;
  };
  access = {
    value: result.access_token,
    expires: Date.now() + result.expires_in * 1000,
    email: a.email,
  };
  return access.value;
}
const root = () =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
function assertPath(collection: string, id: string) {
  if (
    !/^[a-z_]{1,40}$/.test(collection) ||
    !/^[a-zA-Z0-9:._-]{1,160}$/.test(id)
  )
    throw Error("Invalid record identifier.");
}
const name = (collection: string, id: string) => {
  assertPath(collection, id);
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/portfolio_${collection}/${id}`;
};
function recordUrl(collection: string, id: string) {
  assertPath(collection, id);
  return `${root()}/portfolio_${collection}/${encodeURIComponent(id)}`;
}

function encode(data: RecordData) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      v === null
        ? { nullValue: null }
        : typeof v === "string"
          ? { stringValue: v }
          : typeof v === "boolean"
            ? { booleanValue: v }
            : { integerValue: String(v) },
    ]),
  );
}
function decode(doc: Document): RecordData {
  return Object.fromEntries(
    Object.entries(doc.fields || {}).map(([k, v]) => [
      k,
      v.stringValue ??
        (v.integerValue !== undefined
          ? Number(v.integerValue)
          : (v.booleanValue ?? null)),
    ]),
  );
}
async function request(path: string, init: RequestInit = {}) {
  const r = await fetch(path, {
    ...init,
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (r.status === 404 && (!init.method || init.method === "DELETE")) {
    const payload = await r.json().catch(() => null);
    // Missing documents are normal; an absent database is a setup failure.
    if (
      !/\bdatabase\b.*(?:does not exist|not found)/i.test(
        String(payload?.error?.message || ""),
      )
    )
      return null;
  }
  if (!r.ok) {
    if (r.status === 403)
      throw new FirebaseSetupError(
        "permissions",
        "Firebase denied server access. Enable Cloud Firestore API and give the service account the Cloud Datastore User role in this project's IAM settings. Do not make Firestore rules public.",
        403,
      );
    if (r.status === 404)
      throw new FirebaseSetupError(
        "database",
        "Create the (default) Firestore database in this Firebase project. Choose Standard edition and production rules, then retry.",
        404,
      );
    if (r.status === 429)
      throw new FirebaseSetupError(
        "quota",
        "Firebase's database quota has been reached. Wait for its quota reset before signing in or uploading.",
        429,
      );
    const e = Error(`Firebase request failed (${r.status}).`);
    (e as Error & { status: number }).status = r.status;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}
export const store = {
  async get(collection: string, id: string): Promise<RecordData | null> {
    const d = (await request(recordUrl(collection, id))) as Document | null;
    return d ? decode(d) : null;
  },
  async set(collection: string, id: string, data: RecordData) {
    await request(recordUrl(collection, id), {
      method: "PATCH",
      body: JSON.stringify({ fields: encode(data) }),
    });
  },
  async patch(collection: string, id: string, data: RecordData) {
    const mask = Object.keys(data)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    await request(`${recordUrl(collection, id)}?${mask}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encode(data) }),
    });
  },
  async remove(collection: string, id: string) {
    await request(recordUrl(collection, id), { method: "DELETE" });
  },
  async list(
    collection: string,
    limit = 100,
    field = "created",
  ): Promise<RecordData[]> {
    const r = (await request(`${root()}:runQuery`, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: `portfolio_${collection}` }],
          orderBy: [{ field: { fieldPath: field }, direction: "DESCENDING" }],
          limit,
        },
      }),
    })) as { document?: Document }[] | null;
    return (r || []).filter((x) => x.document).map((x) => decode(x.document!));
  },
  async atomic<T>(
    collection: string,
    id: string,
    change: (data: RecordData | null) => {
      data: RecordData;
      result: T;
      extra?: { collection: string; id: string; data: RecordData }[];
    } | null,
  ): Promise<T | null> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const begun = (await request(`${root()}:beginTransaction`, {
        method: "POST",
        body: "{}",
      })) as { transaction: string };
      try {
        const doc = (await request(
          `${recordUrl(collection, id)}?transaction=${encodeURIComponent(begun.transaction)}`,
        )) as Document | null;
        const next = change(doc ? decode(doc) : null);
        if (!next) {
          await request(`${root()}:rollback`, {
            method: "POST",
            body: JSON.stringify(begun),
          });
          return null;
        }
        const writes = [
          { update: { name: name(collection, id), fields: encode(next.data) } },
          ...(next.extra || []).map((x) => ({
            update: { name: name(x.collection, x.id), fields: encode(x.data) },
          })),
        ];
        await request(`${root()}:commit`, {
          method: "POST",
          body: JSON.stringify({ transaction: begun.transaction, writes }),
        });
        return next.result;
      } catch (e) {
        await request(`${root()}:rollback`, {
          method: "POST",
          body: JSON.stringify(begun),
        }).catch(() => {});
        if ((e as { status?: number }).status !== 409 || attempt === 3) throw e;
      }
    }
    throw Error("Firebase transaction conflict.");
  },
};
let health:
  { expires: number; result: { ok: boolean; message: string } } | undefined;
export async function firebaseHealth() {
  if (health && health.expires > Date.now()) return health.result;
  let result;
  try {
    if (!firebaseAuthReady())
      throw new FirebaseSetupError(
        "web",
        "Add the Firebase web-app configuration to Vercel's Production environment and redeploy.",
      );
    // Starting a transaction also detects a missing default database. It writes no content.
    const transaction = await request(`${root()}:beginTransaction`, {
      method: "POST",
      body: "{}",
    });
    await request(`${root()}:rollback`, {
      method: "POST",
      body: JSON.stringify(transaction),
    });
    result = { ok: true, message: "" };
  } catch (error) {
    result = {
      ok: false,
      message:
        firebaseSetupMessage(error) ||
        "The Firebase server could not connect. Check the service status and retry shortly.",
    };
  }
  health = { expires: Date.now() + 60000, result };
  return result;
}
function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
async function digest(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
// Spark-compatible original files, atomically split below Firestore's 1 MiB document limit.
export const firebaseBucket = {
  async put(
    id: string,
    bytes: Uint8Array,
    options: { httpMetadata: { contentType: string } },
  ) {
    if (!bytes.length || bytes.length > MAX_MEDIA_BYTES)
      throw Error("Choose an original file up to 4 MiB.");
    const data = {
      type: options.httpMetadata.contentType,
      size: bytes.length,
      sha256: await digest(bytes),
    };
    if (bytes.length <= MEDIA_CHUNK_BYTES)
      await store.set("files", id, { ...data, body: base64(bytes) });
    else {
      const chunks = Math.ceil(bytes.length / MEDIA_CHUNK_BYTES);
      await store.atomic("files", id, () => ({
        data: { ...data, chunks },
        result: true,
        extra: Array.from({ length: chunks }, (_, index) => ({
          collection: "file_chunks",
          id: `${id}:${index}`,
          data: {
            body: base64(
              bytes.subarray(
                index * MEDIA_CHUNK_BYTES,
                (index + 1) * MEDIA_CHUNK_BYTES,
              ),
            ),
          },
        })),
      }));
    }
  },
  async get(id: string) {
    const data = await store.get("files", id);
    if (!data) return null;
    let body: Uint8Array;
    if (data.chunks) {
      const count = Number(data.chunks),
        size = Number(data.size);
      if (
        !Number.isInteger(count) ||
        count < 2 ||
        count > 8 ||
        size > MAX_MEDIA_BYTES ||
        size <= MEDIA_CHUNK_BYTES
      )
        throw Error("Invalid file manifest.");
      const rows = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          store.get("file_chunks", `${id}:${index}`),
        ),
      );
      body = new Uint8Array(size);
      let offset = 0;
      for (const row of rows) {
        if (typeof row?.body !== "string")
          throw Error("File chunk is missing.");
        const binary = atob(row.body);
        if (binary.length > MEDIA_CHUNK_BYTES || offset + binary.length > size)
          throw Error("Invalid file chunk.");
        body.set(
          Uint8Array.from(binary, (c) => c.charCodeAt(0)),
          offset,
        );
        offset += binary.length;
      }
      if (offset !== size) throw Error("Incomplete file.");
    } else
      body = Uint8Array.from(atob(String(data.body)), (c) => c.charCodeAt(0));
    if (data.sha256 && (await digest(body)) !== data.sha256)
      throw Error("File integrity check failed.");
    return {
      body,
      httpMetadata: { contentType: String(data.type) },
    };
  },
  async delete(id: string) {
    const data = await store.get("files", id);
    if (data?.chunks) {
      const count = Number(data.chunks);
      if (!Number.isInteger(count) || count < 2 || count > 8)
        throw Error("Invalid file manifest.");
      await Promise.all(
        Array.from({ length: count }, (_, index) =>
          store.remove("file_chunks", `${id}:${index}`),
        ),
      );
    }
    await store.remove("files", id);
  },
};
