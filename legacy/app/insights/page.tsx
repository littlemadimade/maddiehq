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

interface ProgressState {
  phase: string;
  step: string;
  current: number;
  total: number;
}

// ── Component ────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [report, setReport] = useState<ContentReport | null>(null);
  const [elaborations, setElaborations] = useState<Record<string, string>>({});
  const [elaborating, setElaborating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
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
    setProgress({ phase: "starting", step: "Starting analysis...", current: 0, total: 0 });

    try {
      const response = await fetch("/api/analyze/instagram/stream");

      if (!response.ok || !response.body) {
        setError("Failed to start analysis stream");
        setAnalyzing(false);
        setProgress(null);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.phase === "complete" && data.report) {
              setReport(data.report);
              setProgress(null);
            } else if (data.phase === "error") {
              setError(data.error ?? "Analysis failed");
              setProgress(null);
            } else {
              setProgress({
                phase: data.phase,
                step: data.step,
                current: data.current ?? 0,
                total: data.total ?? 0
              });
            }
          } catch {
            // Skip malformed SSE data
          }
        }
      }
    } catch {
      setError("Analysis failed. Check your API keys in .env");
    } finally {
      setAnalyzing(false);
      setProgress(null);
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

  const phaseLabels: Record<string, string> = {
    starting: "Starting",
    analyze: "Analyzing posts",
    video: "Processing videos",
    report: "Generating report"
  };

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

      {loading && !analyzing && (
        <div className="analytics-loading panel">
          <p>Loading insights...</p>
        </div>
      )}

      {analyzing && progress && (
        <section className="panel analytics-section progress-panel">
          <div className="progress-header">
            <h2>{phaseLabels[progress.phase] ?? progress.phase}</h2>
            {progress.total > 0 && (
              <span className="progress-count">{progress.current} / {progress.total}</span>
            )}
          </div>
          <p className="progress-step">{progress.step}</p>
          {progress.total > 0 && (
            <div className="progress-bar">
              <div
                className="progress-bar__fill"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          )}
          <div className="progress-phases">
            <span className={`progress-phase ${progress.phase === "analyze" ? "progress-phase--active" : ["video", "report", "complete"].includes(progress.phase) ? "progress-phase--done" : ""}`}>
              1. Analyze posts
            </span>
            <span className={`progress-phase ${progress.phase === "video" ? "progress-phase--active" : ["report", "complete"].includes(progress.phase) ? "progress-phase--done" : ""}`}>
              2. Process videos
            </span>
            <span className={`progress-phase ${progress.phase === "report" ? "progress-phase--active" : progress.phase === "complete" ? "progress-phase--done" : ""}`}>
              3. Generate report
            </span>
          </div>
        </section>
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
