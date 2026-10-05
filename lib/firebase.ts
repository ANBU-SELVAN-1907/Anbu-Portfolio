import { env } from "./env";
import { importPKCS8, SignJWT } from "jose";
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
export function firebaseConfig() {
  return {
    apiKey: env.FIREBASE_API_KEY || "",
    authDomain: env.FIREBASE_AUTH_DOMAIN || "",
    projectId: env.FIREBASE_PROJECT_ID || "",
    appId: env.FIREBASE_APP_ID || "",
  };
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
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON)
    throw Error("Firebase backend needs configuration.");
  const a = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
    project_id: string;
  };
  if (
    a.project_id !== env.FIREBASE_PROJECT_ID ||
    !a.client_email ||
    !a.private_key
  )
    throw Error("Firebase configuration mismatch.");
  if (
    access &&
    access.expires > Date.now() + 60000 &&
    access.email === a.client_email
  )
    return access.value;
  const key = await importPKCS8(a.private_key, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(a.client_email)
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
  if (!r.ok) throw Error("Firebase server authorization failed.");
  const result = (await r.json()) as {
    access_token: string;
    expires_in: number;
  };
  access = {
    value: result.access_token,
    expires: Date.now() + result.expires_in * 1000,
    email: a.client_email,
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
  if (r.status === 404) return null;
  if (!r.ok) {
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
// Spark-compatible small-file storage. No Cloud Storage or billing account.
// 512 KiB binary -> <700 KiB base64, safely below Firestore's 1 MiB document limit.
export const firebaseBucket = {
  async put(
    id: string,
    bytes: Uint8Array,
    options: { httpMetadata: { contentType: string } },
  ) {
    if (bytes.length > 524288)
      throw Error("Free-plan uploads must be 512 KB or smaller.");
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    await store.set("files", id, {
      body: btoa(binary),
      type: options.httpMetadata.contentType,
      size: bytes.length,
    });
  },
  async get(id: string) {
    const data = await store.get("files", id);
    if (!data) return null;
    const binary = atob(String(data.body));
    return {
      body: Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      httpMetadata: { contentType: String(data.type) },
    };
  },
  async delete(id: string) {
    await store.remove("files", id);
  },
};
