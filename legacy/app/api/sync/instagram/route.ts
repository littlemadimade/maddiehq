import { NextResponse } from "next/server";
import { syncAllInstagram } from "@/lib/sync/instagram";
import { InstagramAuthError, InstagramRateLimitError } from "@/lib/platforms/instagram";

export async function POST() {
  try {
    const result = await syncAllInstagram();
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    if (error instanceof InstagramAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof InstagramRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
