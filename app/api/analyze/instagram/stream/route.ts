import { analyzeUnanalyzedPosts, generateContentReport } from "@/lib/ai/analyze-content";
import { processVideoPosts } from "@/lib/ai/video-analysis";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Phase 1: Base analysis
        send({ phase: "analyze", step: "Starting post analysis...", current: 0, total: 0 });

        const analyzeResult = await analyzeUnanalyzedPosts(500, (event) => {
          send(event);
        });

        send({
          phase: "analyze",
          step: `Post analysis complete: ${analyzeResult.analyzed} analyzed`,
          current: analyzeResult.analyzed,
          total: analyzeResult.analyzed,
          done: true
        });

        // Phase 2: Video processing
        send({ phase: "video", step: "Starting video processing...", current: 0, total: 0 });

        const videoResult = await processVideoPosts(50, (event) => {
          send(event);
        });

        send({
          phase: "video",
          step: `Video processing complete: ${videoResult.transcribed} transcribed, ${videoResult.framesAnalyzed} frames analyzed`,
          current: videoResult.transcribed,
          total: videoResult.transcribed,
          done: true
        });

        // Phase 3: Report generation
        send({ phase: "report", step: "Generating AI insights report...", current: 0, total: 1 });

        const report = await generateContentReport((event) => {
          send(event);
        });

        send({
          phase: "report",
          step: "Report complete",
          current: 1,
          total: 1,
          done: true
        });

        // Final: send the report
        send({ phase: "complete", report });

      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ phase: "error", error: message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
