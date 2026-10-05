import { redirect } from "next/navigation";
import { admin, snapshot } from "@/lib/server";
import Portfolio from "@/components/portfolio";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false },
};
export default async function Preview() {
  if (!(await admin())) redirect("/admin");
  return <Portfolio content={(await snapshot()).draft} preview />;
}
