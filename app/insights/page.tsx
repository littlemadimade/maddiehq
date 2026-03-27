"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────

interface ContentReport {
  patterns: Array<{ title: string; description: string; evidence: string; impact: string }>;
  recommendations: Array<{ action: string; reasoning: string; priority: "high" | "medium" | "low" }>;
  summary: string;
  postsAnalyzed: number;
  generatedAt: string;
}

// ── Component ────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [report, setReport] = useState<ContentReport | null>(null);
  const [elaborations, setElaborations] = useState<Record<string, string>>({});
  const [elaborating, setElaborating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze/instagram");
      if (res.ok) {
        const json = await res.json();
        setReport(json.report ?? null);
      }
    } catch {
      // Silently fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      // Step 1: Run base analysis (vision + caption) on unanalyzed posts
      const analyzeRes = await fetch("/api/analyze/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze" })
      });
      if (!analyzeRes.ok) {
        const json = await analyzeRes.json();
        setError(json.error ?? "Analysis failed");
        return;
      }

      // Step 2: Process videos (transcription + key frames)
      await fetch("/api/analyze/instagram/video", { method: "POST" });

      // Step 3: Generate the pattern report
      const reportRes = await fetch("/api/analyze/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report" })
      });
      if (!reportRes.ok) {
        const json = await reportRes.json();
        setError(json.error ?? "Report generation failed");
        return;
      }
      const json = await reportRes.json();
      setReport(json.report ?? null);
    } catch {
      setError("Analysis failed. Make sure ANTHROPIC_API_KEY is set in .env");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleElaborate(pattern: { title: string; description: string; evidence: string }) {
    setElaborating(pattern.title);
    try {
      const res = await fetch("/api/analyze/instagram/elaborate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pattern)
      });
      if (res.ok) {
        const json = await res.json();
        setElaborations((prev) => ({ ...prev, [pattern.title]: json.elaboration }));
      }
    } catch {
      // Silently fail
    } finally {
      setElaborating(null);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">Insights</h1>
        <button
          className="page-header__action"
          type="button"
          disabled={analyzing}
          onClick={handleAnalyze}
        >
          {analyzing ? "Analyzing..." : "Analyze Content"}
        </button>
      </header>

      {error && (
        <div className="analytics-error panel">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="analytics-loading panel">
          <p>Loading insights...</p>
        </div>
      )}

      {analyzing && (
        <div className="analytics-loading panel">
          <p>Analyzing posts with AI — this can take a minute or two...</p>
        </div>
      )}

      {!loading && !analyzing && !report && (
        <div className="analytics-empty panel">
          <p>No analysis report yet. Click &ldquo;Analyze Content&rdquo; to run AI analysis on your posts.</p>
        </div>
      )}

      {!loading && !analyzing && report && (
        <>
          <section className="panel analytics-section">
            <div className="ai-report__summary">
              <p>{report.summary}</p>
              <p className="ai-report__meta">
                {report.postsAnalyzed} posts analyzed · {report.generatedAt ? formatDate(report.generatedAt) : ""}
              </p>
            </div>
          </section>

          {report.patterns.length > 0 && (
            <section className="panel analytics-section">
              <h2>Patterns Found</h2>
              <div className="ai-report__cards">
                {report.patterns.map((pattern, i) => (
                  <article key={i} className="ai-report__card">
                    <div className="ai-report__card-header">
                      <h4>{pattern.title}</h4>
                      <span className={`ai-report__impact ai-report__impact--${pattern.impact}`}>
                        {pattern.impact}
                      </span>
                    </div>
                    <p>{pattern.description}</p>
                    <p className="ai-report__evidence">{pattern.evidence}</p>
                    {elaborations[pattern.title] ? (
                      <div className="ai-report__elaboration">
                        {elaborations[pattern.title].split("\n\n").map((para, j) => (
                          <p key={j}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="ai-report__elaborate-btn"
                        type="button"
                        disabled={elaborating === pattern.title}
                        onClick={() => handleElaborate(pattern)}
                      >
                        {elaborating === pattern.title ? "Thinking..." : "Go deeper"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {report.recommendations.length > 0 && (
            <section className="panel analytics-section">
              <h2>Recommendations</h2>
              <div className="ai-report__cards">
                {report.recommendations.map((rec, i) => (
                  <article key={i} className="ai-report__card">
                    <div className="ai-report__card-header">
                      <h4>{rec.action}</h4>
                      <span className={`ai-report__priority ai-report__priority--${rec.priority}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p>{rec.reasoning}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
