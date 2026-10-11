import {
  firebaseConfig,
  firebaseReady,
  firebaseAuthReady,
} from "@/lib/firebase";
import { response } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return response({
    ready: firebaseReady(),
    authReady: firebaseAuthReady(),
    config: firebaseConfig(),
  });
}
