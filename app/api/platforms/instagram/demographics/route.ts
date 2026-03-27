import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { demographics } from "@/lib/db/schema";

const PLATFORM = "instagram";

export async function GET() {
  // Get the most recent snapshot date
  const latest = db
    .select({ snapshotDate: demographics.snapshotDate })
    .from(demographics)
    .where(eq(demographics.platform, PLATFORM))
    .orderBy(desc(demographics.snapshotDate))
    .limit(1)
    .all();

  if (latest.length === 0) {
    return NextResponse.json({
      data: { cities: [], countries: [], genderAge: [] },
      snapshotDate: null,
      message: "No demographics data yet. Run a sync first, and note that Instagram requires 100+ followers for demographics."
    });
  }

  const snapshotDate = latest[0].snapshotDate;

  const rows = db
    .select()
    .from(demographics)
    .where(
      and(
        eq(demographics.platform, PLATFORM),
        eq(demographics.snapshotDate, snapshotDate)
      )
    )
    .all();

  const cities = rows
    .filter((r) => r.metric === "city")
    .map((r) => ({ key: r.key, value: r.value }))
    .sort((a, b) => b.value - a.value);

  const countries = rows
    .filter((r) => r.metric === "country")
    .map((r) => ({ key: r.key, value: r.value }))
    .sort((a, b) => b.value - a.value);

  const genderAge = rows
    .filter((r) => r.metric === "gender_age")
    .map((r) => ({ key: r.key, value: r.value }))
    .sort((a, b) => b.value - a.value);

  return NextResponse.json({
    data: { cities, countries, genderAge },
    snapshotDate
  });
}
