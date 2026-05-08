/**
 * Drizzle ORM schema definitions for all database tables.
 *
 * Better Auth tables (user, session, account, verification, twoFactor) are
 * defined here as reference-only — they are excluded from drizzle-kit migrations
 * via tablesFilter in drizzle.config.ts. They exist so we can use them in
 * JOINs and get proper FK types.
 *
 * Column names match the existing DB exactly (mixed snake_case/camelCase).
 */

import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Better Auth Tables (reference-only, not managed by drizzle-kit) ─────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified").notNull().default(0),
  name: text("name"),
  image: text("image"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  twoFactorEnabled: integer("twoFactorEnabled").notNull().default(0),
  plan: text("plan").default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus").default("inactive"),
  isAdmin: integer("isAdmin").notNull().default(0),
  disabled: integer("disabled").notNull().default(0),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_session_userId").on(table.userId),
  index("idx_session_token").on(table.token),
]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: integer("expiresAt"),
  password: text("password"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt").notNull().default(sql`(unixepoch())`),
  accessTokenExpiresAt: integer("accessTokenExpiresAt"),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt"),
  scope: text("scope"),
}, (table) => [
  uniqueIndex("account_providerId_accountId_unique").on(table.providerId, table.accountId),
  index("idx_account_userId").on(table.userId),
]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt").notNull(),
  createdAt: integer("createdAt"),
  updatedAt: integer("updatedAt"),
}, (table) => [
  index("idx_verification_identifier").on(table.identifier),
]);

export const twoFactor = sqliteTable("twoFactor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backupCodes").notNull(),
  userId: text("userId").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
});

// ─── App Tables (managed by drizzle-kit migrations) ──────────────────────────

export const adminLogs = sqliteTable("admin_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  admin_id: text("admin_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  target_type: text("target_type"),
  target_id: text("target_id"),
  details: text("details"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_admin_logs_admin_id").on(table.admin_id),
  index("idx_admin_logs_created_at").on(table.created_at),
]);

export const planOverrides = sqliteTable("plan_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull().unique().references(() => user.id),
  plan: text("plan").notNull().default("pro"),
  reason: text("reason"),
  granted_by: text("granted_by").notNull().references(() => user.id),
  expires_at: text("expires_at"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_plan_overrides_user_id").on(table.user_id),
]);

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: text("status").default("active"),
  source: text("source").default("website"),
  unsubscribed_at: text("unsubscribed_at"),
  tags: text("tags").default("[]"),
  unsubscribe_token: text("unsubscribe_token"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_ns_unsubscribe_token").on(table.unsubscribe_token),
]);

export const blogPosts = sqliteTable("blog_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  author_id: text("author_id").references(() => user.id),
  published_at: text("published_at"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload").notNull().default("{}"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("maxAttempts").notNull().default(3),
  lastError: text("lastError"),
  scheduledAt: integer("scheduledAt").notNull().default(sql`(unixepoch())`),
  startedAt: integer("startedAt"),
  completedAt: integer("completedAt"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_jobs_status_scheduled").on(table.status, table.scheduledAt),
  index("idx_jobs_type").on(table.type),
]);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("contentType").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  storageBackend: text("storageBackend").notNull().default("local"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_files_userId").on(table.userId),
  index("idx_files_key").on(table.key),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull().default(""),
  read: integer("read").notNull().default(0),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notifications_userId").on(table.userId),
  index("idx_notifications_userId_read").on(table.userId, table.read),
]);

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").notNull().default("[]"),
  active: integer("active").notNull().default(1),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_webhooks_userId").on(table.userId),
]);

export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  webhookId: text("webhookId").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: text("payload").notNull().default("{}"),
  responseStatus: integer("responseStatus"),
  responseBody: text("responseBody"),
  success: integer("success").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("lastError"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  completedAt: integer("completedAt"),
}, (table) => [
  index("idx_webhook_deliveries_webhookId").on(table.webhookId),
  index("idx_webhook_deliveries_createdAt").on(table.createdAt),
]);

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").notNull().default("[]"),
  is_system: integer("is_system").notNull().default(0),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const userRoles = sqliteTable("user_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role_id: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assigned_by: text("assigned_by").references(() => user.id, { onDelete: "set null" }),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_user_roles_user_id").on(table.user_id),
  index("idx_user_roles_role_id").on(table.role_id),
  uniqueIndex("user_roles_user_id_role_id_unique").on(table.user_id, table.role_id),
]);

export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  referral_code: text("referral_code").notNull().unique(),
  referred_by: text("referred_by"),
  referral_count: integer("referral_count").notNull().default(0),
  status: text("status").notNull().default("waiting"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  invited_at: text("invited_at"),
}, (table) => [
  index("idx_waitlist_email").on(table.email),
  index("idx_waitlist_status").on(table.status),
  index("idx_waitlist_referral_code").on(table.referral_code),
]);

export const inviteCodes = sqliteTable("invite_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  email: text("email"),
  used_by: text("used_by").references(() => user.id),
  created_by: text("created_by").notNull().references(() => user.id),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  used_at: text("used_at"),
  expires_at: text("expires_at"),
}, (table) => [
  index("idx_invite_codes_code").on(table.code),
  index("idx_invite_codes_email").on(table.email),
]);

export const emailEvents = sqliteTable("email_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email_id: text("email_id"),
  campaign_id: text("campaign_id"),
  subscriber_email: text("subscriber_email"),
  event_type: text("event_type").notNull(),
  link_url: text("link_url"),
  metadata: text("metadata").default("{}"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_ee_campaign_id").on(table.campaign_id),
  index("idx_ee_subscriber_email").on(table.subscriber_email),
  index("idx_ee_event_type").on(table.event_type),
]);

export const emailCampaigns = sqliteTable("email_campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  preview_text: text("preview_text").default(""),
  html_content: text("html_content").notNull(),
  status: text("status").notNull().default("draft"),
  audience_filter: text("audience_filter").default("{}"),
  recipient_count: integer("recipient_count").default(0),
  sent_count: integer("sent_count").default(0),
  scheduled_at: text("scheduled_at"),
  sent_at: text("sent_at"),
  resend_broadcast_id: text("resend_broadcast_id"),
  created_by: text("created_by").notNull().references(() => user.id),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_campaigns_status").on(table.status),
  index("idx_campaigns_created_at").on(table.created_at),
]);

export const _migrations = sqliteTable("_migrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  applied_at: text("applied_at").default(sql`CURRENT_TIMESTAMP`),
});
