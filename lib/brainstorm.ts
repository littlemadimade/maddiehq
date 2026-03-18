export const brainstormCategories = [
  "Content idea",
  "Caption idea",
  "Promotion idea",
  "OF idea"
] as const;

export type BrainstormCategory = (typeof brainstormCategories)[number];

export type BrainstormEntry = {
  id: string;
  text: string;
  category: BrainstormCategory;
  createdAt: string;
};

type BrainstormSuggestion = {
  label: string;
  title: string;
  action: string;
  reason: string;
  confidence: string;
};

function summarizeIdea(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "You have not dropped an idea in yet, so the app is showing starter guidance.";
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function buildBrainstormSuggestions(
  text: string,
  category: BrainstormCategory
): BrainstormSuggestion[] {
  const summary = summarizeIdea(text);

  const categorySuggestion: Record<BrainstormCategory, BrainstormSuggestion> = {
    "Content idea": {
      label: "Shape it",
      title: "Turn this into a reel concept",
      action: `Treat "${summary}" like the hook seed. Write a strong first line, define the visual, and decide what reaction you want in the first three seconds.`,
      reason:
        "Content ideas get stronger when you quickly translate the raw thought into a hook, a shot idea, and a clear reaction target.",
      confidence: "Best next move"
    },
    "Caption idea": {
      label: "Refine it",
      title: "Test the tone and CTA",
      action: `Use "${summary}" as a caption draft, then create two versions: one flirtier and one more direct, each with a clear action you want the viewer to take.`,
      reason:
        "Captions work better when the tone matches the post and the call to action is intentional instead of implied.",
      confidence: "High fit"
    },
    "Promotion idea": {
      label: "Pressure test it",
      title: "Decide where the promotion lives",
      action: `Take "${summary}" and decide whether it belongs in a reel, a story sequence, or a bio-link push so the message matches the placement.`,
      reason:
        "Promotions usually fail when the idea is fine but the placement and traffic path are not planned.",
      confidence: "High fit"
    },
    "OF idea": {
      label: "Connect it",
      title: "Tie the idea to conversion",
      action: `Look at "${summary}" and ask what behavior it should drive: profile visits, OF page views, new subs, or more spending from current subs.`,
      reason:
        "OF-side ideas get more useful when they are connected to a business outcome instead of staying as a vague concept.",
      confidence: "Best next move"
    }
  };

  return [
    categorySuggestion[category],
    {
      label: "Organize it",
      title: "Choose the room this belongs in",
      action:
        "If this idea is about performance, move it into Insights. If it is about execution, move it into Tracker. If it is about money or subscriber behavior, move it into Conversion.",
      reason:
        "The app gets more useful when each idea ends up in the room built to help with that kind of decision.",
      confidence: "Always useful"
    },
    {
      label: "Make it concrete",
      title: "Add one measurable outcome",
      action:
        "Before acting on the idea, write one number or signal that would tell you it worked, like reel views, profile visits, OF page views, or new subs.",
      reason:
        "Attaching a measurable outcome makes the idea easier to judge later instead of relying on vibes alone.",
      confidence: "Strong habit"
    }
  ];
}
