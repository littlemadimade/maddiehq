import type { AssistantMemory } from "@/lib/assistant-memory";
import { buildConversionSummary, type ConversionInputs } from "@/lib/conversion";
import type { BrainstormCategory, BrainstormEntry } from "@/lib/brainstorm";

type AssistantBrief = {
  eyebrow: string;
  title: string;
  summary: string;
  focusLabel: string;
  focusValue: string;
  focusDetail: string;
  actions: string[];
};

type BuildAssistantBriefArgs = {
  profileName: string;
  draft: string;
  category: BrainstormCategory;
  entries: BrainstormEntry[];
  conversionInputs: ConversionInputs | null;
  memory: AssistantMemory;
};

function getCategoryLeader(entries: BrainstormEntry[]) {
  const counts = new Map<BrainstormCategory, number>();

  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

function summarizeDraft(draft: string) {
  const trimmed = draft.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed;
}

function summarizeNote(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}...` : trimmed;
}

function buildDefaultBrief(profileName: string, memory: AssistantMemory): AssistantBrief {
  return {
    eyebrow: memory.assistantName,
    title: `Morning ${profileName}, let’s start with what matters most today.`,
    summary:
      memory.currentPriority ||
      "The fastest way to make this app useful is to feed it something real. Drop one messy idea, one OF observation, or one thing your managers keep saying.",
    focusLabel: "Primary mission",
    focusValue: memory.mainGoal || "Log one real idea",
    focusDetail:
      memory.successSignal ||
      "Once there is real input, the assistant can stop giving generic advice and start acting more like a manager.",
    actions: [
      `Work in a ${memory.tone.toLowerCase()} mode: clear, practical, and focused on ${memory.focus.toLowerCase()} decisions.`,
      "Write the rough idea exactly how it sounds in your head. Do not polish it first.",
      "Pick the closest idea type so the app knows what kind of help to give.",
      memory.focus === "Revenue"
        ? "If you already know yesterday's OF numbers, update Conversion first so the assistant can ground itself in business reality."
        : "If you already know yesterday's OF numbers, update Conversion after this.",
      memory.managerNotes.trim()
        ? `Manager note to keep in mind: ${summarizeNote(memory.managerNotes)}`
        : "Keep one manager note or business reminder saved here so the assistant can stay aligned."
    ]
  };
}

export function buildAssistantBrief({
  profileName,
  draft,
  category,
  entries,
  conversionInputs,
  memory
}: BuildAssistantBriefArgs): AssistantBrief {
  if (!entries.length && !draft.trim()) {
    return buildDefaultBrief(profileName, memory);
  }

  if (draft.trim()) {
    const draftSummary = summarizeDraft(draft);

    return {
      eyebrow: memory.assistantName,
      title: "This idea is ready for one sharper next step.",
      summary: `Your current ${category.toLowerCase()} draft is "${draftSummary}". It does not need to be finished. It just needs to be shaped enough that you know what room or task it belongs to next. Right now your saved priority is: ${memory.currentPriority.toLowerCase()}`,
      focusLabel: "Current focus",
      focusValue: `Shape this ${category.toLowerCase()}`,
      focusDetail:
        category === "OF idea"
          ? "OF-side thoughts get more powerful when you tie them to page views, subs, or spending instead of leaving them vague."
          : `The job now is to turn the raw thought into something you can test, track, or hand off to execution in a ${memory.tone.toLowerCase()} way.`,
      actions: [
        "Save the idea so it becomes part of your working stack instead of disappearing.",
        "Add one success signal, like reel views, OF page views, or new subscribers.",
        category === "Content idea"
          ? "If this becomes a reel, move it into Tracker next so it can turn into an actual post."
          : "Once saved, decide whether it belongs in Insights, Tracker, or Conversion.",
        memory.managerNotes.trim()
          ? `Stay aligned with this note: ${summarizeNote(memory.managerNotes)}`
          : "Use Creator settings to save the kind of reminder your assistant should keep repeating."
      ]
    };
  }

  const latestEntry = entries[0];
  const categoryLeader = getCategoryLeader(entries);

  if (conversionInputs) {
    const summary = buildConversionSummary(conversionInputs);
    const conversionRate = summary.stats[0]?.value ?? "0.0%";
    const pageViews = summary.funnel[2]?.value ?? "0";
    const newSubs = summary.funnel[3]?.value ?? "0";
    const conversionRateValue = Number.parseFloat(conversionRate);

    return {
      eyebrow: memory.assistantName,
      title:
        conversionRateValue >= 3
          ? "Your OF handoff looks healthy enough to start optimizing quality."
          : "Your OF handoff still looks like the main pressure point right now.",
      summary:
        conversionRateValue >= 3
          ? `You are converting about ${conversionRate} of OF page views into new subs. That means the next leverage is probably quality of traffic, subscriber behavior, and spend depth. Your saved goal is still: ${memory.mainGoal.toLowerCase()}`
          : `You are currently around ${conversionRate} from OF page views to new subs, based on ${pageViews} page views and ${newSubs} new subs. That is below the 3-4% target you mentioned, so the bridge into OF is still the most important thing to study.`,
      focusLabel: "Business focus",
      focusValue: `${conversionRate} OF conversion`,
      focusDetail:
        conversionRateValue >= 3
          ? `Now that the page is converting decently, the assistant should start caring more about who is spending and which traffic converts best for ${memory.focus.toLowerCase()} growth.`
          : "The app should keep helping you compare reel traffic, profile curiosity, and OF page setup until that handoff gets stronger.",
      actions: [
        "Look at which reel or promo angle produced the latest OF page views.",
        latestEntry
          ? `Check whether your latest saved idea (${latestEntry.category.toLowerCase()}) supports getting better traffic, not just more traffic.`
          : "Add a note about what kind of reel or promo angle sent that traffic over.",
        "Keep logging OF page views and new subscribers together so this number stays honest.",
        memory.managerNotes.trim()
          ? `Do not lose this operating note: ${summarizeNote(memory.managerNotes)}`
          : "Save a manager-style note in Creator settings so the assistant keeps your strategy in view."
      ]
    };
  }

  return {
    eyebrow: memory.assistantName,
    title: "You have idea momentum. Now connect it to the business side.",
    summary:
      latestEntry.category === "OF idea"
        ? "You already have OF-side thinking saved, which is good. The next layer is making sure those thoughts connect to actual numbers in Conversion."
        : `Your latest saved brainstorm is a ${latestEntry.category.toLowerCase()}. That tells me the creative side is moving. The next step is making sure the business side keeps up with your bigger goal: ${memory.mainGoal.toLowerCase()}`,
    focusLabel: "Pattern I notice",
    focusValue: categoryLeader
      ? `${categoryLeader[1]} ${categoryLeader[0].toLowerCase()}s saved`
      : "Brainstorm habit started",
    focusDetail:
      categoryLeader && categoryLeader[1] >= 3
        ? `Most of your recent notes are ${categoryLeader[0].toLowerCase()}s, so it may be time to balance that with either execution in Tracker or business review in Conversion.`
        : `You have enough saved context now that the homepage can start acting more like ${memory.assistantName.toLowerCase()} and less like a blank page.`,
    actions: [
      `Review your latest note and ask what number would prove it worked.`,
      memory.focus === "Execution"
        ? "Move the strongest idea into Tracker quickly so it turns into a real task."
        : "Open Conversion and fill in real OF numbers if you have them, because that gives the assistant a business reality check.",
      "If one idea looks strong, move it into Tracker so it becomes a task instead of a pile of notes.",
      memory.creatorContext.trim()
        ? `Creator context I am holding: ${summarizeNote(memory.creatorContext)}`
        : "Add creator context in the profile room so the assistant learns how you like to work."
    ]
  };
}
