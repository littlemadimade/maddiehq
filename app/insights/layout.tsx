import Link from "next/link";
import type { ReactNode } from "react";

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="insights-shell">
      <nav className="subnav" aria-label="Insights navigation">
        <Link href="/insights">Overview</Link>
        <Link href="/insights/suggestions">Suggestions</Link>
      </nav>
      {children}
    </div>
  );
}
