import Anthropic from "@anthropic-ai/sdk";
import { eq, isNull, desc, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts, postInsights, postAnalysis, contentInsights } from "@/lib/db/schema";

const client = new Anthropic();

// ── Types ────────────────────────────────────────────────────────────

interface VisualAnalysis {
  setting: string;
  lighting: string;
  face_visible: boolean;
  text_overlay: boolean;
  visual_style: string;
}

interface CaptionAnalysis {
  hookType: string;
  ctaPresent: boolean;
  ctaType: string;
  captionTone: string;
}

interface PostWithInsights {
  id: number;
  caption: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  publishedAt: string | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  saves: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

export interface ContentReport {
  patterns: Array<{
    title: string;
    description: string;
    evidence: string;
    impact: string;
  }>;
  recommendations: Array<{
    action: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
  }>;
  summary: string;
  postsAnalyzed: number;
  generatedAt: string;
}

// ── Single post analysis ─────────────────────────────────────────────

async function analyzePostVisual(imageUrl: string): Promise<VisualAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "url", url: imageUrl }
        },
        {
          type: "text",
          text: `Analyze this Instagram post image. Return ONLY a JSON object with these fields:
- "setting": one of "indoor", "outdoor", "studio", "car", "mixed"
- "lighting": one of "natural", "artificial", "dramatic", "mixed"
- "face_visible": boolean, is a human face clearly visible
- "text_overlay": boolean, is there text overlaid on the image
- "visual_style": a brief 3-5 word description of the visual aesthetic

Return only the JSON, no other text.`
        }
      ]
    }]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { setting: "unknown", lighting: "unknown", face_visible: false, text_overlay: false, visual_style: "unknown" };
  }

  return JSON.parse(jsonMatch[0]) as VisualAnalysis;
}

