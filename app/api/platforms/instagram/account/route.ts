import { NextResponse } from "next/server";
import {
  getAccountInfo,
  getRateLimitStatus,
  InstagramAuthError,
  InstagramRateLimitError,
  InstagramApiError
} from "@/lib/platforms/instagram";

export async function GET() {
  try {
    const account = await getAccountInfo();
    const rateLimit = getRateLimitStatus();

    return NextResponse.json({ account, rateLimit });
  } catch (error) {
    if (error instanceof InstagramAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof InstagramRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    if (error instanceof InstagramApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
