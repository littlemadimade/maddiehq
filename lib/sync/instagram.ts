import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts, postInsights, accountSnapshots, demographics } from "@/lib/db/schema";
import {
  getMedia,
  getPostInsights,
  getAccountInfo,
  getAccountInsights,
  getDemographics
} from "@/lib/platforms/instagram";

const PLATFORM = "instagram";

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Posts + Per-Post Insights ────────────────────────────────────────

export interface SyncPostsResult {
  postsUpserted: number;
  insightsUpserted: number;
  pagesProcessed: number;
}

export async function syncInstagramPosts(maxPages = 10): Promise<SyncPostsResult> {
  let cursor: string | undefined;
  let postsUpserted = 0;
  let insightsUpserted = 0;
  let pagesProcessed = 0;
  const today = todayDate();

  for (let page = 0; page < maxPages; page++) {
    const mediaPage = await getMedia(cursor);
    pagesProcessed++;

    for (const media of mediaPage.data) {
      // Upsert post
      const existing = db
        .select()
        .from(posts)
        .where(and(eq(posts.platform, PLATFORM), eq(posts.platformPostId, media.id)))
        .all();

      let postId: number;

      if (existing.length > 0) {
        postId = existing[0].id;
        db.update(posts)
          .set({
            caption: media.caption,
            mediaType: media.mediaType,
            permalink: media.permalink,
            publishedAt: media.timestamp
          })
          .where(eq(posts.id, postId))
          .run();
      } else {
        const result = db.insert(posts)
          .values({
            platformPostId: media.id,
            platform: PLATFORM,
            caption: media.caption,
            mediaType: media.mediaType,
            permalink: media.permalink,
            publishedAt: media.timestamp
          })
          .run();
        postId = Number(result.lastInsertRowid);
      }

      postsUpserted++;

      // Fetch and upsert insights for this post
      try {
        const insights = await getPostInsights(media.id);

        const existingInsight = db
          .select()
          .from(postInsights)
          .where(and(eq(postInsights.postId, postId), eq(postInsights.snapshotDate, today)))
          .all();

        if (existingInsight.length > 0) {
          db.update(postInsights)
            .set({
              impressions: insights.views,
              reach: insights.reach,
              engagement: insights.totalInteractions,
              saves: insights.saved,
              likes: insights.likes,
              comments: insights.comments,
              shares: insights.shares
            })
            .where(eq(postInsights.id, existingInsight[0].id))
            .run();
        } else {
          db.insert(postInsights)
            .values({
              postId,
              snapshotDate: today,
              impressions: insights.views,
              reach: insights.reach,
              engagement: insights.totalInteractions,
              saves: insights.saved,
              likes: insights.likes,
              comments: insights.comments,
              shares: insights.shares
            })
            .run();
        }

        insightsUpserted++;
      } catch {
        // Some media types may not support all insight metrics — skip gracefully
      }
    }

    if (!mediaPage.nextCursor) {
      break;
    }

    cursor = mediaPage.nextCursor;
  }

  return { postsUpserted, insightsUpserted, pagesProcessed };
}

// ── Account Snapshots ────────────────────────────────────────────────

export interface SyncAccountResult {
  snapshotsUpserted: number;
}

export async function syncInstagramAccount(): Promise<SyncAccountResult> {
  const today = todayDate();
  const accountInfo = await getAccountInfo();

  // Fetch the last 7 days of account insights
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const until = new Date();

  const insights = await getAccountInsights(since, until);

  // Upsert today's snapshot
  const existing = db
    .select()
    .from(accountSnapshots)
    .where(and(eq(accountSnapshots.platform, PLATFORM), eq(accountSnapshots.snapshotDate, today)))
    .all();

  if (existing.length > 0) {
    db.update(accountSnapshots)
      .set({
        mediaCount: accountInfo.mediaCount,
        reach: insights.reach,
        profileViews: insights.profileViews
      })
      .where(eq(accountSnapshots.id, existing[0].id))
      .run();
  } else {
    db.insert(accountSnapshots)
      .values({
        platform: PLATFORM,
        snapshotDate: today,
        mediaCount: accountInfo.mediaCount,
        reach: insights.reach,
        profileViews: insights.profileViews
      })
      .run();
  }

  return { snapshotsUpserted: 1 };
}

// ── Demographics ─────────────────────────────────────────────────────

export interface SyncDemographicsResult {
  entriesUpserted: number;
}

export async function syncInstagramDemographics(): Promise<SyncDemographicsResult> {
  const today = todayDate();
  let entriesUpserted = 0;

  try {
    const demo = await getDemographics();

    const allEntries: Array<{ metric: string; key: string; value: number }> = [
      ...demo.ageGender.map((e) => ({ metric: "gender_age" as const, ...e })),
      ...demo.countries.map((e) => ({ metric: "country" as const, ...e })),
      ...demo.cities.map((e) => ({ metric: "city" as const, ...e }))
    ];

    for (const entry of allEntries) {
      const existing = db
        .select()
        .from(demographics)
        .where(
          and(
            eq(demographics.platform, PLATFORM),
            eq(demographics.snapshotDate, today),
            eq(demographics.metric, entry.metric),
            eq(demographics.key, entry.key)
          )
        )
        .all();

      if (existing.length > 0) {
        db.update(demographics)
          .set({ value: entry.value })
          .where(eq(demographics.id, existing[0].id))
          .run();
      } else {
        db.insert(demographics)
          .values({
            platform: PLATFORM,
            snapshotDate: today,
            metric: entry.metric,
            key: entry.key,
            value: entry.value
          })
          .run();
      }

      entriesUpserted++;
    }
  } catch {
    // Demographics require sufficient followers — skip gracefully
  }

  return { entriesUpserted };
}

// ── Full sync orchestrator ───────────────────────────────────────────

export interface SyncAllResult {
  posts: SyncPostsResult;
  account: SyncAccountResult;
  demographics: SyncDemographicsResult;
}

export async function syncAllInstagram(): Promise<SyncAllResult> {
  const postsResult = await syncInstagramPosts();
  const accountResult = await syncInstagramAccount();
  const demographicsResult = await syncInstagramDemographics();

  return {
    posts: postsResult,
    account: accountResult,
    demographics: demographicsResult
  };
}
