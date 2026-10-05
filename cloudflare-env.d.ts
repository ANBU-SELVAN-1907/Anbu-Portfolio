declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_APP_ID?: string;
    FIREBASE_SERVICE_ACCOUNT_JSON?: string;
    FIREBASE_OWNER_UID?: string;
  }
}
