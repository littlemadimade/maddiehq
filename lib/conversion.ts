export type FunnelStage = {
  label: string;
  value: string;
  detail: string;
};

export type ConvertingReel = {
  title: string;
  hook: string;
  reach: string;
  profileActions: string;
  ofSignal: string;
  takeaway: string;
};

export type RevenueSignal = {
  label: string;
  value: string;
  note: string;
};

export const funnelStages: FunnelStage[] = [
  { label: "Instagram Reach", value: "66k", detail: "People who saw the reel content." },
  { label: "Profile Visits", value: "8.7k", detail: "People curious enough to check your page." },
  { label: "Link / DM Actions", value: "1.4k", detail: "People taking a stronger intent step." },
  { label: "OnlyFans Visits", value: "620", detail: "Traffic that actually reached the OF side." },
  { label: "Paid Conversions", value: "94", detail: "The outcomes that matter most for revenue." }
];

export const revenueSignals: RevenueSignal[] = [
  {
    label: "Estimated Conversion Rate",
    value: "15.2%",
    note: "From OF visits to paid conversions in this MVP sample."
  },
  {
    label: "Strongest Traffic Source",
    value: "Reels",
    note: "Short-form Instagram is driving the best top-of-funnel volume."
  },
  {
    label: "Best Mid-Funnel Step",
    value: "Profile Visits",
    note: "Your page is doing a decent job turning attention into curiosity."
  },
  {
    label: "Biggest Drop-Off",
    value: "Link to OF",
    note: "This is where the business opportunity likely lives right now."
  }
];

export const convertingReels: ConvertingReel[] = [
  {
    title: "Fast payoff morning reel",
    hook: "Started with the strongest visual in the first second.",
    reach: "18k reach",
    profileActions: "1.8k profile visits",
    ofSignal: "142 OF visits / 21 paid conversions",
    takeaway: "Fast clarity and direct payoff created both attention and buyer intent."
  },
  {
    title: "Soft-spoken behind-the-scenes reel",
    hook: "Casual tone, lower polish, more personal energy.",
    reach: "11k reach",
    profileActions: "1.1k profile visits",
    ofSignal: "97 OF visits / 18 paid conversions",
    takeaway: "This did not have the biggest reach, but it attracted stronger-fit traffic."
  },
  {
    title: "Text-overlay teaser reel",
    hook: "Cover text made the promise immediately obvious.",
    reach: "23k reach",
    profileActions: "2.3k profile visits",
    ofSignal: "161 OF visits / 24 paid conversions",
    takeaway: "Clear packaging made it easier for the right viewer to keep moving down the funnel."
  }
];

export const explanationPoints = [
  {
    title: "What this room is for",
    body:
      "This is where content performance stops being vanity and starts being business. The point is to see whether Instagram attention is creating actual OnlyFans outcomes."
  },
  {
    title: "What good looks like",
    body:
      "A healthy funnel does not just get reach. It gets the right people to visit the profile, take action, and continue into paid behavior."
  },
  {
    title: "What to watch closely",
    body:
      "The biggest drop-off usually matters more than the biggest top-line number. If your reach is strong but your OF visits are weak, the handoff needs work."
  }
];

export const managerNotes = [
  "Track each Reel separately so you can compare reach versus buyer-intent behavior, not just views.",
  "Log any manager tactic changes near the same time as a post so you can connect strategy to outcome later.",
  "When something converts unusually well, save the exact hook, thumbnail, caption tone, and posting window."
];
