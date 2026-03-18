export type InstagramAccountType = "Creator" | "Business";

export type CreatorProfile = {
  id: string;
  name: string;
  instagramHandle: string;
  accountType: InstagramAccountType;
  facebookPageLinked: boolean;
  insightsPermissionReady: boolean;
  status: "Setup needed" | "Ready to connect" | "Connected later";
};

export const defaultCreatorProfile: CreatorProfile = {
  id: "maddie-default",
  name: "Maddie",
  instagramHandle: "@maddie",
  accountType: "Creator",
  facebookPageLinked: false,
  insightsPermissionReady: false,
  status: "Setup needed"
};
