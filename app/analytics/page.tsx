"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────

interface PostRow {
  id: number;
  platformPostId: string;
  caption: string | null;
  mediaType: string | null;
  permalink: string | null;
  publishedAt: string | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  saves: number | null;
  likes: number | null;
  comments: number | null;
  snapshotDate: string | null;
}

interface Snapshot {
  date: string;
  followerCount: number | null;
  mediaCount: number | null;
  reach: number | null;
  impressions: number | null;
  profileViews: number | null;
}

interface DemoEntry {
  key: string;
  value: number;
}

interface DemographicsData {
  cities: DemoEntry[];
  countries: DemoEntry[];
  genderAge: DemoEntry[];
}

type SortField = "published_at" | "engagement" | "reach" | "impressions" | "saves" | "likes" | "comments";
type Tab = "posts" | "growth" | "demographics" | "times";
type TimeRange = "7" | "30" | "90" | "all";

// ── Component ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [demographics, setDemographics] = useState<DemographicsData | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sortField, setSortField] = useState<SortField>("published_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const res = await fetch(`/api/platforms/instagram/posts?limit=100&sort=${sortField}&dir=${sortDir}`);
    if (res.ok) {
      const json = await res.json();
      setPosts(json.data ?? []);
    }
  }, [sortField, sortDir]);

  const fetchInsights = useCallback(async () => {
    const days = timeRange === "all" ? "365" : timeRange;
    const res = await fetch(`/api/platforms/instagram/insights?days=${days}`);
    if (res.ok) {
      const json = await res.json();
      setSnapshots(json.data ?? []);
      setTrend(json.trend ?? "flat");
    }
  }, [timeRange]);

  const fetchDemographics = useCallback(async () => {
    const res = await fetch("/api/platforms/instagram/demographics");
    if (res.ok) {
      const json = await res.json();
      setDemographics(json.data ?? null);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchPosts(), fetchInsights(), fetchDemographics()]);
    } catch {
      setError("Failed to load data. Make sure Instagram is connected.");
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, fetchInsights, fetchDemographics]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/instagram", { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Sync failed");
        return;
      }
      await loadAll();
    } catch {
      setError("Sync failed. Check your connection and credentials.");
    } finally {
      setSyncing(false);
    }
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // ── Posting times heatmap data ─────────────────────────────────────

  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const post of posts) {
      if (!post.publishedAt || post.engagement == null) continue;
      const d = new Date(post.publishedAt);
      const day = d.getDay();
      const hour = d.getHours();
      grid[day][hour] += post.engagement;
      counts[day][hour] += 1;
    }

    // Average engagement per slot
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        grid[d][h] = counts[d][h] > 0 ? Math.round(grid[d][h] / counts[d][h]) : 0;
      }
    }

    const maxVal = Math.max(1, ...grid.flat());
    return { grid, maxVal };
  }, [posts]);

  // ── Render ─────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "growth", label: "Growth" },
    { key: "demographics", label: "Audience" },
    { key: "times", label: "Best Times" }
  ];

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <button
          className="page-header__action"
          type="button"
          disabled={syncing}
          onClick={handleSync}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </header>

      {error && (
        <div className="analytics-error panel">
          <p>{error}</p>
        </div>
      )}

      <nav className="analytics-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`analytics-tab ${tab === t.key ? "analytics-tab--active" : ""}`}
            type="button"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="analytics-loading panel">
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* ── Posts Table ──────────────────────────────────────── */}
          {tab === "posts" && (
            <section className="panel analytics-section">
              <h2>Post Performance</h2>
              {posts.length === 0 ? (
                <div className="analytics-empty">
                  <p>No posts synced yet. Hit &ldquo;Sync Now&rdquo; to pull data from Instagram.</p>
                </div>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Post</th>
                        <th>Type</th>
                        <ThSort field="published_at" current={sortField} dir={sortDir} onSort={handleSort}>Date</ThSort>
                        <ThSort field="impressions" current={sortField} dir={sortDir} onSort={handleSort}>Impr.</ThSort>
                        <ThSort field="reach" current={sortField} dir={sortDir} onSort={handleSort}>Reach</ThSort>
                        <ThSort field="engagement" current={sortField} dir={sortDir} onSort={handleSort}>Eng.</ThSort>
                        <ThSort field="saves" current={sortField} dir={sortDir} onSort={handleSort}>Saves</ThSort>
                        <ThSort field="likes" current={sortField} dir={sortDir} onSort={handleSort}>Likes</ThSort>
                        <ThSort field="comments" current={sortField} dir={sortDir} onSort={handleSort}>Cmts</ThSort>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id}>
                          <td className="analytics-table__caption">
                            {post.permalink ? (
                              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                                {truncate(post.caption, 60)}
                              </a>
                            ) : (
                              truncate(post.caption, 60)
                            )}
                          </td>
                          <td><span className="analytics-badge">{post.mediaType ?? "—"}</span></td>
                          <td>{post.publishedAt ? formatDate(post.publishedAt) : "—"}</td>
                          <td>{fmt(post.impressions)}</td>
                          <td>{fmt(post.reach)}</td>
                          <td>{fmt(post.engagement)}</td>
                          <td>{fmt(post.saves)}</td>
                          <td>{fmt(post.likes)}</td>
                          <td>{fmt(post.comments)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ── Follower Growth ──────────────────────────────────── */}
          {tab === "growth" && (
            <section className="panel analytics-section">
              <div className="analytics-section__header">
                <h2>Follower Growth</h2>
                <div className="analytics-range-buttons">
                  {(["7", "30", "90", "all"] as TimeRange[]).map((r) => (
                    <button
                      key={r}
                      className={`analytics-range-btn ${timeRange === r ? "analytics-range-btn--active" : ""}`}
                      type="button"
                      onClick={() => setTimeRange(r)}
                    >
                      {r === "all" ? "All" : `${r}d`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="analytics-trend">
                Trend: <span className={`analytics-trend--${trend}`}>{trend === "up" ? "Growing" : trend === "down" ? "Declining" : "Flat"}</span>
              </p>
              {snapshots.length === 0 ? (
                <div className="analytics-empty">
                  <p>No snapshots yet. Sync data to start tracking follower growth.</p>
                </div>
              ) : (
                <div className="analytics-chart">
                  <BarChart data={snapshots.map((s) => ({ label: s.date, value: s.followerCount ?? 0 }))} />
                </div>
              )}

              {snapshots.length > 0 && (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Followers</th>
                        <th>Reach</th>
                        <th>Impressions</th>
                        <th>Media Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...snapshots].reverse().map((s) => (
                        <tr key={s.date}>
                          <td>{s.date}</td>
                          <td>{fmt(s.followerCount)}</td>
                          <td>{fmt(s.reach)}</td>
                          <td>{fmt(s.impressions)}</td>
                          <td>{fmt(s.mediaCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ── Demographics ─────────────────────────────────────── */}
          {tab === "demographics" && (
            <section className="panel analytics-section">
              <h2>Audience Demographics</h2>
              {!demographics || (demographics.cities.length === 0 && demographics.countries.length === 0 && demographics.genderAge.length === 0) ? (
                <div className="analytics-empty">
                  <p>No demographics data available. Instagram requires 100+ followers for audience insights.</p>
                </div>
              ) : (
                <div className="analytics-demo-grid">
                  {demographics.genderAge.length > 0 && (
                    <div className="analytics-demo-panel">
                      <h3>Age / Gender</h3>
                      <div className="analytics-chart">
                        <BarChart data={demographics.genderAge.slice(0, 12).map((e) => ({ label: e.key, value: e.value }))} />
                      </div>
                    </div>
                  )}
                  {demographics.countries.length > 0 && (
                    <div className="analytics-demo-panel">
                      <h3>Top Countries</h3>
                      <div className="analytics-chart">
                        <BarChart data={demographics.countries.slice(0, 10).map((e) => ({ label: e.key, value: e.value }))} />
                      </div>
                    </div>
                  )}
                  {demographics.cities.length > 0 && (
                    <div className="analytics-demo-panel">
                      <h3>Top Cities</h3>
                      <div className="analytics-chart">
                        <BarChart data={demographics.cities.slice(0, 10).map((e) => ({ label: e.key, value: e.value }))} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Best Posting Times ────────────────────────────────── */}
          {tab === "times" && (
            <section className="panel analytics-section">
              <h2>Best Posting Times</h2>
              <p className="analytics-section__sub">Average engagement by day of week and hour. Brighter = higher engagement.</p>
              {posts.length === 0 ? (
                <div className="analytics-empty">
                  <p>Need post data with timestamps to calculate best posting times.</p>
                </div>
              ) : (
                <div className="analytics-heatmap-wrap">
                  <div className="analytics-heatmap">
                    <div className="analytics-heatmap__corner" />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="analytics-heatmap__hour-label">
                        {h % 3 === 0 ? `${h}:00` : ""}
                      </div>
                    ))}
                    {dayLabels.map((day, d) => (
                      <React.Fragment key={`row-${d}`}>
                        <div className="analytics-heatmap__day-label">{day}</div>
                        {Array.from({ length: 24 }, (_, h) => {
                          const val = heatmapData.grid[d][h];
                          const intensity = val / heatmapData.maxVal;
                          return (
                            <div
                              key={`${d}-${h}`}
                              className="analytics-heatmap__cell"
                              style={{
                                backgroundColor: intensity > 0
                                  ? `rgba(182, 255, 39, ${0.1 + intensity * 0.8})`
                                  : "rgba(255, 255, 255, 0.03)"
                              }}
                              title={`${day} ${h}:00 — Avg engagement: ${val}`}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

// ── Helper components ────────────────────────────────────────────────

function ThSort({
  field,
  current,
  dir,
  onSort,
  children
}: {
  field: SortField;
  current: SortField;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const active = field === current;
  return (
    <th
      className={`analytics-table__sortable ${active ? "analytics-table__sortable--active" : ""}`}
      onClick={() => onSort(field)}
    >
      {children} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </th>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="analytics-bar-chart">
      {data.map((d) => (
        <div key={d.label} className="analytics-bar">
          <div className="analytics-bar__label">{d.label}</div>
          <div className="analytics-bar__track">
            <div
              className="analytics-bar__fill"
              style={{ width: `${(d.value / maxVal) * 100}%` }}
            />
          </div>
          <div className="analytics-bar__value">{d.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Utility functions ────────────────────────────────────────────────

function truncate(text: string | null, max: number): string {
  if (!text) return "(no caption)";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt(val: number | null): string {
  if (val == null) return "—";
  return val.toLocaleString();
}
