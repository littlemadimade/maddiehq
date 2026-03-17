export type OverviewStat = {
  label: string;
  value: string;
  change: string;
};

export type PlatformStat = {
  label: string;
  value: string;
};

export type PlatformInsight = {
  name: "TikTok" | "Instagram";
  handle: string;
  accent: string;
  stats: PlatformStat[];
  wins: string[];
  misses: string[];
};

export type InsightSuggestion = {
  title: string;
  action: string;
  why: string;
  focus: string;
  confidence: "High confidence" | "Medium confidence";
};

export const overviewStats: OverviewStat[] = [
  { label: "Combined Reach", value: "248k", change: "+18% this month" },
  { label: "Follower Growth", value: "+3.4k", change: "+9% vs last month" },
  { label: "Best Posting Window", value: "7-9 PM", change: "Weeknights win" },
  { label: "Top Format", value: "Short video", change: "Reels + TikToks" }
];

export const platformCards: PlatformInsight[] = [
  {
    name: "TikTok",
    handle: "@maddie",
    accent: "platform-card--pink",
    stats: [
      { label: "Views", value: "182k" },
      { label: "Avg Watch Time", value: "11.8s" },
      { label: "Shares", value: "3.2k" },
      { label: "Saves", value: "1.1k" }
    ],
    wins: [
      "Fast hook in the first 2 seconds",
      "Playful captions are outperforming polished ones",
      "Behind-the-scenes clips are driving shares"
    ],
    misses: [
      "Long intros are losing retention",
      "Posting before noon underperforms",
      "Over-edited clips feel weaker"
    ]
  },
  {
    name: "Instagram",
    handle: "@maddie",
    accent: "platform-card--lime",
    stats: [
      { label: "Reach", value: "66k" },
      { label: "Profile Visits", value: "8.7k" },
      { label: "Saves", value: "2.6k" },
      { label: "Story Replies", value: "480" }
    ],
    wins: [
      "Reels with direct text overlays hold attention",
      "Carousel posts create strong saves",
      "Stories with polls increase replies"
    ],
    misses: [
      "Single-image posts are lagging",
      "Muted thumbnails are easy to skip",
      "Weekend mornings are inconsistent"
    ]
  }
];

export function buildSuggestions(platforms: PlatformInsight[]): InsightSuggestion[] {
  const hasFastHookSignal = platforms.some((platform) =>
    platform.wins.some((item) => item.toLowerCase().includes("hook"))
  );
  const hasCasualSignal = platforms.some((platform) =>
    platform.wins.some((item) => item.toLowerCase().includes("playful"))
  );
  const hasStorySignal = platforms.some((platform) =>
    platform.wins.some((item) => item.toLowerCase().includes("stories"))
  );
  const hasSlowIntroProblem = platforms.some((platform) =>
    platform.misses.some((item) => item.toLowerCase().includes("long intros"))
  );
  const hasTimingProblem = platforms.some((platform) =>
    platform.misses.some((item) => item.toLowerCase().includes("noon"))
  );
  const hasThumbnailProblem = platforms.some((platform) =>
    platform.misses.some((item) => item.toLowerCase().includes("thumbnail"))
  );

  const suggestions: InsightSuggestion[] = [];

  if (hasFastHookSignal || hasSlowIntroProblem) {
    suggestions.push({
      title: "Lead with the payoff faster",
      action:
        "Open your next batch of short-form videos with the most interesting moment first, then explain the setup after.",
      why:
        "Your current signals say fast hooks win attention while long intros lose retention, so the first seconds matter more than extra context.",
      focus: "Hook strategy",
      confidence: "High confidence"
    });
  }

  if (hasCasualSignal) {
    suggestions.push({
      title: "Lean into content that feels more human than polished",
      action:
        "Make at least one casual, behind-the-scenes, or playful piece this week instead of over-editing every post.",
      why:
        "TikTok signals suggest playful captions and less polished energy are outperforming more produced content.",
      focus: "Content style",
      confidence: "Medium confidence"
    });
  }

  if (hasThumbnailProblem) {
    suggestions.push({
      title: "Upgrade the promise on your cover frames",
      action:
        "Use clearer cover text and brighter thumbnails so the viewer understands the value of the post before tapping.",
      why:
        "Instagram signals suggest muted thumbnails are easy to skip, which means stronger visual packaging could improve entry into the content.",
      focus: "Packaging",
      confidence: "High confidence"
    });
  }

  if (hasStorySignal) {
    suggestions.push({
      title: "Use stories to deepen the relationship after posting",
      action:
        "Pair new posts with a follow-up story poll or quick reply prompt to pull viewers into another touchpoint.",
      why:
        "Your Instagram story signals already show better replies when polls are used, so this is a repeatable follow-through move.",
      focus: "Audience engagement",
      confidence: "Medium confidence"
    });
  }

  if (hasTimingProblem) {
    suggestions.push({
      title: "Prioritize evening publishing windows",
      action:
        "Queue your strongest posts for the 7-9 PM window before spending energy testing weak daytime slots again.",
      why:
        "The current dashboard says weeknights are stronger while earlier posting windows underperform.",
      focus: "Timing",
      confidence: "High confidence"
    });
  }

  return suggestions;
}

export const suggestions = buildSuggestions(platformCards);