function analyzeCaptionStructure(caption: string): CaptionAnalysis & { emojiCount: number; hashtagCount: number; captionLength: number } {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  const emojiCount = (caption.match(emojiRegex) ?? []).length;
  const hashtagCount = (caption.match(/#\w+/g) ?? []).length;
  const captionLength = caption.length;

  // Detect hook type from first sentence
  const firstLine = caption.split(/[.\n!?]/)[0]?.trim() ?? "";
  let hookType = "statement";
  if (firstLine.includes("?")) hookType = "question";
  else if (/^(link|click|tap|dm|check)/i.test(firstLine)) hookType = "cta";
  else if (/\.\.\.|👀|🤫|😏|guess|wait|ready/i.test(firstLine)) hookType = "teaser";

  // Detect CTA
  const lowerCaption = caption.toLowerCase();
  let ctaPresent = false;
  let ctaType = "none";
  if (/link in bio|link in my bio|bio link/i.test(lowerCaption)) { ctaPresent = true; ctaType = "link_in_bio"; }
  else if (/dm me|send me a dm|message me/i.test(lowerCaption)) { ctaPresent = true; ctaType = "dm"; }
  else if (/follow|subscribe/i.test(lowerCaption)) { ctaPresent = true; ctaType = "follow"; }

  // Simple tone detection
  let captionTone = "casual";
  if (/\b(tip|how to|here's|learn|guide)\b/i.test(caption)) captionTone = "informational";
  else if (/😏|🔥|👀|💋|dare|tease|maybe|promise/i.test(caption)) captionTone = "provocative";
  else if (/\b(i feel|my|honestly|real talk|personal)\b/i.test(caption)) captionTone = "personal";

  return { hookType, ctaPresent, ctaType, captionTone, emojiCount, hashtagCount, captionLength };
}

// ── Batch analysis ───────────────────────────────────────────────────

export interface AnalyzeResult {
  analyzed: number;
  skipped: number;
  errors: number;
}

export async function analyzeUnanalyzedPosts(limit = 500): Promise<AnalyzeResult> {
  // Find posts without analysis
  const unanalyzed = db
    .select({ id: posts.id, caption: posts.caption, mediaType: posts.mediaType, thumbnailUrl: posts.thumbnailUrl, mediaUrl: posts.mediaUrl })
    .from(posts)
    .leftJoin(postAnalysis, eq(postAnalysis.postId, posts.id))
    .where(isNull(postAnalysis.id))
    .limit(limit)
    .all();

  let analyzed = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of unanalyzed) {
    try {
      // Vision analysis — use thumbnail for videos, media_url for images
      const imageUrl = post.mediaType === "VIDEO" ? post.thumbnailUrl : (post.mediaUrl ?? post.thumbnailUrl);
      let visual: VisualAnalysis = { setting: "unknown", lighting: "unknown", face_visible: false, text_overlay: false, visual_style: "unknown" };

      if (imageUrl) {
        try {
          visual = await analyzePostVisual(imageUrl);
        } catch {
          // Vision analysis failed — continue with defaults
        }
      }

      // Caption analysis
      const caption = post.caption ?? "";
      const captionAttrs = analyzeCaptionStructure(caption);

      // Store analysis
      db.insert(postAnalysis)
        .values({
          postId: post.id,
          setting: visual.setting,
          lighting: visual.lighting,
          faceVisible: visual.face_visible,
          textOverlay: visual.text_overlay,
          visualStyle: visual.visual_style,
          captionLength: captionAttrs.captionLength,
          hookType: captionAttrs.hookType,
          ctaPresent: captionAttrs.ctaPresent,
          ctaType: captionAttrs.ctaType,
          captionTone: captionAttrs.captionTone,
          emojiCount: captionAttrs.emojiCount,
          hashtagCount: captionAttrs.hashtagCount,
          rawAnalysis: JSON.stringify({ visual, caption: captionAttrs })
        })
        .run();

      analyzed++;
    } catch {
      errors++;
    }
  }

  skipped = unanalyzed.length - analyzed - errors;
  return { analyzed, skipped, errors };
}

// ── Pattern correlation + report generation ──────────────────────────

export async function generateContentReport(): Promise<ContentReport> {
  // Get all posts with their analysis and insights
  const rows = db
    .select({
      id: posts.id,
      caption: posts.caption,
      mediaType: posts.mediaType,
      publishedAt: posts.publishedAt,
      setting: postAnalysis.setting,
      lighting: postAnalysis.lighting,
      faceVisible: postAnalysis.faceVisible,
      textOverlay: postAnalysis.textOverlay,
      visualStyle: postAnalysis.visualStyle,
      hookType: postAnalysis.hookType,
      ctaPresent: postAnalysis.ctaPresent,
      captionTone: postAnalysis.captionTone,
      emojiCount: postAnalysis.emojiCount,
      impressions: postInsights.impressions,
      reach: postInsights.reach,
      engagement: postInsights.engagement,
      saves: postInsights.saves,
      likes: postInsights.likes,
      comments: postInsights.comments,
      shares: postInsights.shares
    })
    .from(posts)
    .innerJoin(postAnalysis, eq(postAnalysis.postId, posts.id))
    .innerJoin(postInsights, eq(postInsights.postId, posts.id))
    .all();

  if (rows.length < 5) {
    return {
      patterns: [],
      recommendations: [],
      summary: "Not enough analyzed posts to generate meaningful patterns. Need at least 5 posts with both analysis and insights data.",
      postsAnalyzed: rows.length,
      generatedAt: new Date().toISOString()
    };
  }

  // Build a data summary for Claude
  const dataSummary = {
    totalPosts: rows.length,
    byMediaType: groupAndAverage(rows, "mediaType"),
    bySetting: groupAndAverage(rows, "setting"),
    byLighting: groupAndAverage(rows, "lighting"),
    byFaceVisible: groupAndAverage(rows, "faceVisible"),
    byTextOverlay: groupAndAverage(rows, "textOverlay"),
    byHookType: groupAndAverage(rows, "hookType"),
    byCtaPresent: groupAndAverage(rows, "ctaPresent"),
    byCaptionTone: groupAndAverage(rows, "captionTone"),
    topPosts: rows
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, 5)
      .map((r) => ({
        caption: r.caption?.slice(0, 80),
        mediaType: r.mediaType,
        setting: r.setting,
        lighting: r.lighting,
        hookType: r.hookType,
        captionTone: r.captionTone,
        engagement: r.engagement,
        reach: r.reach,
        saves: r.saves
      })),
    bottomPosts: rows
      .sort((a, b) => (a.engagement ?? 0) - (b.engagement ?? 0))
      .slice(0, 5)
      .map((r) => ({
        caption: r.caption?.slice(0, 80),
        mediaType: r.mediaType,
        setting: r.setting,
        lighting: r.lighting,
        hookType: r.hookType,
        captionTone: r.captionTone,
        engagement: r.engagement,
        reach: r.reach,
        saves: r.saves
      }))
  };

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `You are a senior social media strategist analyzing Instagram content performance data for a creator. Your job is to find non-obvious, actionable patterns — not surface-level observations anyone could see in Instagram's own analytics.

DATA SUMMARY (${dataSummary.totalPosts} posts analyzed):
${JSON.stringify(dataSummary, null, 2)}

Return ONLY a JSON object with this structure:
{
  "patterns": [
    {
      "title": "short pattern name",
      "description": "A detailed 2-3 sentence explanation of the pattern. Explain WHY this matters, not just what the numbers show. Connect it to audience psychology or content strategy principles.",
      "evidence": "Exact numbers: averages, comparisons, sample sizes. Always include how many posts are in each group so the reader can judge statistical significance.",
      "impact": "high/medium/low"
    }
  ],
  "recommendations": [
    {
      "action": "A specific, concrete action — not vague advice like 'post more reels'. Say exactly what to do, when, and how.",
      "reasoning": "2-3 sentences explaining the data-backed reasoning AND the strategic logic. Reference specific numbers from the patterns.",
      "priority": "high/medium/low"
    }
  ],
  "summary": "3-4 sentence executive summary. Lead with the single most important finding, then the biggest opportunity, then the biggest risk."
}

Rules:
- Be specific with ALL numbers. Always cite sample sizes.
- Go beyond the obvious. "Videos get more engagement" is useless. "Videos with face visible in natural light get 3.2x saves vs studio shots" is useful.
- Cross-reference attributes: don't just look at one dimension. The best insights combine visual + caption + timing patterns.
- If sample sizes are small (under 5 posts in a group), flag that explicitly as low confidence.
- 4-6 patterns and 4-6 recommendations.`
    }]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let report: ContentReport;

  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    report = {
      ...parsed,
      postsAnalyzed: rows.length,
      generatedAt: new Date().toISOString()
    };
  } else {
    report = {
      patterns: [],
      recommendations: [],
      summary: "Failed to generate report. Please try again.",
      postsAnalyzed: rows.length,
      generatedAt: new Date().toISOString()
    };
  }

  // Store the report
  db.insert(contentInsights)
    .values({
      platform: "instagram",
      reportJson: JSON.stringify(report),
      postsAnalyzed: rows.length
    })
    .run();

  return report;
}

