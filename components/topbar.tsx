"use client";

import Link from "next/link";
import { useCreator } from "@/components/creator-provider";

export function Topbar() {
  const { activeProfile } = useCreator();

  return (
    <header className="topbar">
      <Link className="topbar__brand" href="/">
        Maddie HQ
      </Link>
      <nav className="topbar__nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/insights">Insights</Link>
        <Link href="/tracker">Tracker</Link>
        <Link href="/conversion">Conversion</Link>
        <Link href="/creator">Creator</Link>
      </nav>
      <div className="topbar__profile">
        <span className="topbar__profile-name">{activeProfile.name}</span>
        <span className="topbar__profile-handle">{activeProfile.instagramHandle}</span>
      </div>
    </header>
  );
}
