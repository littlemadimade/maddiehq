"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/use-toast";

type AccountState = {
  connected: boolean;
  username: string | null;
  accountId: string | null;
  snapshot: {
    media_count: number | null;
    reach: number | null;
    profile_views: number | null;
    snapshot_date: string;
  } | null;
};

type Post = {
  id: number;
  platform_post_id: string;
  caption: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  permalink: string | null;
  published_at: string | null;
};

type InsightRow = {
  postId: number;
  likes: number | null;
  comments: number | null;
  reach: number | null;
  impressions: number | null;
};

function ErrorBanner({ error }: { error: string }) {
  const labels: Record<string, string> = {
    access_denied: "You denied the Instagram authorization request.",
    missing_code_or_state: "Instagram did not return an authorization code.",
    code_exchange_failed: "Could not exchange the Instagram authorization code.",
    token_upgrade_failed: "Could not upgrade the Instagram token to a long-lived one.",
    token_store_failed: "Could not save the Instagram token. Please try again.",
    server_not_configured:
      "Instagram OAuth is not configured on this server. Set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.",
  };
  return (
    <Alert variant="error" title="Instagram connection failed">
      {labels[error] ?? error}
    </Alert>
  );
}

function InsightsContent() {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const connectedParam = params.get("connected");

  const [account, setAccount] = useState<AccountState | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [insightsByPost, setInsightsByPost] = useState<Map<number, InsightRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accountRes, postsRes, insightsRes] = await Promise.all([
        fetch("/api/platforms/instagram/account"),
        fetch("/api/platforms/instagram/posts?limit=25"),
        fetch("/api/platforms/instagram/insights"),
      ]);

      if (accountRes.ok) {
        setAccount(await accountRes.json());
      }
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts ?? []);
      }
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        const map = new Map<number, InsightRow>();
        for (const row of data.insights ?? []) {
          // First row per post wins (already sorted by snapshot_date desc).
          if (!map.has(row.postId)) map.set(row.postId, row);
        }
        setInsightsByPost(map);
      }
    } catch (err) {
      console.error("[insights] load failed", err);
      toast.error("Failed to load Instagram data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (connectedParam === "1") {
      toast.success("Instagram connected — running first sync…");
    }
  }, [connectedParam]);

  const handleConnect = () => {
    window.location.href = "/api/platforms/instagram/oauth/start";
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/platforms/instagram/sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Sync failed");
      } else {
        toast.success("Sync complete");
        await loadAll();
      }
    } catch (err) {
      console.error("[insights] sync failed", err);
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorParam ? <ErrorBanner error={errorParam} /> : null}

      <Card className="p-6">
        {account?.connected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Instagram
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Connected as @{account.username ?? account.accountId}
              </div>
              {account.snapshot ? (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {account.snapshot.media_count ?? 0} posts ·{" "}
                  reach {account.snapshot.reach ?? 0} · profile views{" "}
                  {account.snapshot.profile_views ?? 0}
                </div>
              ) : (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  No snapshot yet — run a sync to fetch data.
                </div>
              )}
            </div>
            <Button onClick={handleSync} loading={syncing} variant="primary">
              Sync now
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Connect your Instagram account
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                We&apos;ll pull your posts, insights, and audience demographics.
              </div>
            </div>
            <Button onClick={handleConnect} variant="primary">
              Connect Instagram
            </Button>
          </div>
        )}
      </Card>

      {account?.connected ? (
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
            Recent posts
          </h2>
          {posts.length === 0 ? (
            <Card className="p-6 text-sm text-gray-600 dark:text-gray-400">
              No posts synced yet. Click <strong>Sync now</strong> above.
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => {
                const insight = insightsByPost.get(post.id);
                return (
                  <li key={post.id}>
                    <Card className="overflow-hidden">
                      {post.thumbnail_url || post.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.thumbnail_url ?? post.media_url ?? ""}
                          alt={post.caption?.slice(0, 80) ?? "Instagram post"}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          No preview
                        </div>
                      )}
                      <div className="p-3">
                        <div className="line-clamp-2 text-sm text-gray-900 dark:text-gray-100">
                          {post.caption ?? <em className="text-gray-500">No caption</em>}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {insight?.likes ?? 0} ♥ · {insight?.comments ?? 0} 💬
                          </span>
                          {post.permalink ? (
                            <Link
                              href={post.permalink}
                              target="_blank"
                              className="text-primary hover:underline"
                            >
                              View
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Insights</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Instagram analytics and audience demographics.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <InsightsContent />
      </Suspense>
    </div>
  );
}
