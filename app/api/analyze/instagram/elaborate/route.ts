import { NextRequest, NextResponse } from "next/server";
import { elaboratePattern } from "@/lib/ai/analyze-content";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      title?: string;
      description?: string;
      evidence?: string;
    };

    if (!body.title || !body.description) {
      return NextResponse.json({ error: "Missing title or description" }, { status: 400 });
    }

    const elaboration = await elaboratePattern({
      title: body.title,
      description: body.description ?? "",
      evidence: body.evidence ?? ""
    });

    return NextResponse.json({ elaboration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
