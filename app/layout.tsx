import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { Topbar } from "@/components/topbar";
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
        <Providers>
          <div className="app-shell">
            <Topbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
