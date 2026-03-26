export type AssistantEventType =
  | "brainstorm_saved"
  | "brainstorm_removed"
  | "conversion_updated"
  | "conversion_reset"
  | "assistant_memory_updated"
  | "assistant_chat";

export type AssistantEvent = {
  id: string;
  type: AssistantEventType;
  title: string;
  detail: string;
  createdAt: string;
};

const MAX_EVENTS = 18;

export function buildAssistantEventsStorageKey(creatorId: string) {
  return `maddiehq:${creatorId}:assistant-events`;
}

export function readAssistantEvents(creatorId: string) {
  const saved = window.localStorage.getItem(buildAssistantEventsStorageKey(creatorId));

  if (!saved) {
    return [] as AssistantEvent[];
  }

  try {
    const parsed = JSON.parse(saved) as AssistantEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAssistantEvents(creatorId: string, events: AssistantEvent[]) {
  window.localStorage.setItem(
    buildAssistantEventsStorageKey(creatorId),
    JSON.stringify(events.slice(0, MAX_EVENTS))
  );
}

export function appendAssistantEvent(
  creatorId: string,
  event: Omit<AssistantEvent, "id" | "createdAt">
) {
  const nextEvent: AssistantEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };

  const current = readAssistantEvents(creatorId);
  writeAssistantEvents(creatorId, [nextEvent, ...current]);
  return nextEvent;
}
