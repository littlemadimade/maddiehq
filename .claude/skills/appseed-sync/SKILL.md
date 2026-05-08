---
name: appseed-sync
description: Sync improvements from the AppSeed template into the current downstream project. Explores both repos in parallel, diffs them, presents a checklist of features to port, then creates a GH issue and branch for the selected work. Supports both Node.js and Rails stacks.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task
---

# appseed-sync

You are helping the user pull new features and improvements from the AppSeed template into their current project.

## Step 1 — Locate AppSeed

Check if AppSeed exists at `~/Kode/appseed`. If not found, ask the user where their AppSeed clone lives before proceeding.

Also confirm the current working directory is a downstream project (not AppSeed itself). If it looks like AppSeed, warn the user and abort.

## Step 2 — Read the changelog (fast path)

Check if the AppSeed template has a `changelogs/` directory. If it does:

1. Read `.appseed-sync-cursor` in the current project to find `last_synced_at` (or `created_at` if never synced).
2. Read all files in `changelogs/` from the AppSeed repo.
3. Filter entries where `date` is **after** the cursor date.
4. Determine which stack(s) the downstream project uses (check for `node/` or `rails/` directories, or `package.json` vs `Gemfile` at root).
5. Filter entries to only those matching the project's stack(s) via the `scope` field.

If there are matching changelog entries, **skip the full exploration** and go directly to Step 4 using the changelog data. The `files_changed`, `requires_migration`, `requires_env_vars`, and `breaking` fields give you everything needed.

If there are NO changelog entries newer than the cursor, tell the user "Your project is up to date with AppSeed!" and stop.

If there is no `changelogs/` directory or no `.appseed-sync-cursor`, fall back to the full exploration below.

## Step 2b — Full exploration (fallback)

Only do this if the changelog fast path is not available. Launch two Task agents simultaneously:

**Agent A — AppSeed inventory:**
Explore the AppSeed repo. Produce a structured inventory of:

**Node.js stack (`node/` or root-level):**
- `lib/` — every file, one-line description of what it provides. Note in particular: `db.ts` (dialect-aware Drizzle setup with D1/PG/SQLite branches), `db-dialect.ts` (`isPg()` / `isD1()` predicates), `auth.ts` (lazy-init betterAuth via Proxy), `schema.sqlite.ts` / `schema.pg.ts` (per-dialect Drizzle schemas), `schema.auth.ts` (mode-annotated auth tables for the D1 drizzleAdapter — booleans → 0/1, Dates → unix epoch).
- `components/ui/` — every exported component with its variants/props
- `components/` (top-level) — non-UI components (onboarding, cookie-consent, etc.)
- `app/` — pages and API routes
- `middleware.ts` — Next.js Edge-runtime middleware (route protection, session cookie check). On post-May-2026 AppSeed this file is named `middleware.ts`, not `proxy.ts` — see Cloudflare migration boundary note below.
- `next.config.ts` — note any `outputFileTracingIncludes` block; this is used to force `pg-cloudflare` files into the standalone server output for OpenNext bundling.
- `migrations/` — what tables/schema exist. `000_better_auth_init.sql` is the auth schema as a numbered migration (post-May-2026, for D1 compatibility); pre-May-2026 projects didn't have this — auth tables came from a runtime `bootstrapAuthSchema()` call instead.
- `wrangler.toml` — Cloudflare Workers config (D1 binding `DB`, R2 binding `STORAGE`, `[vars]` block, `compatibility_flags = ["nodejs_compat"]`). Present only if the project deploys to Cloudflare.
- `open-next.config.ts` — OpenNext Cloudflare adapter config. Present only if the project deploys to Cloudflare.
- `tailscale/Caddyfile.*` — Per-service Caddy configs for tailnet HTTPS dev (one per service, e.g. `Caddyfile.node`, `Caddyfile.rails`).
- `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml` — Docker/Compose setup (note container names, volume names, port mappings, env vars). Dockerfile.dev should COPY `source.config.ts` and `content/` before `npm ci` (fumadocs-mdx postinstall requirement).
- `litestream.yml` — SQLite replication config (if present)
- `package.json` — note presence of `build:cf`, `preview:cf`, `deploy:cf` scripts and `@opennextjs/cloudflare` / `pg-cloudflare` deps. These signal a Cloudflare-aware project.
- Key patterns: error handling approach, logging, rate limiting, toast system, theme system, command palette, blog/MDX system, SEO files

