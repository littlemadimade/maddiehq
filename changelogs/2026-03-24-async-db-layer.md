---
date: 2026-03-24
scope: [node]
category: feature
files_changed:
  - node/lib/db.ts
  - node/lib/db-dialect.ts
  - node/lib/db-helpers.ts
  - node/lib/db-raw.ts
  - node/lib/db-raw-sqlite.ts
  - node/lib/db-raw-pg.ts
  - node/lib/schema.ts
  - node/lib/schema.sqlite.ts
  - node/lib/schema.pg.ts
  - node/lib/migrate.ts
  - node/drizzle.config.ts
requires_migration: false
requires_env_vars: [DATABASE_URL]
breaking: false
---

## Async dialect-agnostic database layer (PostgreSQL support)

The Node app now supports both SQLite and PostgreSQL, switchable via the `DATABASE_URL` env var. All database calls are async.

- **Phase 1**: Dialect config (`db-dialect.ts`), async helpers (`db-helpers.ts`), PG dependencies
- **Phase 2**: Dual schema (`schema.sqlite.ts` / `schema.pg.ts`) with barrel re-export, dialect-aware `db.ts`
- **Phase 3**: All ~35 files converted from sync `.all()`/`.get()`/`.run()` to `await`
- **Phase 4**: Raw SQL adapter (`db-raw.ts`) abstracting SQLite-specific calls (PRAGMA, FTS5, sqlite_master)
- **Phase 5**: Better Auth PG support, PG migration infrastructure

Set `DATABASE_URL=postgres://user:pass@host:5432/dbname` to use PostgreSQL. Omit it for SQLite (default).
