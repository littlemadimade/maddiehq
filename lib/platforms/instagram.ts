import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platforms } from "@/lib/db/schema";
import { requireInstagramCredentials } from "./config";

// ── Types ────────────────────────────────────────────────────────────

export interface InstagramAccountInfo {
  id: string;
  username: string;
  followersCount: number;
  mediaCount: number;
}

export interface InstagramMedia {
  id: string;
  caption: string | null;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  permalink: string;
}

export interface InstagramMediaPage {
  data: InstagramMedia[];
  nextCursor: string | null;
}

export interface InstagramPostInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
}

export interface InstagramAccountInsight {
  date: string;
  reach: number;
  impressions: number;
  followerCount: number;
}

export interface InstagramDemographicEntry {
  key: string;
  value: number;
}

export interface InstagramDemographics {
  cities: InstagramDemographicEntry[];
  countries: InstagramDemographicEntry[];
  genderAge: InstagramDemographicEntry[];
}

interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

// ── Error classes ────────────────────────────────────────────────────

export class InstagramAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramAuthError";
  }
}

export class InstagramRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramRateLimitError";
  }
}

export class InstagramApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "InstagramApiError";
    this.code = code;
  }
}

// ── Rate limit tracking ──────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 200;

let rateLimitState = {
  count: 0,
  windowStart: Date.now()
};

function checkRateLimit() {
  const now = Date.now();

  if (now - rateLimitState.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitState = { count: 0, windowStart: now };
  }

  if (rateLimitState.count >= RATE_LIMIT_MAX) {
    throw new InstagramRateLimitError(
      `Rate limit reached (${RATE_LIMIT_MAX} requests/hour). Resets at ${new Date(rateLimitState.windowStart + RATE_LIMIT_WINDOW_MS).toISOString()}`
    );
  }

  rateLimitState.count++;
}

export function getRateLimitStatus() {
  return {
    used: rateLimitState.count,
    remaining: RATE_LIMIT_MAX - rateLimitState.count,
    resetsAt: new Date(rateLimitState.windowStart + RATE_LIMIT_WINDOW_MS).toISOString()
  };
}

// ── Token management ─────────────────────────────────────────────────

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const PLATFORM_NAME = "instagram";

async function graphFetch<T>(url: string): Promise<T> {
  checkRateLimit();

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || (data as GraphApiError).error) {
    const err = (data as GraphApiError).error;
    const code = err?.code ?? response.status;
    const message = err?.message ?? `Instagram API error: ${response.status}`;

    if (code === 190 || err?.error_subcode === 463) {
      throw new InstagramAuthError(message);
    }

    if (response.status === 429 || code === 4 || code === 32) {
      throw new InstagramRateLimitError(message);
    }

    throw new InstagramApiError(message, code);
  }

  return data as T;
}

function getStoredToken(): { accessToken: string; expiresAt: string; accountId: string } | null {
  const [row] = db
    .select()
    .from(platforms)
    .where(eq(platforms.platform, PLATFORM_NAME))
    .limit(1)
    .all();

  if (!row?.accessToken || !row?.tokenExpiresAt) {
    return null;
  }

  return {
    accessToken: row.accessToken,
    expiresAt: row.tokenExpiresAt,
    accountId: row.accountId
  };
}

function tokenExpiresWithinDays(expiresAt: string, days: number): boolean {
  const expiryDate = new Date(expiresAt);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return expiryDate <= threshold;
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<void> {
  const creds = requireInstagramCredentials();

  const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${creds.appId}&client_secret=${creds.appSecret}&fb_exchange_token=${shortLivedToken}`;

  const result = await graphFetch<{ access_token: string; token_type: string; expires_in: number }>(url);

  // Calculate expiry date
  const expiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();

  // Discover the Instagram Business Account ID
  const pagesResult = await graphFetch<{ data: Array<{ id: string; instagram_business_account?: { id: string } }> }>(
    `${GRAPH_API_BASE}/me/accounts?fields=id,instagram_business_account&access_token=${result.access_token}`
  );

  const igAccount = pagesResult.data.find((page) => page.instagram_business_account)?.instagram_business_account;

  if (!igAccount) {
    throw new InstagramApiError(
      "No Instagram Business Account found. Make sure the Instagram account is a Business account linked to a Facebook Page.",
      0
    );
  }

  // Get the username
  const accountInfo = await graphFetch<{ username: string }>(
    `${GRAPH_API_BASE}/${igAccount.id}?fields=username&access_token=${result.access_token}`
  );

  // Upsert into platforms table
  const existing = db
    .select()
    .from(platforms)
    .where(eq(platforms.platform, PLATFORM_NAME))
    .all();

  const now = new Date().toISOString();

  if (existing.length > 0) {
    db.update(platforms)
      .set({
        accountId: igAccount.id,
        username: accountInfo.username,
        accessToken: result.access_token,
        tokenExpiresAt: expiresAt,
        updatedAt: now
      })
      .where(eq(platforms.platform, PLATFORM_NAME))
      .run();
  } else {
    db.insert(platforms)
      .values({
        platform: PLATFORM_NAME,
        accountId: igAccount.id,
        username: accountInfo.username,
        accessToken: result.access_token,
        tokenExpiresAt: expiresAt,
        createdAt: now,
        updatedAt: now
      })
      .run();
  }
}

async function refreshTokenIfNeeded(): Promise<string> {
  const stored = getStoredToken();

  if (!stored) {
    throw new InstagramAuthError("No Instagram token found. Connect your account first via POST /api/auth/instagram.");
  }

  // Refresh if token expires within 7 days
  if (tokenExpiresWithinDays(stored.expiresAt, 7)) {
    const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${requireInstagramCredentials().appId}&client_secret=${requireInstagramCredentials().appSecret}&fb_exchange_token=${stored.accessToken}`;

    const result = await graphFetch<{ access_token: string; expires_in: number }>(url);
    const newExpiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();

    db.update(platforms)
      .set({
        accessToken: result.access_token,
        tokenExpiresAt: newExpiresAt,
        updatedAt: new Date().toISOString()
      })
      .where(eq(platforms.platform, PLATFORM_NAME))
      .run();

    return result.access_token;
  }

  return stored.accessToken;
}

