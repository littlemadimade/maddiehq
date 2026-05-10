#!/usr/bin/env npx tsx
/**
 * Seed the database with sample development data.
 * Usage: npx tsx scripts/seed.ts
 *
 * Note: This requires a user to exist in the database (created via Better Auth).
 * Run the app, sign up a test user, then run this script.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/maddiehq.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Find the first user in the database
const user = db.prepare("SELECT id, email FROM user LIMIT 1").get() as
  | { id: string; email: string }
  | undefined;

if (!user) {
  console.error("No users found. Sign up a test user first, then run this script.");
  process.exit(1);
}

console.log(`Seeding data for user: ${user.email} (${user.id})`);

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const sampleItems = [
  { name: "Getting Started Guide", description: "Read the docs and set up your environment" },
  { name: "Authentication System", description: "Email/password, OAuth, and MFA are all ready" },
  { name: "Payment Integration", description: "Stripe checkout, portal, and webhooks configured" },
  { name: "Email Templates", description: "Welcome, verification, and password reset emails" },
  { name: "Database Schema", description: "SQLite with Better Auth tables and items table" },
];

const insertItem = db.prepare(
  "INSERT OR IGNORE INTO items (id, user_id, name, description) VALUES (?, ?, ?, ?)"
);

let inserted = 0;
for (const item of sampleItems) {
  const result = insertItem.run(generateId(), user.id, item.name, item.description);
  if (result.changes > 0) inserted++;
}

console.log(`✓ Inserted ${inserted} sample item(s).`);

db.close();
