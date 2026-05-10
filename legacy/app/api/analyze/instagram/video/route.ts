import { NextResponse } from "next/server";
import { processVideoPosts } from "@/lib/ai/video-analysis";

export async function POST() {
  try {
    const result = await processVideoPosts();
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
