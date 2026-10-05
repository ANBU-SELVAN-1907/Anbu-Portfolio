import { firebaseConfig, firebaseReady } from "@/lib/firebase";
import { response } from "@/lib/server";
export async function GET() {
  return response({ ready: firebaseReady(), config: firebaseConfig() });
}
