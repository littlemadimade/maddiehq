import { execFileSync } from "child_process";
import { mkdirSync, existsSync, readFileSync, unlinkSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts, postAnalysis } from "@/lib/db/schema";

function getAnthropic() { return new Anthropic(); }
function getOpenAI() { return new OpenAI(); }

const TMP_DIR = "./data/tmp-video";

function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

function cleanupFile(path: string) {
  try { if (existsSync(path)) unlinkSync(path); } catch { /* ignore */ }
}

function cleanupDir(dir: string) {
  try {
    if (existsSync(dir)) {
      for (const file of readdirSync(dir)) {
        cleanupFile(join(dir, file));
      }
    }
  } catch { /* ignore */ }
}

// ── Audio Transcription ──────────────────────────────────────────────

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

function extractAudio(videoPath: string, audioPath: string): void {
  execFileSync("ffmpeg", ["-i", videoPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", "-y", audioPath], {
    timeout: 30000,
    stdio: "pipe"
  });
}

async function transcribeAudio(audioPath: string): Promise<string> {
  const file = readFileSync(audioPath);
  const audioFile = new File([file], "audio.mp3", { type: "audio/mpeg" });

  const response = await getOpenAI().audio.transcriptions.create({
    model: "whisper-1",
    file: audioFile,
    response_format: "text"
  });

  return response.trim();
}

function extractSpokenHook(transcript: string): string {
  const words = transcript.split(/\s+/).slice(0, 15);
  return words.join(" ") + (transcript.split(/\s+/).length > 15 ? "..." : "");
}

// ── Key Frame Extraction ─────────────────────────────────────────────

function getVideoDuration(videoPath: string): number {
  const output = execFileSync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    videoPath
  ], { timeout: 10000, stdio: "pipe" }).toString().trim();

  return parseFloat(output) || 0;
}

function extractKeyFrames(videoPath: string, outputDir: string, count = 5): string[] {
  mkdirSync(outputDir, { recursive: true });
  const duration = getVideoDuration(videoPath);

  if (duration <= 0) return [];

  const timestamps = Array.from({ length: count }, (_, i) => {
    if (i === 0) return 0.5;
    if (i === count - 1) return Math.max(0.5, duration - 0.5);
    return (duration * i) / (count - 1);
  });

  const framePaths: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const framePath = join(outputDir, `frame_${i}.jpg`);
    try {
      execFileSync("ffmpeg", [
        "-ss", String(timestamps[i]),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "2",
        "-y", framePath
      ], { timeout: 10000, stdio: "pipe" });

      if (existsSync(framePath)) {
        framePaths.push(framePath);
      }
    } catch {
      // Skip frame if extraction fails
    }
  }

  return framePaths;
}

async function analyzeKeyFrames(framePaths: string[]): Promise<string> {
  if (framePaths.length === 0) return "{}";

  const imageContent: Array<
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } }
    | { type: "text"; text: string }
  > = [];

  for (let i = 0; i < framePaths.length; i++) {
    const imageData = readFileSync(framePaths[i]).toString("base64");
    imageContent.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: imageData }
    });
    imageContent.push({
      type: "text",
      text: `Frame ${i + 1} of ${framePaths.length}${i === 0 ? " (opening)" : i === framePaths.length - 1 ? " (ending)" : ""}`
    });
  }

  imageContent.push({
    type: "text",
    text: `These are ${framePaths.length} key frames from an Instagram reel. Analyze them as a sequence and return ONLY a JSON object:
{
  "appearance": "what the creator is wearing, hair, makeup — be specific",
  "location": "where they are — be specific about the setting",
  "poses": "how they're positioned/moving across the frames",
  "scene_changes": "do the scenes change? describe transitions",
  "energy": "low/medium/high — overall vibe of the visual content",
  "props_or_objects": "anything notable in the frame besides the creator",
  "visual_narrative": "1-2 sentences describing the visual story arc from first to last frame"
}

Return only the JSON, no other text.`
  });

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [{ role: "user", content: imageContent }]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : "{}";
}

// ── Batch Processing ─────────────────────────────────────────────────

export interface VideoAnalysisResult {
  transcribed: number;
  framesAnalyzed: number;
  skipped: number;
  errors: number;
}

export type ProgressCallback = (event: {
  phase: string;
  step: string;
  current: number;
  total: number;
}) => void;

export async function processVideoPosts(limit = 50, onProgress?: ProgressCallback): Promise<VideoAnalysisResult> {
  ensureTmpDir();

  // Find video posts that have a media_url and an analysis row but no transcript
  const videoPosts = db
    .select({
      id: posts.id,
      platformPostId: posts.platformPostId,
      mediaUrl: posts.mediaUrl,
      analysisId: postAnalysis.id,
      transcript: postAnalysis.transcript
    })
    .from(posts)
    .innerJoin(postAnalysis, eq(postAnalysis.postId, posts.id))
    .where(
      and(
        eq(posts.mediaType, "VIDEO"),
        isNotNull(posts.mediaUrl)
      )
    )
    .limit(limit * 2) // fetch extra since we filter below
    .all()
    .filter((p) => !p.transcript)
    .slice(0, limit);

  let transcribed = 0;
  let framesAnalyzed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < videoPosts.length; i++) {
    const post = videoPosts[i];
    onProgress?.({ phase: "video", step: `Processing video ${i + 1} of ${videoPosts.length}`, current: i + 1, total: videoPosts.length });

    if (!post.mediaUrl) { skipped++; continue; }

    const videoPath = join(TMP_DIR, `${post.platformPostId}.mp4`);
    const audioPath = join(TMP_DIR, `${post.platformPostId}.mp3`);
    const framesDir = join(TMP_DIR, `frames_${post.platformPostId}`);

    try {
      // Download video
      await downloadVideo(post.mediaUrl, videoPath);

      // Transcribe audio
      let transcript = "";
      let spokenHook = "";
      try {
        extractAudio(videoPath, audioPath);
        transcript = await transcribeAudio(audioPath);
        spokenHook = extractSpokenHook(transcript);
        transcribed++;
      } catch {
        transcript = "(no audio detected)";
      }

      // Extract and analyze key frames
      let keyFrameAnalysis = "{}";
      try {
        const framePaths = extractKeyFrames(videoPath, framesDir, 5);
        if (framePaths.length > 0) {
          keyFrameAnalysis = await analyzeKeyFrames(framePaths);
          framesAnalyzed++;
        }
        cleanupDir(framesDir);
      } catch {
        // Frame analysis failed
      }

      // Update post_analysis
      db.update(postAnalysis)
        .set({ transcript, spokenHook, keyFrameAnalysis })
        .where(eq(postAnalysis.postId, post.id))
        .run();

    } catch {
      errors++;
    } finally {
      cleanupFile(videoPath);
      cleanupFile(audioPath);
      cleanupDir(framesDir);
    }
  }

  return { transcribed, framesAnalyzed, skipped, errors };
}
