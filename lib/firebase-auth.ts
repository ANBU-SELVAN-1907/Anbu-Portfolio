import { env } from "./env";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { firebaseConfig, firebaseReady, store } from "./firebase";
const keys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);
export const sessionCookie =
  process.env.NODE_ENV === "development" ? "anbu_owner" : "__Host-anbu_owner";
export async function verifyOwnerToken(token: string, recent = false) {
  if (!firebaseReady() || token.length > 3800) return null;
  const c = firebaseConfig();
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${c.projectId}`,
    audience: c.projectId,
    requiredClaims: [
      "sub",
      "iat",
      "exp",
      "auth_time",
      "email",
      "email_verified",
    ],
  });
  const p = payload as JWTPayload & {
    email: string;
    email_verified: boolean;
    auth_time: number;
    firebase?: { sign_in_provider?: string };
  };
  const now = Math.floor(Date.now() / 1000);
  if (
    !p.sub ||
    typeof p.email !== "string" ||
    typeof p.auth_time !== "number" ||
    typeof p.iat !== "number" ||
    p.iat > now ||
    p.sub.length > 128 ||
    p.email.toLowerCase() !== "anbu.t80555@gmail.com" ||
    p.email_verified !== true ||
    p.firebase?.sign_in_provider !== "google.com" ||
    p.auth_time > now ||
    (recent && now - p.auth_time > 300) ||
    (env.FIREBASE_OWNER_UID && p.sub !== env.FIREBASE_OWNER_UID)
  )
    return null;
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(c.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as {
    users?: {
      localId: string;
      disabled?: boolean;
      validSince?: string;
      emailVerified?: boolean;
    }[];
  };
  const user = data.users?.[0];
  if (
    !user ||
    user.localId !== p.sub ||
    user.disabled ||
    !user.emailVerified ||
    Number(user.validSince || 0) > p.auth_time
  )
    return null;
  const old = await store.get("owner", "main");
  if (old && old.uid !== p.sub) return null;
  if (
    !old &&
    !(await store.atomic("owner", "main", (bound) =>
      bound && bound.uid !== p.sub
        ? null
        : {
            data: bound || {
              uid: p.sub!,
              email: p.email,
              created: new Date().toISOString(),
            },
            result: true,
          },
    ))
  )
    return null;
  return { userId: p.sub, email: p.email, expires: p.exp! };
}
export async function firebaseOwner() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  try {
    return await verifyOwnerToken(token);
  } catch {
    return null;
  }
}
