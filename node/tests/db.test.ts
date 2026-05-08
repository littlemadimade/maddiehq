import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const TEST_DB = "./data/test-db-unit.db";

function cleanupDb() {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(TEST_DB + ext);
    } catch {
      // ignore
    }
  }
}

describe("Database", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    cleanupDb();
    const dir = path.dirname(TEST_DB);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(TEST_DB);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  it("should create items table", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        emailVerified INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("items");
    expect(tableNames).toContain("user");
  });

  it("should CRUD items correctly", () => {
    // Setup user and items tables
    db.exec(`
      CREATE TABLE user (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL
      );
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `);

    // Insert a user
    db.prepare("INSERT INTO user (id, email) VALUES (?, ?)").run("u1", "test@test.com");

    // Create
    db.prepare("INSERT INTO items (id, user_id, name, description) VALUES (?, ?, ?, ?)").run(
      "i1",
      "u1",
      "Test Item",
      "A description"
    );

    // Read
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get("i1") as Record<string, unknown>;
    expect(item).toBeDefined();
    expect(item.name).toBe("Test Item");
    expect(item.description).toBe("A description");
    expect(item.user_id).toBe("u1");

    // Update
    db.prepare("UPDATE items SET name = ? WHERE id = ? AND user_id = ?").run("Updated Item", "i1", "u1");
    const updated = db.prepare("SELECT * FROM items WHERE id = ?").get("i1") as Record<string, unknown>;
    expect(updated.name).toBe("Updated Item");

    // Delete
    const result = db.prepare("DELETE FROM items WHERE id = ? AND user_id = ?").run("i1", "u1");
    expect(result.changes).toBe(1);

    const deleted = db.prepare("SELECT * FROM items WHERE id = ?").get("i1");
    expect(deleted).toBeUndefined();
  });

  it("should enforce foreign key constraints", () => {
    db.exec(`
      CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `);

    // Insert item with non-existent user should fail
    expect(() => {
      db.prepare("INSERT INTO items (id, user_id, name) VALUES (?, ?, ?)").run(
        "i1",
        "nonexistent",
        "Bad Item"
      );
    }).toThrow();
  });

  it("should isolate items by user_id", () => {
    db.exec(`
      CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `);

    db.prepare("INSERT INTO user (id, email) VALUES (?, ?)").run("u1", "a@test.com");
    db.prepare("INSERT INTO user (id, email) VALUES (?, ?)").run("u2", "b@test.com");

    db.prepare("INSERT INTO items (id, user_id, name) VALUES (?, ?, ?)").run("i1", "u1", "User 1 Item");
    db.prepare("INSERT INTO items (id, user_id, name) VALUES (?, ?, ?)").run("i2", "u2", "User 2 Item");

    const user1Items = db.prepare("SELECT * FROM items WHERE user_id = ?").all("u1") as Record<string, unknown>[];
    expect(user1Items).toHaveLength(1);
    expect(user1Items[0].name).toBe("User 1 Item");

    const user2Items = db.prepare("SELECT * FROM items WHERE user_id = ?").all("u2") as Record<string, unknown>[];
    expect(user2Items).toHaveLength(1);
    expect(user2Items[0].name).toBe("User 2 Item");
  });

  it("should handle WAL mode correctly", () => {
    const mode = db.pragma("journal_mode") as { journal_mode: string }[];
    expect(mode[0].journal_mode).toBe("wal");
  });
});
