import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts, postInsights } from "@/lib/db/schema";

const PLATFORM = "instagram";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), MAX_LIMIT);
  const offset = Number(searchParams.get("offset") ?? 0);
  const sortBy = searchParams.get("sort") ?? "published_at";
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  // Get posts with their latest insights
  const rows = db
    .select({
      id: posts.id,
      platformPostId: posts.platformPostId,
      caption: posts.caption,
      mediaType: posts.mediaType,
      permalink: posts.permalink,
      publishedAt: posts.publishedAt,
      impressions: postInsights.impressions,
      reach: postInsights.reach,
      engagement: postInsights.engagement,
      saves: postInsights.saves,
      likes: postInsights.likes,
      comments: postInsights.comments,
      snapshotDate: postInsights.snapshotDate
    })
    .from(posts)
    .leftJoin(
      postInsights,
      and(
        eq(postInsights.postId, posts.id),
        eq(
          postInsights.snapshotDate,
          db
            .select({ maxDate: sql<string>`MAX(${postInsights.snapshotDate})` })
            .from(postInsights)
            .where(eq(postInsights.postId, posts.id))
        )
      )
    )
    .where(eq(posts.platform, PLATFORM))
    .orderBy(
      sortDir === "asc"
        ? sql`${getSortColumn(sortBy)} ASC`
        : sql`${getSortColumn(sortBy)} DESC`
    )
    .limit(limit)
    .offset(offset)
    .all();

  const total = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(posts)
    .where(eq(posts.platform, PLATFORM))
    .all()[0].count;

  return NextResponse.json({
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  });
}

function getSortColumn(sortBy: string) {
  switch (sortBy) {
    case "engagement": return postInsights.engagement;
    case "reach": return postInsights.reach;
    case "impressions": return postInsights.impressions;
    case "saves": return postInsights.saves;
    case "likes": return postInsights.likes;
    case "comments": return postInsights.comments;
    default: return posts.publishedAt;
  }
}
