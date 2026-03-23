"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCreator } from "@/components/creator-provider";

export function Topbar() {
  const { data: session, status } = useSession();
  const { activeProfile } = useCreator();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <header className="topbar">
      <Link className="topbar__brand" href="/">
        Maddie HQ
      </Link>
      <nav className="topbar__nav" aria-label="Main navigation">
        <Link href="/good-morning">Good Morning</Link>
        <Link href="/">Home</Link>
        <Link href="/insights">Insights</Link>
        <Link href="/tracker">Tracker</Link>
        <Link href="/conversion">Conversion</Link>
      </nav>
      <div className="topbar__profile-menu" ref={menuRef}>
        {status === "authenticated" ? (
          <>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="topbar__profile"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="topbar__profile-copy">
                <span className="topbar__profile-name">
                  {session.user?.name ?? activeProfile.name}
                </span>
                <span className="topbar__profile-handle">
                  {session.user?.email ?? activeProfile.instagramHandle}
                </span>
              </span>
              <span className="topbar__profile-caret">{menuOpen ? "Close" : "Menu"}</span>
            </button>

            {menuOpen ? (
              <div className="topbar__dropdown" role="menu" aria-label="Profile menu">
                <p className="topbar__dropdown-label">Profile</p>
                <Link href="/creator" onClick={() => setMenuOpen(false)}>
                  Creator setup
                </Link>
                <Link href="/security" onClick={() => setMenuOpen(false)}>
                  Safety and security
                </Link>
                <button
                  className="topbar__dropdown-action"
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="topbar__auth-links">
            <Link href="/login">Log In</Link>
            <Link href="/signup">Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  );
}
