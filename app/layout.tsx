import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nespus — Gesturi care rămân",
  description: "Experiențe digitale personalizate de iubire, scuze și mulțumiri.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="antialiased">{children}</body>
    </html>
  );
}