**Rails stack (`rails/`):**
- `rails/app/controllers/` — every controller, one-line description
- `rails/app/models/` — every model with associations
- `rails/app/views/` — ERB templates organized by controller
- `rails/app/javascript/controllers/` — every Stimulus controller with its purpose
- `rails/app/helpers/` — helper modules
- `rails/app/mailers/` — mailer classes
- `rails/config/` — routes, initializers, database config
- `rails/lib/` — utility classes (rate_limiter.rb, etc.)
- `rails/db/migrate/` — migration files and what tables they create
- `rails/Gemfile` — key dependencies
- `rails/Dockerfile`, `rails/Dockerfile.dev` — Rails Docker setup
- `docker-compose.yml` — Rails services (`rails-dev`, `rails-prod`, `litestream-rails`)
- `rails/litestream.yml` — Rails SQLite replication config

**Agent B — Current project inventory:**
Explore the current project repo. Produce the same structured inventory for the same categories (both Node.js and Rails). Note any existing implementations that overlap with AppSeed. Identify which stack(s) the downstream project is using.

Wait for BOTH agents to complete before proceeding.

## Step 3 — Diff and score

Compare the two inventories (or changelog entries). For each AppSeed feature, determine:
- **MISSING** — not present in the downstream project at all
- **OUTDATED** — present but AppSeed's version is meaningfully better (e.g. missing error classes, no structured logging, simpler rate limiter)
- **EQUIVALENT** — already present and comparable quality (skip)
- **IRRELEVANT** — not applicable to this project (skip)

**Note:** Rails features should be compared separately from Node features. A downstream project may use only one stack — only show items relevant to the stacks actually in use. If the downstream project has both stacks, present Node and Rails items in separate sections.

Assign a complexity estimate to each porteable item:
- **LOW** — drop-in copy, minimal adaptation needed (e.g. lib/errors.ts, lib/logger.ts)
- **MED** — needs some wiring or adaptation (e.g. UI components, toast system)
- **HIGH** — significant integration work (e.g. auth migration, full blog system)

## Step 4 — Present the checklist

Output a formatted checklist grouped into these categories (omit empty categories):

```
Found N AppSeed improvements available for this project:

INFRASTRUCTURE
  [1] lib/errors.ts — standardized AppError/BadRequestError/UnauthorizedError classes  [LOW]
  [2] lib/logger.ts — structured JSON logger with request ID and logRequest helper      [LOW]
  ...

UI SYSTEM
  [4] components/ui/* — Button, Input, Modal, Card, Badge, Avatar, Alert, Tabs, etc.   [MED]
  [5] Toast system — useToast hook + ToastContainer, auto-dismiss, 4 variants          [LOW]
  ...

MARKETING / PUBLIC-FACING
  [7] SEO infrastructure — sitemap.ts, robots.ts, opengraph-image.tsx, metadata        [LOW]
  ...

DEPLOYMENT
  [8] Docker — Dockerfile (prod multi-stage), Dockerfile.dev, docker-compose.yml
              (dev + prod + litestream services), litestream.yml (SQLite replication) [LOW]
  ...

RAILS
  [N] Rails auth system — session-based auth with OAuth, 2FA                            [HIGH]
  [N] Rails admin panel — user management, analytics, blog editor, database             [HIGH]
  [N] Rails Stimulus controllers — toast, theme, command palette, etc.                  [MED]
  [N] Rails views — landing page, auth pages, settings, admin                           [MED]
  [N] Rails models — User, Session, Account, etc.                                       [MED]
  [N] Rails Docker — Dockerfile, Dockerfile.dev, docker-compose services                [LOW]
  ...

OPTIONAL / PROJECT-SPECIFIC
  [9] Blog / MDX — content/blog, /blog pages, RSS feed, custom MDX components         [HIGH]
  ...

Enter the numbers you want to port (e.g. "1 2 3 5"), "all" to select everything,
or "skip" to exit without creating an issue.
```

**Do not proceed past this point until the user responds.**

## Step 5 — Confirm selections

Repeat the selected items back to the user as a concise list and ask:
> "Ready to create a GH issue and branch for these N items. Confirm?"

Wait for confirmation before proceeding.

## Step 6 — Create the GH issue

Create a GitHub issue with:
- **Title:** `Sync AppSeed improvements: [comma-separated short names of selected items]`
- **Body:** A markdown checklist of the selected items, each with a one-line description and complexity. Add a note about any items that need adaptation (schema differences, env var names, Tailwind version, etc.)
- **Labels:** `enhancement` (if it exists on the repo)

