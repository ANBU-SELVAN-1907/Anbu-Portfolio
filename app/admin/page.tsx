import { admin } from "@/lib/server";
import Studio from "@/components/studio";
import FirebaseLogin from "@/components/firebase-login";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content Studio · Anbu Selvan T",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await admin();
  return user ? <Studio email={user.email} /> : <FirebaseLogin />;
}
