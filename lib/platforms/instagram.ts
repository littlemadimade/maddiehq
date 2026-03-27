import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { platforms } from "@/lib/db/schema";

// ── Types ────────────────────────────────────────────────────────────

export interface InstagramAccountInfo {
  id: string;
  userId: string;
  username: string;
  accountType: string;
  mediaCount: number;
}

export interface InstagramMedia {
  id: string;
  caption: string | null;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  mediaType: string;
  permalink: string;
}

export interface InstagramMediaPage {
  data: InstagramMedia[];
  nextCursor: string | null;
}

export interface InstagramPostInsights {
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  totalInteractions: number;
}

export interface InstagramAccountInsights {
  reach: number;
  profileViews: number;
}

export interface InstagramDemographicEntry {
  key: string;
  value: number;
}

export interface InstagramDemographics {
  ageGender: InstagramDemographicEntry[];
  countries: InstagramDemographicEntry[];
  cities: InstagramDemographicEntry[];
}

interface IGApiError {
  error: {
    message: string;
    type: string;
    code: number;
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

// Rate limiting is handled by Instagram's API (returns 429 when exceeded).
// We catch 429 responses in igFetch and throw InstagramRateLimitError.

// ── Core fetch ───────────────────────────────────────────────────────

const IG_API_BASE = "https://graph.instagram.com/v21.0";
const PLATFORM_NAME = "instagram";

async function igFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || (data as IGApiError).error) {
    const err = (data as IGApiError).error;
    const code = err?.code ?? response.status;
    const message = err?.message ?? `Instagram API error: ${response.status}`;

    if (code === 190) {
      throw new InstagramAuthError(message);
    }

    if (response.status === 429 || code === 4) {
      throw new InstagramRateLimitError(message);
    }

    throw new InstagramApiError(message, code);
  }

  return data as T;
}

// ── Token management ─────────────────────────────────────────────────

function getStoredToken(): string | null {
  const [row] = db
    .select()
    .from(platforms)
    .where(eq(platforms.platform, PLATFORM_NAME))
    .limit(1)
    .all();

  return row?.accessToken ?? null;
}

function getToken(): string {
  const token = getStoredToken();

  if (!token) {
    throw new InstagramAuthError(
      "No Instagram token found. Connect your account first via POST /api/auth/instagram."
    );
  }

  return token;
}

export async function storeToken(token: string): Promise<InstagramAccountInfo> {
  // Verify the token works and get account info
  const account = await igFetch<{
    user_id: string;
    username: string;
    account_type: string;
    media_count: number;
    id: string;
  }>(`${IG_API_BASE}/me?fields=user_id,username,account_type,media_count&access_token=${token}`);

  const now = new Date().toISOString();

  // Upsert into platforms table
  const existing = db
    .select()
    .from(platforms)
    .where(eq(platforms.platform, PLATFORM_NAME))
    .all();

  if (existing.length > 0) {
    db.update(platforms)
      .set({
        accountId: account.user_id,
        username: account.username,
        accessToken: token,
        updatedAt: now
      })
      .where(eq(platforms.platform, PLATFORM_NAME))
      .run();
  } else {
    db.insert(platforms)
      .values({
        platform: PLATFORM_NAME,
        accountId: account.user_id,
        username: account.username,
        accessToken: token,
        createdAt: now,
        updatedAt: now
      })
      .run();
  }

  return {
    id: account.id,
    userId: account.user_id,
    username: account.username,
    accountType: account.account_type,
    mediaCount: account.media_count
  };
}

// ── API methods ──────────────────────────────────────────────────────

export async function getAccountInfo(): Promise<InstagramAccountInfo> {
  const token = getToken();

  const result = await igFetch<{
    user_id: string;
    username: string;
    account_type: string;
    media_count: number;
    id: string;
  }>(`${IG_API_BASE}/me?fields=user_id,username,account_type,media_count&access_token=${token}`);

  return {
    id: result.id,
    userId: result.user_id,
    username: result.username,
    accountType: result.account_type,
    mediaCount: result.media_count
  };
}