Report the issue URL to the user.

## Step 7 — Create the branch

```bash
git checkout -b sync/appseed-[short-descriptor]
```

Use a short descriptor derived from the selected items (e.g. `sync/appseed-errors-logger-toast`). If more than 3 items, just use `sync/appseed-[YYYY-MM-DD]`.

Report the branch name and tell the user:
> "Branch created. Run `/appseed-sync` again on this branch to begin porting, or ask me to start implementing — I'll work through the checklist one item at a time, committing after each."

## Step 8 — Update the sync cursor

After the user finishes porting (or if they select items and complete the work), update `.appseed-sync-cursor` in the project:

```
last_synced_at: [today's date YYYY-MM-DD]
```

Keep `created_from_commit` and `created_at` unchanged. This ensures the next `/appseed-sync` run only shows entries newer than this sync.

## Important notes

- **Changelog-first.** When changelog entries exist, use them instead of full exploration. They contain `files_changed` (exactly what to diff), `requires_migration`, `requires_env_vars`, and `breaking` flags. This is much faster and more accurate than manual exploration.
- **Port one item at a time.** If the user proceeds to implementation, commit after each feature before starting the next.
- **Adapt, don't blindly copy.** Check import paths (`@/lib/...`), table/column names (`user` vs `users`), env var names, and Tailwind version before pasting code.
- **Run `npm run build`** after each port to catch type errors immediately.
- **Foreign keys** must reference the local project's user table — check whether it's `user(id)` (Better Auth) or `users(id)` (older custom auth).
- If AppSeed uses Tailwind v4 and the project uses v3, flag each UI component as needing class name review.
- **Docker files always include:** When porting Docker (`Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`), rename all container names, volume names, and `DATABASE_PATH` defaults from `appseed` to the project name. The `docker-compose.yml` dev service `BETTER_AUTH_URL` and `APP_URL` should match the dev port.
- **Docker Compose profiles:** Ensure `docker-compose.yml` uses `profiles: [dev]` on the dev service and `profiles: [prod]` on prod + litestream services. Without profiles, `docker compose up` tries to start both dev and prod, causing port conflicts.
- **After porting Docker, remind the user:** Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` before running `docker compose up`. The `:?` syntax in `docker-compose.yml` causes interpolation to fail at startup if the variable is missing — even for services the user isn't trying to run. Suggest: `cp .env.example .env && echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env`
- **Better Auth schema — never hand-write it.** After porting `lib/auth.ts`, run `npx @better-auth/cli generate --config lib/auth.ts` to get the exact `CREATE TABLE` SQL that matches the installed version. Paste that SQL into both `lib/auth.ts` (on `authDb` before `betterAuth()`) and `lib/db.ts` (in `getDb()`). These are two separate DB connections — both need the schema init.
- **Middleware filename — `middleware.ts` for Cloudflare, `proxy.ts` is Vercel-only:** Next.js 16 introduced `proxy.ts` as a successor to `middleware.ts`, but `proxy.ts` is hardcoded to the Node.js runtime. OpenNext rejects Node-runtime middleware on Cloudflare Workers. Use `middleware.ts` (which defaults to Edge runtime) if the project deploys — or might deploy — to Cloudflare. Use `proxy.ts` only if the project is Vercel-locked. The exported function name follows the file: `middleware` for `middleware.ts`, `proxy` for `proxy.ts`. Post-May-2026 AppSeed uses `middleware.ts` for portability.
- **Don't forget `app/globals.css`:** Required for Tailwind v4 (`@import "tailwindcss"`), the semantic token system (`@theme inline` block + `:root` / `.dark` CSS variables), and animation keyframes. Easy to miss during port.
- **Radix/shadcn UI migration boundary (April 2026):** AppSeed's Node UI layer was migrated from hand-rolled components to Radix-backed shadcn/ui primitives in `2026-04-09-radix-shadcn-ui-migration`. Downstream projects created **before** this date have hand-rolled `Modal`, `Tabs`, `DropdownMenu`, `ToastContainer`, `CommandPalette`, etc. and use hardcoded `bg-emerald-600` color classes. When syncing UI features from this template into a pre-April-2026 project, you have two options:
  1. **Token-only sync** — pull `app/globals.css`'s `@theme inline` block and `:root`/`.dark` CSS variable definitions, then run a find-and-replace from `bg-emerald-*` → `bg-primary`, `text-gray-500` → `text-muted-foreground`, etc. (full mapping table in `node/content/docs/dev/theming.mdx`). No Radix install needed. Existing components keep working.
  2. **Full sync** — pull `package.json` deps (15 new packages: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `sonner`, `cmdk`, plus 8 `@radix-ui/react-*` primitives), then pull all files in `components/ui/` and `lib/utils.ts`. The legacy `<Modal>`, `<Tabs>`, etc. APIs are preserved as wrappers so consumer code doesn't need to change.
  
  Tell the user which option they want before pulling. Option 1 is safer; option 2 unlocks Popover/Tooltip/Select/AlertDialog and proper a11y but is a bigger change.

- **Cloudflare D1 / Workers migration boundary (May 2026):** AppSeed's Node stack gained Cloudflare-first deployment support in early May 2026 (issue #275). Downstream projects created **before** this date have no `wrangler.toml`, no `open-next.config.ts`, no `lib/schema.auth.ts`, no `migrations/000_better_auth_init.sql`, and no `isD1()` branch in `lib/db.ts` / `lib/auth.ts`. They deploy to Vercel/Railway/Fly with SQLite or PostgreSQL. When syncing into a pre-May-2026 project, you have three paths:
  1. **Don't sync the Cloudflare bits** — port other improvements (UI, infrastructure, etc.) but leave the project on its existing deploy target. Skip `wrangler.toml`, `open-next.config.ts`, `lib/schema.auth.ts`, `000_better_auth_init.sql`, `@opennextjs/cloudflare` / `pg-cloudflare` deps, and the `build:cf` / `preview:cf` / `deploy:cf` npm scripts. Apply the rest.
  2. **Add Cloudflare as an additional target alongside the existing host** — pull all files in path (1), plus update `lib/db.ts` and `lib/auth.ts` to add the `isD1()` branch and the lazy-init Better Auth Proxy, plus add `lib/schema.auth.ts`. Existing Vercel/Railway deploy keeps working — Cloudflare becomes opt-in via `DATABASE_DRIVER=d1` env. The `appseed-create` skill's deploy runbook (in the README) covers the operator setup (`wrangler login`, `wrangler d1 create`, `wrangler r2 bucket create`, `wrangler secret put`, migrations apply).
  3. **Migrate the project entirely to Cloudflare** — same as (2), but also run the operator setup, deploy, and decommission the old hosting once verified. Bigger commitment.

  Tell the user which path they want before pulling. Option 1 is safest. Option 2 is the recommended path for projects expecting cost-sensitive scale (D1 free tier is generous, Workers Standard is $5/mo for unlimited workers).

- **Schema-modes split — `schema.sqlite.ts` vs `schema.auth.ts`:** Post-May-2026, the auth tables exist in TWO Drizzle schema files: `lib/schema.sqlite.ts` (plain `integer()` columns — the canonical schema used by app code via `getDb()`) and `lib/schema.auth.ts` (mode-annotated versions: `integer({mode: "boolean"})` for `emailVerified`/`twoFactorEnabled`/`isAdmin`/`disabled`, `integer({mode: "timestamp"})` for `createdAt`/`updatedAt`/`expiresAt`). The mode-annotated tables are passed to Better Auth's `drizzleAdapter` *only*, so the adapter can convert JS booleans → 0/1 and Date objects → unix epoch seconds at the boundary. App code keeps reading the auth columns as integers via `schema.sqlite.ts`. When porting auth-related changes, update **both** files.
- **`lib/utils.ts` and `lib/cn.ts`:** Both files exist post-migration. `lib/utils.ts` has the canonical shadcn `cn()` (using clsx + tailwind-merge). `lib/cn.ts` re-exports from it for backward compat with old imports. New code should import from `@/lib/utils`.
- **Rails has different conventions**: Tables are plural (`users` not `user`), columns are snake_case (`stripe_customer_id` not `stripeCustomerId`), auth is session-based (not Better Auth). Do not try to match Node naming conventions when porting Rails code.
- **When porting Rails:** Run `cd rails && bundle install && bin/rails db:migrate` to verify migrations apply cleanly after porting.
- **Rails Docker services** use profile `prod` and `dev` — same as Node services. The docker-compose.yml has separate services: `rails-dev`, `rails-prod`, and `litestream-rails`.
- **Rails OAuth callback pattern** is `/api/auth/oauth/:provider/callback` (not `/api/auth/callback/:provider` like Node/Better Auth).
