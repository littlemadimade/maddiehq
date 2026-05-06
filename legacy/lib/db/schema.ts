import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// ── Platforms ────────────────────────────────────────────────────────
// Registered platform connections with auth tokens

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(), // "instagram" | "reddit" | "tiktok"
  accountId: text("account_id").notNull(),
  username: text("username"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: text("token_expires_at"), // ISO string
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("platforms_platform_account_idx").on(table.platform, table.accountId)
]);

// ── Posts ─────────────────────────────────────────────────────────────
// Individual posts/media items across platforms

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platformPostId: text("platform_post_id").notNull(),
  platform: text("platform").notNull(),
  caption: text("caption"),
  mediaType: text("media_type"), // "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "link" | "self" etc.
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  permalink: text("permalink"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("posts_platform_post_idx").on(table.platform, table.platformPostId)
]);

// ── Post Analysis ────────────────────────────────────────────────────
// AI-generated analysis of post content (vision + caption)

export const postAnalysis = sqliteTable("post_analysis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => posts.id),
  // Vision attributes
  setting: text("setting"), // "indoor" | "outdoor" | "studio" | "mixed"
  lighting: text("lighting"), // "natural" | "artificial" | "dramatic" | "mixed"
  faceVisible: integer("face_visible", { mode: "boolean" }),
  textOverlay: integer("text_overlay", { mode: "boolean" }),
  visualStyle: text("visual_style"), // free-form from Claude
  // Caption attributes
  captionLength: integer("caption_length"),
  hookType: text("hook_type"), // "question" | "statement" | "teaser" | "cta" | "none"
  ctaPresent: integer("cta_present", { mode: "boolean" }),
  ctaType: text("cta_type"), // "link_in_bio" | "dm" | "follow" | "none"
  captionTone: text("caption_tone"), // "casual" | "provocative" | "informational" | "personal"
  emojiCount: integer("emoji_count"),
  hashtagCount: integer("hashtag_count"),
  // Video analysis
  transcript: text("transcript"),
  spokenHook: text("spoken_hook"), // first ~15 words of the transcript
  keyFrameAnalysis: text("key_frame_analysis"), // JSON from multi-frame vision analysis
  // Full AI analysis as JSON
  rawAnalysis: text("raw_analysis"), // full Claude response as JSON
  analyzedAt: text("analyzed_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("post_analysis_post_idx").on(table.postId)
]);

// ── Content Insights ─────────────────────────────────────────────────
// AI-generated content pattern reports

export const contentInsights = sqliteTable("content_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  reportJson: text("report_json").notNull(), // full report as JSON
  postsAnalyzed: integer("posts_analyzed").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString())
});

// ── Post Insights ────────────────────────────────────────────────────
// Per-post metrics snapshots (one row per post per snapshot date)

export const postInsights = sqliteTable("post_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => posts.id),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  impressions: integer("impressions"),
  reach: integer("reach"),
  engagement: integer("engagement"),
  saves: integer("saves"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  score: integer("score"), // Reddit-specific
  upvoteRatio: real("upvote_ratio"), // Reddit-specific
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("post_insights_post_date_idx").on(table.postId, table.snapshotDate)
]);

// ── Account Snapshots ────────────────────────────────────────────────
// Daily account-level metrics for trend analysis

export const accountSnapshots = sqliteTable("account_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  followerCount: integer("follower_count"),
  mediaCount: integer("media_count"),
  reach: integer("reach"),
  impressions: integer("impressions"),
  profileViews: integer("profile_views"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("account_snapshots_platform_date_idx").on(table.platform, table.snapshotDate)
]);

// ── Demographics ─────────────────────────────────────────────────────
// Audience breakdown snapshots

export const demographics = sqliteTable("demographics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  metric: text("metric").notNull(), // "city" | "country" | "gender_age"
  key: text("key").notNull(), // e.g. "New York, NY" or "US" or "F.25-34"
  value: real("value").notNull(), // count or percentage
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  uniqueIndex("demographics_unique_idx").on(table.platform, table.snapshotDate, table.metric, table.key)
]);

// ── Type exports ─────────────────────────────────────────────────────

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type PostInsight = typeof postInsights.$inferSelect;
export type NewPostInsight = typeof postInsights.$inferInsert;

export type AccountSnapshot = typeof accountSnapshots.$inferSelect;
export type NewAccountSnapshot = typeof accountSnapshots.$inferInsert;

export type Demographic = typeof demographics.$inferSelect;
export type NewDemographic = typeof demographics.$inferInsert;

export type PostAnalysisRow = typeof postAnalysis.$inferSelect;
export type NewPostAnalysis = typeof postAnalysis.$inferInsert;

export type ContentInsightRow = typeof contentInsights.$inferSelect;
export type NewContentInsight = typeof contentInsights.$inferInsert;
