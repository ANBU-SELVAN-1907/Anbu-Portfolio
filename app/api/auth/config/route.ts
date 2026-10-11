import {
  firebaseConfig,
  firebaseHealth,
  firebaseAuthReady,
} from "@/lib/firebase";
import { response } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const health = await firebaseHealth();
  return response({
    ready: health.ok,
    setupMessage: health.message,
    authReady: firebaseAuthReady(),
    config: firebaseConfig(),
  });
}