// ── Get latest report ────────────────────────────────────────────────

export function getLatestReport(): ContentReport | null {
  const [row] = db
    .select()
    .from(contentInsights)
    .where(eq(contentInsights.platform, "instagram"))
    .orderBy(desc(contentInsights.createdAt))
    .limit(1)
    .all();

  if (!row) return null;
  return JSON.parse(row.reportJson) as ContentReport;
}

// ── Elaborate on a pattern ────────────────────────────────────────────

export async function elaboratePattern(pattern: { title: string; description: string; evidence: string }): Promise<string> {
  // Get relevant posts for context
  const rows = db
    .select({
      caption: posts.caption,
      mediaType: posts.mediaType,
      setting: postAnalysis.setting,
      lighting: postAnalysis.lighting,
      hookType: postAnalysis.hookType,
      captionTone: postAnalysis.captionTone,
      engagement: postInsights.engagement,
      reach: postInsights.reach,
      saves: postInsights.saves,
      likes: postInsights.likes,
      shares: postInsights.shares
    })
    .from(posts)
    .innerJoin(postAnalysis, eq(postAnalysis.postId, posts.id))
    .innerJoin(postInsights, eq(postInsights.postId, posts.id))
    .orderBy(desc(postInsights.engagement))
    .limit(20)
    .all();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `You are a senior social media strategist. A content analysis found this pattern:

PATTERN: ${pattern.title}
DESCRIPTION: ${pattern.description}
EVIDENCE: ${pattern.evidence}

Here are the top 20 posts by engagement for context:
${JSON.stringify(rows.map(r => ({
  caption: r.caption?.slice(0, 100),
  type: r.mediaType,
  setting: r.setting,
  lighting: r.lighting,
  hook: r.hookType,
  tone: r.captionTone,
  engagement: r.engagement,
  reach: r.reach,
  saves: r.saves
})), null, 2)}

Provide a detailed deep-dive on this pattern. Include:
1. WHY this pattern likely exists (audience psychology, algorithm behavior, platform dynamics)
2. Specific examples from the post data that illustrate it
3. A concrete content playbook: exactly what to do in the next 5 posts to leverage this pattern
4. What to watch out for (diminishing returns, audience fatigue, etc.)

Write in a direct, strategic tone. Be specific — reference actual captions and numbers from the data. 3-4 paragraphs.`
    }]
  });

  return response.content[0].type === "text" ? response.content[0].text : "Failed to generate elaboration.";
}

// ── Helpers ──────────────────────────────────────────────────────────

function groupAndAverage(
  rows: Array<Record<string, unknown>>,
  groupBy: string
): Array<{ group: string; count: number; avgEngagement: number; avgReach: number; avgSaves: number }> {
  const groups = new Map<string, { count: number; totalEngagement: number; totalReach: number; totalSaves: number }>();

  for (const row of rows) {
    const key = String(row[groupBy] ?? "unknown");
    const existing = groups.get(key) ?? { count: 0, totalEngagement: 0, totalReach: 0, totalSaves: 0 };
    existing.count++;
    existing.totalEngagement += (row.engagement as number) ?? 0;
    existing.totalReach += (row.reach as number) ?? 0;
    existing.totalSaves += (row.saves as number) ?? 0;
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([group, data]) => ({
      group,
      count: data.count,
      avgEngagement: Math.round(data.totalEngagement / data.count),
      avgReach: Math.round(data.totalReach / data.count),
      avgSaves: Math.round(data.totalSaves / data.count)
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}
