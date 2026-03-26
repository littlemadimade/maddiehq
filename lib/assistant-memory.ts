export const assistantToneOptions = [
  "Soft coach",
  "Direct operator",
  "Warm manager",
  "Hype girl"
] as const;

export const assistantFocusOptions = [
  "Balanced",
  "Growth",
  "Revenue",
  "Execution"
] as const;

export type AssistantTone = (typeof assistantToneOptions)[number];
export type AssistantFocus = (typeof assistantFocusOptions)[number];

export type AssistantMemory = {
  assistantName: string;
  tone: AssistantTone;
  focus: AssistantFocus;
  mainGoal: string;
  currentPriority: string;
  successSignal: string;
  managerNotes: string;
  creatorContext: string;
};

function isLegacyAssistantName(name: string, profileName: string) {
  return !name.trim() || name === `${profileName}'s assistant`;
}

export function buildAssistantMemoryStorageKey(creatorId: string) {
  return `maddiehq:${creatorId}:assistant-memory`;
}

export function buildDefaultAssistantMemory(profileName: string): AssistantMemory {
  return {
    assistantName: "Kian",
    tone: "Warm manager",
    focus: "Balanced",
    mainGoal: "Turn Instagram traffic into stronger OF conversion and steadier revenue.",
    currentPriority: "Figure out what kind of reels are bringing the right traffic, not just a lot of traffic.",
    successSignal: "More OF page views, stronger sub conversion, and more repeat patterns I can trust.",
    managerNotes:
      "Keep an eye on the reel hooks that bring people over, and track whether the OF handoff is getting stronger.",
    creatorContext:
      "Fast learner, creator-first, wants the app to explain what matters instead of dumping confusing numbers."
  };
}

export function hydrateAssistantMemory(
  profileName: string,
  saved?: Partial<AssistantMemory> | null
): AssistantMemory {
  const defaults = buildDefaultAssistantMemory(profileName);
  const merged = {
    ...defaults,
    ...saved
  };

  if (isLegacyAssistantName(merged.assistantName, profileName)) {
    merged.assistantName = defaults.assistantName;
  }

  return merged;
}
