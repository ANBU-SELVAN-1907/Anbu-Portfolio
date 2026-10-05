import type { Metadata } from "next";
import "./globals.css";
import "./resume-builder.css";
export const metadata: Metadata = {
  title: "Anbu Selvan T — AI & Embedded Systems Engineer",
  description:
    "AI applications and connected systems by Anbu Selvan T, based in Chennai, India.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
