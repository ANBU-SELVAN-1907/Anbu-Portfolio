import {
  firebaseConfig,
  firebaseReady,
  firebaseSetupMessage,
} from "@/lib/firebase";
import {
  requestFailure,
  response,
  sameOrigin,
  limited,
  jsonBody,
} from "@/lib/server";
export async function POST(r: Request) {
  if (!sameOrigin(r))
    return response(
      { error: "Request a sign-in link from this website." },
      403,
    );
  if (!firebaseReady())
    return response(
      {
        error:
          "The private Firebase backend credential is missing. Complete the setup before signing in.",
      },
      503,
    );
  try {
    const body = await jsonBody(r, 1024);
    if (
      typeof body.email !== "string" ||
      body.email.trim().toLowerCase() !== "anbu.t80555@gmail.com"
    )
      return response({ error: "Only the owner email can sign in." }, 403);
    if (
      (await limited(r, "email-login", 3, 3600)) ||
      (await limited(new Request(r.url), "email-login-global", 5, 86400))
    )
      return response(
        {
          error:
            "Sign-in email limit reached. Firebase Spark allows 5 sign-in emails per day. Use Google sign-in or try later.",
        },
        429,
      );
    const result = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseConfig().apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          requestType: "EMAIL_SIGNIN",
          email: "anbu.t80555@gmail.com",
          continueUrl: new URL("/admin", r.url).href,
          canHandleCodeInApp: true,
        }),
      },
    );
    if (!result.ok) {
      const data = (await result.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const reason = data.error?.message || "";
      return response(
        {
          error: reason.includes("OPERATION_NOT_ALLOWED")
            ? "Enable Email/Password and Email link (passwordless) in Firebase Authentication → Sign-in method."
            : reason.includes("UNAUTHORIZED_DOMAIN") ||
                reason.includes("INVALID_CONTINUE_URI") ||
                reason.includes("UNAUTHORIZED_CONTINUE_URI")
              ? "Add this website hostname to Firebase Authentication → Authorized domains."
              : reason.includes("TOO_MANY_ATTEMPTS") ||
                  reason.includes("QUOTA_EXCEEDED")
                ? "Firebase's email quota is exhausted. Try Google sign-in or wait for the quota reset."
                : "Firebase could not send the sign-in link. Check your project's email provider and authorized domain settings.",
        },
        result.status === 429 ? 429 : 502,
      );
    }
    return response({
      ok: true,
      message:
        "A sign-in link was sent to anbu.t80555@gmail.com. Check your inbox and spam folder.",
    });
  } catch (e) {
    const failure = requestFailure(e);
    if (failure) return failure;
    return response(
      {
        error:
          firebaseSetupMessage(e) ||
          "The sign-in service could not connect. Retry shortly; if this continues, check the Firebase server configuration.",
      },
      503,
    );
  }
}
