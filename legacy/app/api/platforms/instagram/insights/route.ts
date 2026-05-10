import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accountSnapshots } from "@/lib/db/schema";

const PLATFORM = "instagram";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = Number(searchParams.get("days") ?? 30);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split("T")[0];
  const untilDate = new Date().toISOString().split("T")[0];

  const snapshots = db
    .select()
    .from(accountSnapshots)
    .where(
      and(
        eq(accountSnapshots.platform, PLATFORM),
        gte(accountSnapshots.snapshotDate, sinceDate),
        lte(accountSnapshots.snapshotDate, untilDate)
      )
    )
    .orderBy(asc(accountSnapshots.snapshotDate))
    .all();

  // Calculate trend direction from first to last snapshot
  let trend: "up" | "down" | "flat" = "flat";

  if (snapshots.length >= 2) {
    const first = snapshots[0].followerCount ?? 0;
    const last = snapshots[snapshots.length - 1].followerCount ?? 0;
    trend = last > first ? "up" : last < first ? "down" : "flat";
  }

  return NextResponse.json({
    data: snapshots.map((s) => ({
      date: s.snapshotDate,
      followerCount: s.followerCount,
      mediaCount: s.mediaCount,
      reach: s.reach,
      impressions: s.impressions,
      profileViews: s.profileViews
    })),
    dateRange: { from: sinceDate, to: untilDate },
    trend
  });
}