async function getTokenAndAccountId(): Promise<{ token: string; accountId: string }> {
  const token = await refreshTokenIfNeeded();
  const stored = getStoredToken();

  if (!stored) {
    throw new InstagramAuthError("No Instagram account connected.");
  }

  return { token, accountId: stored.accountId };
}

// ── API methods ──────────────────────────────────────────────────────

export async function getAccountInfo(): Promise<InstagramAccountInfo> {
  const { token, accountId } = await getTokenAndAccountId();

  const result = await graphFetch<{
    id: string;
    username: string;
    followers_count: number;
    media_count: number;
  }>(`${GRAPH_API_BASE}/${accountId}?fields=id,username,followers_count,media_count&access_token=${token}`);

  return {
    id: result.id,
    username: result.username,
    followersCount: result.followers_count,
    mediaCount: result.media_count
  };
}

export async function getMedia(cursor?: string): Promise<InstagramMediaPage> {
  const { token, accountId } = await getTokenAndAccountId();

  let url = `${GRAPH_API_BASE}/${accountId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${token}`;

  if (cursor) {
    url += `&after=${cursor}`;
  }

  const result = await graphFetch<{
    data: Array<{
      id: string;
      caption?: string;
      timestamp: string;
      like_count: number;
      comments_count: number;
      media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
      permalink: string;
    }>;
    paging?: { cursors?: { after?: string } };
  }>(url);

  return {
    data: result.data.map((item) => ({
      id: item.id,
      caption: item.caption ?? null,
      timestamp: item.timestamp,
      likeCount: item.like_count,
      commentsCount: item.comments_count,
      mediaType: item.media_type,
      permalink: item.permalink
    })),
    nextCursor: result.paging?.cursors?.after ?? null
  };
}

export async function getPostInsights(mediaId: string): Promise<InstagramPostInsights> {
  const { token } = await getTokenAndAccountId();

  const result = await graphFetch<{
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  }>(`${GRAPH_API_BASE}/${mediaId}/insights?metric=impressions,reach,engagement,saved&access_token=${token}`);

  const metrics: Record<string, number> = {};

  for (const metric of result.data) {
    metrics[metric.name] = metric.values[0]?.value ?? 0;
  }

  return {
    impressions: metrics.impressions ?? 0,
    reach: metrics.reach ?? 0,
    engagement: metrics.engagement ?? 0,
    saved: metrics.saved ?? 0
  };
}

export async function getAccountInsights(since: Date, until: Date): Promise<InstagramAccountInsight[]> {
  const { token, accountId } = await getTokenAndAccountId();

  const sinceUnix = Math.floor(since.getTime() / 1000);
  const untilUnix = Math.floor(until.getTime() / 1000);

  const result = await graphFetch<{
    data: Array<{
      name: string;
      values: Array<{ value: number; end_time: string }>;
    }>;
  }>(
    `${GRAPH_API_BASE}/${accountId}/insights?metric=reach,impressions,follower_count&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${token}`
  );

  // Pivot from metric-first to date-first
  const byDate = new Map<string, { reach: number; impressions: number; followerCount: number }>();

  for (const metric of result.data) {
    for (const point of metric.values) {
      const date = point.end_time.split("T")[0];
      const existing = byDate.get(date) ?? { reach: 0, impressions: 0, followerCount: 0 };

      if (metric.name === "reach") existing.reach = point.value;
      if (metric.name === "impressions") existing.impressions = point.value;
      if (metric.name === "follower_count") existing.followerCount = point.value;

      byDate.set(date, existing);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDemographics(): Promise<InstagramDemographics> {
  const { token, accountId } = await getTokenAndAccountId();

  const result = await graphFetch<{
    data: Array<{
      name: string;
      values: Array<{ value: Record<string, number> }>;
    }>;
  }>(
    `${GRAPH_API_BASE}/${accountId}/insights?metric=audience_city,audience_country,audience_gender_age&period=lifetime&access_token=${token}`
  );

  function toEntries(metricName: string): InstagramDemographicEntry[] {
    const metric = result.data.find((m) => m.name === metricName);
    const values = metric?.values[0]?.value ?? {};
    return Object.entries(values)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  return {
    cities: toEntries("audience_city"),
    countries: toEntries("audience_country"),
    genderAge: toEntries("audience_gender_age")
  };
}
