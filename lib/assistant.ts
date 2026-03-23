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

function buildDefaultBrief(profileName: string): AssistantBrief {
  return {
    eyebrow: "Desk Assistant",
    title: `Morning ${profileName}, start by catching one useful thought.`,
    summary:
      "The fastest way to make this app useful is to feed it something real. Drop one messy idea, one OF observation, or one thing your managers keep saying.",
    focusLabel: "Best first move",
    focusValue: "Log one real idea",
    focusDetail:
      "Once there is real input, the assistant can stop giving generic advice and start acting more like a manager.",
    actions: [
      "Write the rough idea exactly how it sounds in your head. Do not polish it first.",
      "Pick the closest idea type so the app knows what kind of help to give.",
      "If you already know yesterday's OF numbers, update Conversion after this."
    ]
  };
}

export function buildAssistantBrief({
  profileName,
  draft,
  category,
  entries,
  conversionInputs
}: BuildAssistantBriefArgs): AssistantBrief {
  if (!entries.length && !draft.trim()) {
    return buildDefaultBrief(profileName);
  }

  if (draft.trim()) {
    const draftSummary = summarizeDraft(draft);

    return {
      eyebrow: "Desk Assistant",
      title: "This idea is ready for one sharper next step.",
      summary: `Your current ${category.toLowerCase()} draft is "${draftSummary}". It does not need to be finished. It just needs to be shaped enough that you know what room or task it belongs to next.`,
      focusLabel: "Current focus",
      focusValue: `Shape this ${category.toLowerCase()}`,
      focusDetail:
        category === "OF idea"
          ? "OF-side thoughts get more powerful when you tie them to page views, subs, or spending instead of leaving them vague."
          : "The job now is to turn the raw thought into something you can test, track, or hand off to execution.",
      actions: [
        "Save the idea so it becomes part of your working stack instead of disappearing.",
        "Add one success signal, like reel views, OF page views, or new subscribers.",
        category === "Content idea"
          ? "If this becomes a reel, move it into Tracker next so it can turn into an actual post."
          : "Once saved, decide whether it belongs in Insights, Tracker, or Conversion."
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
      eyebrow: "Desk Assistant",
      title:
        conversionRateValue >= 3
          ? "Your OF handoff looks healthy enough to start optimizing quality."
          : "Your OF handoff still looks like the main pressure point right now.",
      summary:
        conversionRateValue >= 3
          ? `You are converting about ${conversionRate} of OF page views into new subs. That means the next leverage is probably quality of traffic, subscriber behavior, and spend depth.`
          : `You are currently around ${conversionRate} from OF page views to new subs, based on ${pageViews} page views and ${newSubs} new subs. That is below the 3-4% target you mentioned, so the bridge into OF is still the most important thing to study.`,
      focusLabel: "Business focus",
      focusValue: `${conversionRate} OF conversion`,
      focusDetail:
        conversionRateValue >= 3
          ? "Now that the page is converting decently, the assistant should start caring more about who is spending and which traffic converts best."
          : "The app should keep helping you compare reel traffic, profile curiosity, and OF page setup until that handoff gets stronger.",
      actions: [
        "Look at which reel or promo angle produced the latest OF page views.",
        latestEntry
          ? `Check whether your latest saved idea (${latestEntry.category.toLowerCase()}) supports getting better traffic, not just more traffic.`
          : "Add a note about what kind of reel or promo angle sent that traffic over.",
        "Keep logging OF page views and new subscribers together so this number stays honest."
      ]
    };
  }

  return {
    eyebrow: "Desk Assistant",
    title: "You have idea momentum. Now connect it to the business side.",
    summary:
      latestEntry.category === "OF idea"
        ? "You already have OF-side thinking saved, which is good. The next layer is making sure those thoughts connect to actual numbers in Conversion."
        : `Your latest saved brainstorm is a ${latestEntry.category.toLowerCase()}. That tells me the creative side is moving. The next step is making sure the business side keeps up.`,
    focusLabel: "Pattern I notice",
    focusValue: categoryLeader
      ? `${categoryLeader[1]} ${categoryLeader[0].toLowerCase()}s saved`
      : "Brainstorm habit started",
    focusDetail:
      categoryLeader && categoryLeader[1] >= 3
        ? `Most of your recent notes are ${categoryLeader[0].toLowerCase()}s, so it may be time to balance that with either execution in Tracker or business review in Conversion.`
        : "You have enough saved context now that the homepage can start acting more like a working desk instead of a blank page.",
    actions: [
      `Review your latest note and ask what number would prove it worked.`,
      "Open Conversion and fill in real OF numbers if you have them, because that gives the assistant a business reality check.",
      "If one idea looks strong, move it into Tracker so it becomes a task instead of a pile of notes."
    ]
  };
}
