import Link from "next/link";
import type { Content } from "@/lib/content";
import Portfolio from "@/components/portfolio";
import { published } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  try {
    const c = await published();
    return {
      title: c.settings.seoTitle,
      description: c.settings.seoDescription,
      openGraph: {
        title: c.settings.seoTitle,
        description: c.settings.seoDescription,
        type: "website",
      },
    };
  } catch {
    return { title: "Anbu Selvan T — Portfolio" };
  }
}
export default async function Home() {
  let content: Content;
  try {
    content = await published();
  } catch {
    return (
      <main className="error-page">
        <h1>Back in a moment.</h1>
        <p>The portfolio is temporarily unavailable.</p>
        <Link className="button" href="/">
          Try again
        </Link>
        <a href="mailto:anbu.t80555@gmail.com">Email Anbu</a>
      </main>
    );
  }
  return <Portfolio content={content} />;
}
