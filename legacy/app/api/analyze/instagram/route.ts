import { NextRequest, NextResponse } from "next/server";
import { analyzeUnanalyzedPosts, generateContentReport, getLatestReport } from "@/lib/ai/analyze-content";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string };
    const action = body.action ?? "full";

    if (action === "analyze") {
      const result = await analyzeUnanalyzedPosts();
      return NextResponse.json({ status: "ok", result });
    }

    if (action === "report") {
      const report = await generateContentReport();
      return NextResponse.json({ status: "ok", report });
    }

    // "full" — analyze posts first, then generate report
    const analyzeResult = await analyzeUnanalyzedPosts();
    const report = await generateContentReport();
    return NextResponse.json({ status: "ok", analyzeResult, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const report = getLatestReport();

  if (!report) {
    return NextResponse.json({ report: null, message: "No analysis report yet. Run POST /api/analyze/instagram to generate one." });
  }

  return NextResponse.json({ report });
}
