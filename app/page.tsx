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
    return { title: "Anbu Selvan — Portfolio" };
  }
}
export default async function Home() {
  try {
    return <Portfolio content={await published()} />;
  } catch {
    return (
      <main className="error-page">
        <h1>Back in a moment.</h1>
        <p>The portfolio is temporarily unavailable.</p>
        <a className="button" href="/">
          Try again
        </a>
        <a href="mailto:anbu.t80555@gmail.com">Email Anbu</a>
      </main>
    );
  }
}
