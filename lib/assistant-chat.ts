import type { AssistantMemory } from "@/lib/assistant-memory";
import type { AssistantEvent } from "@/lib/assistant-events";
import type { ConversionInputs } from "@/lib/conversion";

export type AssistantChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type BuildAssistantReplyArgs = {
  prompt: string;
  memory: AssistantMemory;
  events: AssistantEvent[];
  conversionInputs: ConversionInputs | null;
};

function summarizeRecentEvents(events: AssistantEvent[]) {
  if (!events.length) {
    return "There has not been much recent activity yet, so the next best move is to log something real and give me more to work with.";
  }

  const latest = events.slice(0, 3).map((event) => event.title.toLowerCase());
  return `Recent activity I am tracking: ${latest.join(", ")}.`;
}

export function buildAssistantOpeningMessages(
  memory: AssistantMemory,
  events: AssistantEvent[],
  conversionInputs: ConversionInputs | null
) {
  const opener = `${memory.assistantName} here. I’m holding your ${memory.focus.toLowerCase()} focus, your current priority, and the latest app activity so this room can feel more like a real manager desk.`;
  const status = conversionInputs
    ? `Your last saved conversion snapshot is ${conversionInputs.newSubscribers} new subs from ${conversionInputs.ofPageViews} OF page views.`
    : "You do not have a saved conversion snapshot loaded yet, so my business read is still light.";

  return [
    {
      id: "assistant-opening-1",
      role: "assistant" as const,
      text: opener
    },
    {
      id: "assistant-opening-2",
      role: "assistant" as const,
      text: `${summarizeRecentEvents(events)} ${status}`
    },
    {
      id: "assistant-opening-3",
      role: "assistant" as const,
      text: "Ask me what to focus on, what looks weak, or which room you should open next."
    }
  ];
}

export function buildAssistantReply({
  prompt,
  memory,
  events,
  conversionInputs
}: BuildAssistantReplyArgs) {
  const normalized = prompt.trim().toLowerCase();
  const latestEvent = events[0];

  if (normalized.includes("focus") || normalized.includes("what should")) {
    return `My current read is to focus on ${memory.currentPriority.toLowerCase()} That stays aligned with your bigger goal: ${memory.mainGoal.toLowerCase()}`;
  }

  if (normalized.includes("weak") || normalized.includes("wrong")) {
    if (conversionInputs && conversionInputs.ofPageViews > 0) {
      const conversionRate = ((conversionInputs.newSubscribers / conversionInputs.ofPageViews) * 100).toFixed(1);
      return `The weakest pressure point I can see right now is the handoff into OF. Your rough conversion is about ${conversionRate}%, so I would inspect the reel-to-profile-to-OF bridge before assuming the problem is pure traffic volume.`;
    }

    return "What feels weakest right now is not having enough hard business data in the app. Give me updated conversion numbers and I can stop guessing so much.";
  }

  if (normalized.includes("next") || normalized.includes("room")) {
    if (latestEvent?.type === "brainstorm_saved") {
      return `Because your latest event was "${latestEvent.title.toLowerCase()}", I would either move that idea into Tracker if it is ready to execute, or into Conversion if it is really about revenue behavior.`;
    }

    if (conversionInputs) {
      return "Open Conversion if you want the business-side read, or stay here and ask me to interpret the last numbers you saved.";
    }

    return "Open Home if you need to capture ideas, or Conversion if you have real OF numbers ready to log.";
  }

  if (normalized.includes("team") || normalized.includes("people")) {
    return "The team shape that makes sense is: one manager on this page, then specialist assistants for insights, scripting, editing, and chat/revenue. The next technical step is to define those roles in code and let the main assistant route work between them.";
  }

  return `Here is my manager read: stay in ${memory.focus.toLowerCase()} mode, keep ${memory.successSignal.toLowerCase()} as the scorecard, and do not lose this note: ${memory.managerNotes.toLowerCase()}`;
}