export async function getMedia(cursor?: string): Promise<InstagramMediaPage> {
  const token = getToken();

  let url = `${IG_API_BASE}/me/media?fields=id,caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${token}`;

  if (cursor) {
    url += `&after=${cursor}`;
  }

  const result = await igFetch<{
    data: Array<{
      id: string;
      caption?: string;
      timestamp: string;
      like_count: number;
      comments_count: number;
      media_type: string;
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
  const token = getToken();

  const result = await igFetch<{
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  }>(`${IG_API_BASE}/${mediaId}/insights?metric=views,reach,likes,comments,shares,saved,total_interactions&access_token=${token}`);

  const metrics: Record<string, number> = {};

  for (const metric of result.data) {
    metrics[metric.name] = metric.values[0]?.value ?? 0;
  }

  return {
    views: metrics.views ?? 0,
    reach: metrics.reach ?? 0,
    likes: metrics.likes ?? 0,
    comments: metrics.comments ?? 0,
    shares: metrics.shares ?? 0,
    saved: metrics.saved ?? 0,
    totalInteractions: metrics.total_interactions ?? 0
  };
}

export async function getAccountInsights(since: Date, until: Date): Promise<InstagramAccountInsights> {
  const token = getToken();

  const sinceUnix = Math.floor(since.getTime() / 1000);
  const untilUnix = Math.floor(until.getTime() / 1000);

  const result = await igFetch<{
    data: Array<{
      name: string;
      total_value: { value: number };
    }>;
  }>(
    `${IG_API_BASE}/me/insights?metric=reach,profile_views&metric_type=total_value&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${token}`
  );

  const metrics: Record<string, number> = {};

  for (const metric of result.data) {
    metrics[metric.name] = metric.total_value?.value ?? 0;
  }

  return {
    reach: metrics.reach ?? 0,
    profileViews: metrics.profile_views ?? 0
  };
}

export async function getDemographics(): Promise<InstagramDemographics> {
  const token = getToken();

  // Age/gender breakdown
  const ageGenderResult = await igFetch<{
    data: Array<{
      name: string;
      total_value: {
        breakdowns: Array<{
          dimension_keys: string[];
          results: Array<{ dimension_values: string[]; value: number }>;
        }>;
      };
    }>;
  }>(
    `${IG_API_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&timeframe=last_30_days&breakdown=age,gender&access_token=${token}`
  );

  const ageGender: InstagramDemographicEntry[] = [];
  const ageGenderData = ageGenderResult.data[0]?.total_value?.breakdowns[0]?.results ?? [];
  for (const entry of ageGenderData) {
    const [age, gender] = entry.dimension_values;
    ageGender.push({ key: `${gender}.${age}`, value: entry.value });
  }

  // Country breakdown
  const countryResult = await igFetch<{
    data: Array<{
      name: string;
      total_value: {
        breakdowns: Array<{
          dimension_keys: string[];
          results: Array<{ dimension_values: string[]; value: number }>;
        }>;
      };
    }>;
  }>(
    `${IG_API_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&timeframe=last_30_days&breakdown=country&access_token=${token}`
  );

  const countries: InstagramDemographicEntry[] = [];
  const countryData = countryResult.data[0]?.total_value?.breakdowns[0]?.results ?? [];
  for (const entry of countryData) {
    countries.push({ key: entry.dimension_values[0], value: entry.value });
  }

  // City breakdown
  const cityResult = await igFetch<{
    data: Array<{
      name: string;
      total_value: {
        breakdowns: Array<{
          dimension_keys: string[];
          results: Array<{ dimension_values: string[]; value: number }>;
        }>;
      };
    }>;
  }>(
    `${IG_API_BASE}/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&timeframe=last_30_days&breakdown=city&access_token=${token}`
  );

  const cities: InstagramDemographicEntry[] = [];
  const cityData = cityResult.data[0]?.total_value?.breakdowns[0]?.results ?? [];
  for (const entry of cityData) {
    cities.push({ key: entry.dimension_values[0], value: entry.value });
  }

  return {
    ageGender: ageGender.sort((a, b) => b.value - a.value),
    countries: countries.sort((a, b) => b.value - a.value),
    cities: cities.sort((a, b) => b.value - a.value)
  };
}
