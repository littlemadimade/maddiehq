export type ConversionInputs = {
  reelViews: number;
  profileVisits: number;
  ofPageViews: number;
  newSubscribers: number;
  totalSubscribers: number;
  wallLikes: number;
  tipsCount: number;
  topSpenderAmount: number;
};

export const defaultConversionInputs: ConversionInputs = {
  reelViews: 10000,
  profileVisits: 1200,
  ofPageViews: 620,
  newSubscribers: 18,
  totalSubscribers: 42,
  wallLikes: 310,
  tipsCount: 14,
  topSpenderAmount: 185
};

export function buildConversionStorageKey(creatorId: string) {
  return `maddiehq:${creatorId}:conversion-inputs`;
}

export function formatWholeNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function buildConversionSummary(inputs: ConversionInputs) {
  const safePercent = (numerator: number, denominator: number) =>
    denominator > 0 ? (numerator / denominator) * 100 : 0;

  const ofConversionRate = safePercent(inputs.newSubscribers, inputs.ofPageViews);
  const profileToOfRate = safePercent(inputs.ofPageViews, inputs.profileVisits);
  const likesPerSubscriber = inputs.totalSubscribers > 0 ? inputs.wallLikes / inputs.totalSubscribers : 0;
  const tipsPerSubscriber = inputs.totalSubscribers > 0 ? inputs.tipsCount / inputs.totalSubscribers : 0;

  return {
    stats: [
      {
        label: "OF Conversion Rate",
        value: formatPercent(ofConversionRate),
        note: "Calculated from new subscribers and OF page views."
      },
      {
        label: "Profile -> OF Rate",
        value: formatPercent(profileToOfRate),
        note: "How many profile visitors are reaching your OF page."
      },
      {
        label: "Likes Per Subscriber",
        value: likesPerSubscriber.toFixed(1),
        note: "A rough quality signal for how engaged your current subs are."
      },
      {
        label: "Top Spender",
        value: formatCurrency(inputs.topSpenderAmount),
        note: "Useful for spotting how much one strong fan can be worth."
      }
    ],
    funnel: [
      {
        label: "Instagram Reel Views",
        value: formatWholeNumber(inputs.reelViews),
        detail: "Top-of-funnel attention coming from your reel."
      },
      {
        label: "Profile Visits",
        value: formatWholeNumber(inputs.profileVisits),
        detail: "People curious enough to check your page."
      },
      {
        label: "OF Page Views",
        value: formatWholeNumber(inputs.ofPageViews),
        detail: "The bridge signal showing traffic actually crossed over."
      },
      {
        label: "New Subscribers",
        value: formatWholeNumber(inputs.newSubscribers),
        detail: "The clearest current conversion win signal you mentioned."
      },
      {
        label: "Current Subscribers",
        value: formatWholeNumber(inputs.totalSubscribers),
        detail: "Your current base after those conversions land."
      }
    ],
    explanation: [
      {
        title: "What this means right now",
        body:
          ofConversionRate >= 3
            ? "Your current OF page conversion is in the target zone you mentioned. The next question becomes whether those subscribers are the kind that go on to spend."
            : "Your current OF page conversion is below the 3-4% goal you mentioned. That suggests the opportunity may be in your page setup, offer clarity, or how traffic is being handed off."
      },
      {
        title: "What looks strongest",
        body:
          profileToOfRate >= 35
            ? "A healthy share of profile visitors are making it to your OF page, which means the bridge from Instagram interest into OF curiosity is functioning."
            : "A lot of attention may be getting lost before people even reach OF. That usually means the bridge step itself needs attention, not just the content."
      },
      {
        title: "What to investigate next",
        body:
          tipsPerSubscriber >= 0.25
            ? "Your tip activity suggests there is already some spending behavior to build around. That makes it worth tracking which content brings in the higher-intent fans."
            : "If subscriber growth is happening but tip activity is still light, you may be attracting interest without enough buyer intent yet."
      }
    ]
  };
}

export const managerNotes = [
  "Track OF page views and new subscribers together so the app can calculate your rough conversion rate automatically.",
  "When a reel brings subs, note the hook, cover, and posting window so you can compare what kind of traffic converts best.",
  "Top spender amount is worth tracking because one strong buyer can matter more than a lot of passive traffic."
];
