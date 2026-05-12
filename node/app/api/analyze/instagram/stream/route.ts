export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import {
  analyzeUnanalyzedPosts,
  generateContentReport,
} from "@/lib/ai/analyze-content";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ phase: "analyze", step: "Starting post analysis...", current: 0, total: 0 });

        const analyzeResult = await analyzeUnanalyzedPosts(userId, 500, (event) => {
          send(event);
        });

        send({
          phase: "analyze",
          step: `Post analysis complete: ${analyzeResult.analyzed} analyzed`,
          current: analyzeResult.analyzed,
          total: analyzeResult.analyzed,
          done: true,
        });

        send({ phase: "report", step: "Generating AI insights report...", current: 0, total: 1 });

        const report = await generateContentReport(userId, (event) => {
          send(event);
        });

        send({
          phase: "report",
          step: "Report complete",
          current: 1,
          total: 1,
          done: true,
        });

        send({ phase: "complete", report });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ phase: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
