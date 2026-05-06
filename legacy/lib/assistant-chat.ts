import type { AssistantMemory } from "@/lib/assistant-memory";
import type { AssistantEvent } from "@/lib/assistant-events";
import { buildConversionSnapshot, type ConversionInputs } from "@/lib/conversion";
import {
  buildAssistantTeam,
  pickAssistantRoute,
  type AssistantRole
} from "@/lib/assistant-team";

export type AssistantChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  speaker?: string;
};

type BuildAssistantReplyArgs = {
  prompt: string;
  memory: AssistantMemory;
  events: AssistantEvent[];
  conversionInputs: ConversionInputs | null;
};

function buildManagerLead(memory: AssistantMemory, role: AssistantRole) {
  switch (role) {
    case "insights":
      return `${memory.assistantName} routing this to insights mode.`;
    case "scripting":
      return `${memory.assistantName} routing this to scripting.`;
    case "editing":
      return `${memory.assistantName} routing this to editing.`;
    case "chat-revenue":
      return `${memory.assistantName} routing this to revenue strategy.`;
    default:
      return `${memory.assistantName} keeping this at the manager desk.`;
  }
}

function buildSpecialistReply(args: {
  role: AssistantRole;
  memory: AssistantMemory;
  conversionInputs: ConversionInputs | null;
  latestEvent?: AssistantEvent;
}) {
  const { role, memory, conversionInputs, latestEvent } = args;

  switch (role) {
    case "insights":
      return `Signal's read: look for the clearest pattern first, not the prettiest metric. ${
        conversionInputs
          ? `Right now I would compare traffic quality against ${conversionInputs.newSubscribers} new subs and ask which content is bringing buyers, not just viewers.`
          : "You still need more saved business data before I can trust the performance story completely."
      }`;
    case "scripting":
      return `Muse's read: tighten the hook, sharpen the CTA, and make the first sentence do the heavy lifting. ${
        latestEvent?.type === "brainstorm_saved"
          ? "Since your latest activity was saving a brainstorm, I would turn that raw thought into a hook, payoff, and action target next."
          : "If the idea feels fuzzy, write one flirtier version and one more direct version so you can test tone."
      }`;
    case "editing":
      return `Cut's read: the first three seconds need to pay rent. Focus on pacing, remove dead air, and make the visual point obvious fast. ${
        latestEvent?.type === "brainstorm_saved"
          ? "Once the concept is clear, I would immediately decide what the opening frame and text overlay need to be."
          : "If a post feels weak, I would inspect the opening, the trim, and whether the visual matches the hook."
      }`;
    case "chat-revenue":
      if (!conversionInputs) {
        return "Closer's read: without updated conversion numbers, I would treat any revenue conclusion as a loose guess.";
      }

      {
        const snapshot = buildConversionSnapshot(conversionInputs);
        return `Closer's read: I care about buyer intent more than surface attention. Right now you are sitting at ${snapshot.ofConversionLabel} OF conversion from ${snapshot.pageViewsLabel} OF page views, with a top spender at ${snapshot.topSpenderLabel}. I would inspect where curiosity is failing to become paid behavior.`;
      }
    default:
      return `Manager read: stay aligned with ${memory.mainGoal.toLowerCase()} and keep ${memory.currentPriority.toLowerCase()} at the top of the stack.`;
  }
}

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
  const team = buildAssistantTeam(memory);
  const opener = `${memory.assistantName} here. I’m holding your ${memory.focus.toLowerCase()} focus, your current priority, and the latest app activity so this room can feel more like a real manager desk.`;
  const status = conversionInputs
    ? `Your last saved conversion snapshot is ${conversionInputs.newSubscribers} new subs from ${conversionInputs.ofPageViews} OF page views.`
    : "You do not have a saved conversion snapshot loaded yet, so my business read is still light.";

  return [
    {
      id: "assistant-opening-1",
      role: "assistant" as const,
      text: opener,
      speaker: memory.assistantName
    },
    {
      id: "assistant-opening-2",
      role: "assistant" as const,
      text: `${summarizeRecentEvents(events)} ${status}`,
      speaker: memory.assistantName
    },
    {
      id: "assistant-opening-3",
      role: "assistant" as const,
      text: `The first team behind me is live now: ${team
        .slice(1)
        .map((member) => member.title)
        .join(", ")}. Ask me what to focus on, what looks weak, or which specialist should take something.`,
      speaker: memory.assistantName
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
  const team = buildAssistantTeam(memory);
  const route = pickAssistantRoute(normalized);
  const routedMember = team.find((member) => member.role === route) ?? team[0];
  const managerLead = buildManagerLead(memory, route);
  const specialistReply = buildSpecialistReply({
    role: route,
    memory,
    conversionInputs,
    latestEvent
  });

  const combineWithSpecialist = (managerText: string) => {
    if (route === "manager") {
      return `${managerLead} ${managerText}`;
    }

    return `${managerLead} ${managerText} ${specialistReply}`;
  };

  if (normalized.includes("focus") || normalized.includes("what should")) {
    return combineWithSpecialist(
      `My current read is to focus on ${memory.currentPriority.toLowerCase()} That stays aligned with your bigger goal: ${memory.mainGoal.toLowerCase()}`
    );
  }

  if (normalized.includes("weak") || normalized.includes("wrong")) {
    if (conversionInputs && conversionInputs.ofPageViews > 0) {
      const snapshot = buildConversionSnapshot(conversionInputs);
      return combineWithSpecialist(
        `The weakest pressure point I can see right now is the handoff into OF. Your rough conversion is about ${snapshot.ofConversionLabel}, so I would inspect the reel-to-profile-to-OF bridge before assuming the problem is pure traffic volume.`
      );
    }

    return combineWithSpecialist(
      "What feels weakest right now is not having enough hard business data in the app. Give me updated conversion numbers and I can stop guessing so much."
    );
  }

  if (normalized.includes("next") || normalized.includes("room")) {
    if (latestEvent?.type === "brainstorm_saved") {
      return combineWithSpecialist(
        `Because your latest event was "${latestEvent.title.toLowerCase()}", I would either move that idea into Tracker if it is ready to execute, or into Conversion if it is really about revenue behavior.`
      );
    }

    if (conversionInputs) {
      return combineWithSpecialist(
        "Open Conversion if you want the business-side read, or stay here and ask me to interpret the last numbers you saved."
      );
    }

    return combineWithSpecialist(
      "Open Home if you need to capture ideas, or Conversion if you have real OF numbers ready to log."
    );
  }

  if (
    normalized.includes("conversion") ||
    normalized.includes("subscribers") ||
    normalized.includes("subs") ||
    normalized.includes("page views")
  ) {
    if (conversionInputs) {
      const snapshot = buildConversionSnapshot(conversionInputs);
      return combineWithSpecialist(
        `Manager Bot read: the current conversion picture is ${snapshot.ofConversionLabel} OF conversion from ${snapshot.pageViewsLabel} OF page views, with ${snapshot.subsLabel} new subs and ${snapshot.topSpenderLabel} as the top spender signal.`
      );
    }

    return combineWithSpecialist(
      "Manager Bot read: I do not have a saved conversion snapshot yet, so the next move is to update the Conversion room and give me real numbers to work from."
    );
  }

  if (normalized.includes("team") || normalized.includes("people")) {
    return `The team shape now is: ${team
      .map((member) => `${member.name} for ${member.title.toLowerCase()}`)
      .join(", ")}. My job is to manage the whole picture and route the specialist work where it belongs.`;
  }

  return combineWithSpecialist(
    `Here is my manager read: stay in ${memory.focus.toLowerCase()} mode, keep ${memory.successSignal.toLowerCase()} as the scorecard, and do not lose this note: ${memory.managerNotes.toLowerCase()}`
  );
}
