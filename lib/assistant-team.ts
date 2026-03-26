import type { AssistantMemory } from "@/lib/assistant-memory";

export type AssistantRole =
  | "manager"
  | "insights"
  | "scripting"
  | "editing"
  | "chat-revenue";

export type AssistantTeamMember = {
  role: AssistantRole;
  name: string;
  title: string;
  specialty: string;
  responsibilities: string[];
};

export function buildAssistantTeam(memory: AssistantMemory): AssistantTeamMember[] {
  return [
    {
      role: "manager",
      name: memory.assistantName,
      title: "Agency Manager",
      specialty: "Keeps the full business picture in view and routes work to the right specialist.",
      responsibilities: [
        "Sets priority and next moves",
        "Connects insights, execution, and revenue",
        "Acts like the front-facing manager"
      ]
    },
    {
      role: "insights",
      name: "Signal",
      title: "Insights Analyst",
      specialty: "Reads content performance, patterns, and growth signals.",
      responsibilities: [
        "Spot what is working and what is weak",
        "Compare reels and traffic quality",
        "Turn metrics into simple explanations"
      ]
    },
    {
      role: "scripting",
      name: "Muse",
      title: "Script Strategist",
      specialty: "Shapes hooks, captions, CTAs, and message framing.",
      responsibilities: [
        "Refine reel hooks and caption tone",
        "Turn ideas into stronger scripts",
        "Help with promo wording and CTA direction"
      ]
    },
    {
      role: "editing",
      name: "Cut",
      title: "Editing Lead",
      specialty: "Guides pacing, structure, and post-production decisions.",
      responsibilities: [
        "Improve pacing and first-three-second impact",
        "Suggest cutdowns and overlay direction",
        "Tighten content for clarity"
      ]
    },
    {
      role: "chat-revenue",
      name: "Closer",
      title: "Chat and Revenue Lead",
      specialty: "Focuses on conversion, spending behavior, and revenue-side strategy.",
      responsibilities: [
        "Think about buyer intent and spending patterns",
        "Connect OF behavior to content traffic",
        "Later guide chat-team style workflows"
      ]
    }
  ];
}

export function pickAssistantRoute(prompt: string): AssistantRole {
  const normalized = prompt.toLowerCase();

  if (
    normalized.includes("view") ||
    normalized.includes("insight") ||
    normalized.includes("performance") ||
    normalized.includes("analytics") ||
    normalized.includes("weak") ||
    normalized.includes("working")
  ) {
    return "insights";
  }

  if (
    normalized.includes("script") ||
    normalized.includes("caption") ||
    normalized.includes("hook") ||
    normalized.includes("write") ||
    normalized.includes("cta")
  ) {
    return "scripting";
  }

  if (
    normalized.includes("edit") ||
    normalized.includes("video") ||
    normalized.includes("cut") ||
    normalized.includes("trim") ||
    normalized.includes("cover")
  ) {
    return "editing";
  }

  if (
    normalized.includes("revenue") ||
    normalized.includes("sub") ||
    normalized.includes("onlyfans") ||
    normalized.includes("chat") ||
    normalized.includes("spend") ||
    normalized.includes("conversion")
  ) {
    return "chat-revenue";
  }

  return "manager";
}
