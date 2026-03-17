import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maddie HQ",
  description: "A growing web app for Maddie to organize social insights and future business tools."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="topbar__brand" href="/">
              Maddie HQ
            </Link>
            <nav className="topbar__nav" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/insights">Insights</Link>
              <Link href="/tracker">Tracker</Link>
              <Link href="/conversion">Conversion</Link>
              <button className="topbar__menu" type="button">
                More Tools Soon
              </button>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
