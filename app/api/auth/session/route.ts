import { sessionCookie, verifyOwnerToken } from "@/lib/firebase-auth";
import {
  requestFailure,
  response,
  sameOrigin,
  jsonBody,
  limited,
} from "@/lib/server";
import { firebaseReady, firebaseSetupMessage } from "@/lib/firebase";
export async function POST(r: Request) {
  if (!sameOrigin(r))
    return response({ error: "Use the sign-in page on this website." }, 403);
  if (!firebaseReady())
    return response({ error: "Firebase sign-in needs configuration." }, 503);
  try {
    if (await limited(r, "login", 15, 900))
      return response(
        { error: "Too many sign-in attempts. Try again later." },
        429,
      );
    const b = await jsonBody(r, 15000);
    if (typeof b.idToken !== "string")
      return response({ error: "Invalid sign-in." }, 400);
    const owner = await verifyOwnerToken(b.idToken, true);
    if (!owner)
      return response(
        {
          error: "This account is not authorized to edit the portfolio.",
        },
        403,
      );
    const result = response({ ok: true });
    result.headers.set(
      "Set-Cookie",
      `${sessionCookie}=${b.idToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.min(3600, owner.expires - Math.floor(Date.now() / 1000)))}${process.env.NODE_ENV !== "development" ? "; Secure" : ""}`,
    );
    return result;
  } catch (e) {
    const failure = requestFailure(e);
    if (failure) return failure;
    return response(
      {
        error:
          firebaseSetupMessage(e) ||
          "The sign-in token expired or could not be verified. Request a fresh link or sign in with Google again.",
      },
      firebaseSetupMessage(e) ? 503 : 401,
    );
  }
}
export async function DELETE(r: Request) {
  if (!sameOrigin(r))
    return response({ error: "Invalid sign-out origin." }, 403);
  const result = response({ ok: true });
  result.headers.set(
    "Set-Cookie",
    `${sessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV !== "development" ? "; Secure" : ""}`,
  );
  return result;
}
