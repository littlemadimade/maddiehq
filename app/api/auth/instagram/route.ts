import { NextRequest, NextResponse } from "next/server";
import { exchangeForLongLivedToken, InstagramAuthError, InstagramApiError } from "@/lib/platforms/instagram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string };

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { error: "Missing required field: token (short-lived Instagram token)" },
        { status: 400 }
      );
    }

    await exchangeForLongLivedToken(body.token);

    return NextResponse.json({ status: "connected" });
  } catch (error) {
    if (error instanceof InstagramAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof InstagramApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
