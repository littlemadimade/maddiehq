---
name: appseed-create
description: Create a new app from the AppSeed template. Interviews the user, copies the template, customizes all branding/copy/ports/Docker, runs migrations, and verifies the build. Supports Node.js (Next.js), Rails, or both stacks. Makes bootstrapping dead simple.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task
---

# appseed-create

You are helping the user create a brand new application from the AppSeed template. Your goal is to make this **dead simple** — the user answers a few questions and walks away with a fully customized, running project.

---

## Project Structure

AppSeed is a monorepo with two stacks side by side:

```
appseed/
├── node/          # Next.js app (package.json, lib/, app/, etc.)
├── rails/         # Rails app (Gemfile, app/, config/, etc.)
├── docker-compose.yml
├── CLAUDE.md
├── AGENTS.md
└── docs/
```

All Node.js file paths in this skill are relative to `TARGET_DIR/node/` (e.g., `lib/db.ts` means `TARGET_DIR/node/lib/db.ts`). All Rails paths are relative to `TARGET_DIR/rails/`.

---

## Step 1 — Interview

Ask the user these questions in a **single message** (not one at a time). Provide sensible defaults so they can just confirm:

```
Let's set up your new app! I need a few details:

1. Project name — Display name (e.g., "Moxmo", "TaskFlow", "BudgetBuddy")
2. One-line description — What it does (e.g., "Personal expense tracking with bank syncing")
3. Target directory — Where to create it (default: ~/Kode/<slug>)
4. Dev server port — Port for Node.js dev server (default: 3000)
5. Production port — For Node.js Docker production build (default: 3006)
6. Stack — Which stack(s)? (default: both)
   a) Node.js (Next.js) only
   b) Rails only
   c) Both (recommended — full template)
7. Primary deploy target for the Node stack (default: cloudflare)
   a) cloudflare — Workers + D1 + R2 ($5/mo Workers Standard, unlimited workers)
   b) vercel    — Vercel Pro for Node, separate DB host (Neon / Supabase / etc.)
   c) railway   — Railway with built-in Postgres
   d) other     — pick later, scaffold both code paths
```

**Wait for the user to respond before proceeding.**

From their answers, derive these variables (use throughout the rest of this skill):

| Variable | Example | Derivation |
|---|---|---|
| `APP_NAME` | Moxmo | Display name as given |
| `SLUG` | moxmo | Lowercase kebab-case of project name |
| `DESCRIPTION` | Personal expense tracking with bank syncing | One-liner as given |
| `TARGET_DIR` | ~/Kode/moxmo | Full path |
| `DEV_PORT` | 3000 | Dev server port (Node.js) |
| `PROD_PORT` | 3006 | Production port (Node.js) |
| `RAILS_DEV_PORT` | 3014 | Rails dev server port (always 3014) |
| `STACK` | both | `node`, `rails`, or `both` |
| `DEPLOY_TARGET` | cloudflare | `cloudflare`, `vercel`, `railway`, or `other` |

**Note on `DEPLOY_TARGET`**: This only affects the Node stack — Rails always deploys to a host that runs Ruby (Railway/Fly/Render). Cloudflare can't run Rails. If the user picks `cloudflare` and STACK includes `rails`, that means: Node deploys to Workers, Rails deploys somewhere else (ask them to pick or default to Railway). The codebase supports all four deploy targets simultaneously — the `DEPLOY_TARGET` choice mainly drives which scaffolded files get customized for the new project's name.

---

## Step 2 — Copy Template

1. Verify AppSeed template exists at `~/Kode/appseed`. If not found, ask the user where their AppSeed clone lives.

2. Verify the target directory does NOT already exist. If it does, warn the user and ask how to proceed (overwrite, pick new name, or abort).

3. Copy the template (excluding git history, build artifacts, and data):

```bash
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data/' \
  --exclude='.env.local' \
  --exclude='qa/' \
  # If STACK is "node" only:
  --exclude='rails/' \
  # If STACK is "rails" only:
  --exclude='node/' \
  ~/Kode/appseed/ TARGET_DIR/
```

- If `STACK` is `node`: add `--exclude='rails/'` to rsync
- If `STACK` is `rails`: add `--exclude='node/'` to rsync
- If `STACK` is `both`: copy everything (no extra excludes)

4. All remaining work happens in `TARGET_DIR`. Node.js files are under `TARGET_DIR/node/`, Rails files under `TARGET_DIR/rails/`.

---

## Step 3 — Core Configuration (Node.js)

**If STACK includes Node.js (`node` or `both`):**

All paths in this section are relative to `TARGET_DIR/node/`.

### 3a. package.json
- Change `"name"` from `"appseed"` to `"SLUG"`

### 3b. .env.example
- Update `BETTER_AUTH_URL` default to `http://localhost:DEV_PORT`
- Update `DATABASE_PATH` default to `./data/SLUG.db`
- Update `APP_NAME` comment to show the project name
- Update the `DATABASE_URL` comment example to use the project name: `postgres://user:password@localhost:5432/SLUG`

### 3c. Create .env.local
Generate a working local environment file with:
```env
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:DEV_PORT
DATABASE_PATH=./data/SLUG.db
APP_NAME=APP_NAME
APP_URL=http://localhost:DEV_PORT
# Uncomment to use PostgreSQL instead of SQLite:
# DATABASE_URL=postgres://user:password@localhost:5432/SLUG
```

### 3d. Database path defaults
Update the DATABASE_PATH fallback string `"./data/appseed.db"` to `"./data/SLUG.db"` in ALL of these files:
- `lib/db.ts`
- `lib/auth.ts`
- `drizzle.config.ts`
- `scripts/migrate.ts`
- `scripts/seed.ts`
- `scripts/rollback.ts`

### 3e. lib/auth.ts — APP_NAME default
- Change the APP_NAME fallback from `"AppSeed"` to `"APP_NAME"`
- (Do NOT modify the Better Auth configuration logic, plugins, social providers, or PG/SQLite conditional logic — only update string defaults)

### 3f. lib/email.ts
- Change the `APP_NAME` default from `'AppSeed'` to `'APP_NAME'`

### 3g. lib/mdx.ts
- Change the default author from `"AppSeed Team"` to `"The APP_NAME Team"`

### 3h. Theme storage keys (MUST match across ALL 5 locations)
Change `"appseed-theme"` to `"SLUG-theme"` in:
1. `lib/theme.tsx` — `STORAGE_KEY` constant
2. `lib/theme.tsx` — `COOKIE_KEY` constant
3. `app/layout.tsx` — the inline `themeScript` string (`localStorage.getItem('appseed-theme')`)
4. `app/(protected)/app/page.tsx` — ALL `localStorage.setItem("appseed-theme", ...)` calls (there are 3 occurrences)
5. `app/docs/layout.tsx` — the `storageKey` prop in `RootProvider` (`storageKey: "appseed-theme"` → `storageKey: "SLUG-theme"`)

### 3i. Other localStorage keys
- `components/cookie-consent.tsx` — Change `COOKIE_CONSENT_KEY` from `"appseed-cookie-consent"` to `"SLUG-cookie-consent"`
- `components/onboarding.tsx` — Change `STORAGE_KEY` from `"appseed-onboarding-completed"` to `"SLUG-onboarding-completed"`
- `components/onboarding.tsx` — Change `"Welcome to AppSeed!"` to `"Welcome to APP_NAME!"`

### 3j. Fallback URLs
Replace the fallback URL `"https://appseed.dev"` with `"https://SLUG.example.com"` in:
- `app/page.tsx` (the `siteUrl` const)
- `app/layout.tsx` (the `siteUrl` const)
- `app/sitemap.ts`
- `app/robots.ts`
- `app/feed.xml/route.ts` (also update `"AppSeed Blog"` title and description)

This makes it obvious the URL needs to be configured via `BETTER_AUTH_URL` env var, rather than silently falling back to `appseed.dev`.

### 3k. Export filename prefix
- `app/settings/page.tsx` — Change the export filename from `"appseed-export-"` to `"SLUG-export-"`
- `app/api/settings/export/route.ts` — Change `"appseed-export-"` to `"SLUG-export-"` in Content-Disposition header

---

## Step 3-Rails — Rails Configuration

**If STACK includes Rails (`rails` or `both`):**

All paths in this section are relative to `TARGET_DIR/rails/`.

### 3r-a. rails/.env
Create `rails/.env` with:
```env
SECRET_KEY_BASE=<generate with: openssl rand -hex 64>
DATABASE_PATH=./db/development.sqlite3
APP_URL=http://localhost:RAILS_DEV_PORT
APP_NAME=APP_NAME
```

### 3r-b. Rails branding
- `app/helpers/application_helper.rb` — Change `"AppSeed"` default in `app_name` to `"APP_NAME"`
- `app/views/layouts/application.html.erb` — Replace "AppSeed" references
- `app/views/pages/landing.html.erb` — Update product name, descriptions, features
- `app/views/auth/show.html.erb` — Update brand text

### 3r-c. Rails theme cookie key
- `app/javascript/controllers/theme_controller.js` — Change `"appseed-theme"` cookie name to `"SLUG-theme"`
- `app/javascript/controllers/command_palette_controller.js` — Same cookie name change
- `app/views/layouts/application.html.erb` — Update cookie name in anti-FOUC script and server-side check

### 3r-d. Rails Docker
- `docker-compose.yml` (at project root) — Update `appseed-rails-dev` → `SLUG-rails-dev`, `appseed-rails` → `SLUG-rails`
- Change `appseed_rails_data` volume to `SLUG_rails_data`
- Change `appseed-rails.db` to `SLUG-rails.db`
- `litestream.yml` — Change `LITESTREAM_REPLICA_PATH` default to `SLUG-rails`

---

## Step 4 — Docker Configuration

The `docker-compose.yml` and `Dockerfile` files live at `TARGET_DIR/node/` for Node.js (or `TARGET_DIR/docker-compose.yml` at root level). Check actual locations before editing.

### 4a. docker-compose.yml (Node.js services)

**If STACK includes Node.js:**

- Change `container_name: appseed-node-dev` to `container_name: SLUG-node-dev` (and `appseed-node` → `SLUG-node` for prod)
- Change `container_name: appseed-caddy-node-dev` to `container_name: SLUG-caddy-node-dev`
- Change `DEV_PORT:-3013` default to `DEV_PORT:-DEV_PORT`
- Change `BETTER_AUTH_URL` and `APP_URL` defaults to use `DEV_PORT` (dev) and `PROD_PORT` (prod)
- Change production port mapping from `3006:3006` to `PROD_PORT:PROD_PORT`
- Change `DATABASE_PATH` defaults from `appseed.db` to `SLUG.db`
- Change `TS_HOSTNAME_NODE:-appseed-node` default to `TS_HOSTNAME_NODE:-SLUG-node`
- Change `TS_HOSTNAME_RAILS:-appseed-rails` default to `TS_HOSTNAME_RAILS:-SLUG-rails` (if Rails stack)

### 4a-1. tailscale/Caddyfile.* (per-service Caddy configs)

**If STACK includes Node.js:** `tailscale/Caddyfile.node` and (if Rails) `tailscale/Caddyfile.rails`. These don't have project-name strings to update — they read `TS_AUTHKEY` / `TS_HOSTNAME` from env at runtime, which we set above. No edit needed.
- Change `APP_NAME:-AppSeed` to `APP_NAME:-APP_NAME`
- Change volume name from `appseed_data` to `SLUG_data` (both in `volumes:` definition and the service reference)

**Note:** Rails Docker changes are handled in Step 3r-d above.

### 4b. Dockerfile (Node.js)
- Change `EXPOSE 3006` to `EXPOSE PROD_PORT`
- Change `ENV PORT=3006` to `ENV PORT=PROD_PORT`
- Change `ENV DATABASE_PATH=/data/appseed.db` to `ENV DATABASE_PATH=/data/SLUG.db`
- Change the CMD port from `3006` to `PROD_PORT`

### 4c. Dockerfile.dev (Node.js)
- No changes needed (internal port stays 3000; docker-compose maps externally)

### 4d. litestream.yml (Node.js)
- Change `LITESTREAM_REPLICA_PATH` default from `db` to `SLUG` (so each project has a unique replica path)
- No other changes needed (credentials come from env vars at runtime)

### 4e. wrangler.toml (Node.js — Cloudflare-aware projects)

**Always edit this file** — even when `DEPLOY_TARGET` is not `cloudflare`. The codebase supports CF as one option among several, and the file is shipped in the template. Updating it now means it's correct if the user later decides to deploy to Cloudflare.

All paths relative to `TARGET_DIR/node/`.

- Change top-level `name = "appseed"` → `name = "SLUG"`
- Change `[env.production] name = "appseed"` → `name = "SLUG"`
- Change `[[d1_databases]] database_name = "appseed-db"` → `database_name = "SLUG-db"`
- Change `[[r2_buckets]] bucket_name = "appseed-storage"` → `bucket_name = "SLUG-storage"`
- Change `[vars] APP_NAME = "AppSeed"` → `APP_NAME = "APP_NAME"`
- **Leave `database_id = "00000000-0000-0000-0000-000000000000"` as a placeholder.** The operator replaces this with the real ID after running `wrangler d1 create SLUG-db` (Step 7-cf below).
- **Leave `[[d1_databases]] binding = "DB"` and `[[r2_buckets]] binding = "STORAGE"` unchanged.** The runtime code in `lib/db.ts` and `lib/storage.ts` looks up these binding names verbatim via `getCloudflareContext()`.

---

## Step 5 — Landing Page Customization

This is the most important step. **Generate compelling, product-specific copy** based on the project name and description. Don't just find-and-replace "AppSeed" — write copy that sounds like it was written for this specific product.

All Node.js paths below are relative to `TARGET_DIR/node/`.

**If STACK includes Rails**, also update `TARGET_DIR/rails/app/views/pages/landing.html.erb` with equivalent product-specific copy (product name, descriptions, features, testimonials, etc.).

### 5a. app/layout.tsx — Metadata
Update the exported `metadata` object:
- `title.default`: `"APP_NAME — <compelling tagline derived from description>"`
- `title.template`: `"%s | APP_NAME"`
- `description`: A 1-2 sentence product description
- `openGraph.siteName`: `APP_NAME`
- `openGraph.title` and `twitter.title`: Match the new title
- `openGraph.description` and `twitter.description`: Match the new description

### 5b. app/page.tsx — Full Landing Page

Rewrite ALL data constants and inline text. This is the bulk of the work.

**JSON-LD structured data:**
- Update organization `name`, `description`
- Update WebSite `name`
- Update SoftwareApplication `name`

**Hero section:**
- Badge text: Change from "The Next.js starter for builders" to something product-appropriate
- h1 headline: Write a compelling 2-line headline for the product
- Subtitle paragraph: Write a value proposition paragraph (2-3 sentences)
- Keep the CTA buttons structure but update text if needed
- Social proof line: Update or remove the "5.0 from 200+ developers" line

**`features` array (8 items):**
Rewrite ALL 8 feature cards to describe the actual product's features. Keep the lucide icon imports but choose appropriate icons. Each needs:
- `icon`: A relevant lucide-react icon
- `title`: Short feature name
- `description`: 1-2 sentence description of the feature

**`steps` array (3 items):**
Rewrite the "How It Works" steps to describe the product's onboarding/usage flow.

**`pricingPlans` array:**
- Keep the Free/Pro structure
- Update `description` fields to be product-appropriate
- Update feature lists to describe the product's actual value at each tier
- Update CTA text if needed

**`testimonials` array (3 items):**
Generate 3 plausible testimonials about the product. Use realistic names and roles. These are placeholder testimonials the user will replace later.

**Section headings and copy:**
- Features section heading/subtitle: Product-appropriate
- How It Works heading/subtitle: Product-appropriate
- Pricing heading/subtitle: Product-appropriate
- Testimonials heading/subtitle: Product-appropriate
- FAQ heading/subtitle: Product-appropriate
- CTA footer: Product-appropriate headline and subtitle

**Footer:**
- Change "AppSeed" brand text to `APP_NAME`
- Change tagline to something product-appropriate
- Update copyright line from "AppSeed" to `APP_NAME`
- Change the "Built with..." tagline to something appropriate

### 5c. components/landing/header.tsx
- Change the logo text from "AppSeed" to `APP_NAME`

### 5d. components/landing/faq.tsx
Replace ALL FAQ items with 6-8 product-specific Q&As. Generate questions a potential user would actually ask about this product. Keep the accordion component structure, just replace the `faqs` array contents.

### 5e. app/opengraph-image.tsx
- Change `alt` text to reflect the new product
- Replace "AppSeed" text in the image with `APP_NAME`
- Update the headline and subheadline text

### 5f. app/privacy-policy/page.tsx
- Update metadata `description` from "AppSeed" to `APP_NAME`
- Change the header brand text from "AppSeed" to `APP_NAME`

### 5g. app/terms/page.tsx
- Update metadata `description` from "AppSeed" to `APP_NAME`
- Change the header brand text from "AppSeed" to `APP_NAME`

### 5h. Auth pages branding
Change "AppSeed" to `APP_NAME` in ALL auth-related pages:
- `app/(auth)/auth/page.tsx` — brand text (2 occurrences)
- `app/(auth)/auth/layout.tsx` — metadata description
- `app/(auth)/forgot-password/page.tsx` — brand text
- `app/(auth)/forgot-password/layout.tsx` — metadata description
- `app/(auth)/reset-password/page.tsx` — brand text
- `app/(auth)/reset-password/layout.tsx` — metadata description
- `app/(auth)/verify-email/layout.tsx` — metadata description

### 5i. Protected pages branding
- `app/(protected)/app/page.tsx` — Change "AppSeed" brand text to `APP_NAME`
- `app/(protected)/app/layout.tsx` — Change metadata description from "Your AppSeed dashboard" to "Your APP_NAME dashboard"
- `app/(protected)/settings/page.tsx` — Change "AppSeed" brand text, and update the NEXT_PUBLIC_APP_NAME fallback from `"AppSeed"` to `"APP_NAME"`
- `app/(protected)/settings/layout.tsx` — Change metadata description

### 5j. Blog and changelog pages
- `app/blog/page.tsx` — Change "AppSeed" in metadata, header brand text, subtitle, and footer
- `app/blog/[slug]/page.tsx` — Change "AppSeed" brand text in header
- `app/changelog/page.tsx` — Change "AppSeed" in metadata, header brand text, subtitle, and footer

### 5k. RSS feed
- `app/feed.xml/route.ts` — Change `"AppSeed Blog"` title, description text, and `"appseed.dev"` fallback URL

---

## Step 6 — Clean Up Template Content

Ask the user:

> "Do you want me to remove the example Items CRUD (migration, API routes, dashboard reference)? You'll add your own data models later. (Recommended: yes)"

**If yes** (or default):
- Delete `node/migrations/001_create_items.sql` — **but NOT `000_better_auth_init.sql`** (that's the auth schema migration; the new project needs it)
- Delete `node/migrations/006_create_search_index.sql` — depends on items, breaks if items table doesn't exist
- Delete `node/migrations-pg/001_initial_schema.sql` (this is AppSeed's full PG schema — the new project will generate its own)
- Delete `node/app/api/items/` directory (both `route.ts` and `[id]/route.ts`)
- Remove any references to "items" in the dashboard page (`node/app/(protected)/app/page.tsx`) — replace with a welcome/getting-started placeholder
- Remove the `items` table definition from `node/lib/schema.sqlite.ts` and `node/lib/schema.pg.ts` and the re-export from `node/lib/schema.ts`
- **Do NOT delete `node/lib/schema.auth.ts`** — that's the mode-annotated auth schema for Better Auth's drizzleAdapter on D1. It's required for Cloudflare deploys to work and the new project should keep it.
- Remove search-related files that reference items FTS: `node/lib/search.ts` (or leave as a template — ask the user)

**Regardless:**
- Reset `node/content/changelog/changelog.mdx` to a simple initial entry:
  ```markdown
  # Changelog

  ## v0.1.0 — <today's date>
  - Initial project setup
  ```
- Remove example blog posts from `node/content/blog/` and replace with a single starter post:
  ```markdown
  ---
  title: "Welcome to APP_NAME"
  date: "<today's date>"
  excerpt: "We're excited to launch APP_NAME. Here's what we're building."
  author: "The APP_NAME Team"
  tags: ["announcement"]
  published: true
  ---

  Welcome to APP_NAME! Stay tuned for updates.
  ```
- Reset `PROJECT.md` to a simple project README:
  ```markdown
  # APP_NAME

  DESCRIPTION

  ## Getting Started

  ```bash
  cd node && npm install && npm run dev
  ```

  Visit http://localhost:DEV_PORT
  ```
- Update `AGENTS.md` — Change the opening line from "AppSeed is a production-ready Next.js SaaS starter" to "APP_NAME is..." and update the quick reference table to remove AppSeed-specific skill references that don't apply to the new project.
- Update `CLAUDE.md` — Change AppSeed references to APP_NAME, remove the skill copy commands (they're template-specific). Update the import paths section to reflect the current DB layer:
  ```ts
  // Database (Drizzle ORM — async, dialect-agnostic across SQLite / PG / D1)
  import { getDb } from "@/lib/db";                     // Drizzle ORM instance — picks driver per dialect
  import { setD1Binding, getD1Binding } from "@/lib/db"; // Test/runtime seam for the D1 binding
  import { queryFirst, executeChanges } from "@/lib/db-helpers"; // Async helpers
  import { isPg, isD1 } from "@/lib/db-dialect";        // Dialect detection
  // Note: lib/db-raw.ts (sqlite/pg raw adapters) does NOT have a D1 path. Avoid in code that
  // might run on D1 — use Drizzle directly instead. The raw adapter is fine for local dev / PG.
  ```
- If `docs/DEPLOYMENT.md` exists, update "appseed" references to use `SLUG` and update port references to `PROD_PORT`.
- If `LAUNCH_CHECKLIST.md` exists, update "AppSeed" references to `APP_NAME`.
- Remove `docs/pg-migration/` directory (the PG schema reference — no longer needed since `schema.pg.ts` is the source of truth).

### Update E2E tests
- `node/e2e/auth.spec.ts` — Change title assertions from `/AppSeed/i` to `/APP_NAME/i` (and any other AppSeed string matches in test files)
- Run `grep -r "appseed\|AppSeed" node/e2e/` and fix any remaining references

---

## Step 6b — Documentation & Wiki Hook Setup

**If STACK includes Node.js:**

### 6b-a. Set up wiki coverage hook

Create `.claude/settings.json` (at `TARGET_DIR/.claude/settings.json`) with a post-commit hook that reminds agents to update documentation:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -q 'git commit'; then bash scripts/check-wiki-coverage.sh 2>/dev/null || true; fi"
          }
        ]
      }
    ]
  }
}
```

This hook fires after every `git commit` and checks whether changed files have corresponding dev wiki coverage. If not, it outputs a reminder telling the agent which wiki pages to update.

### 6b-b. Update docs branding

- `node/content/docs/guide/index.mdx` — Change "AppSeed" references to `APP_NAME`
- `node/content/docs/guide/getting-started.mdx` — Update project name, default ports, and URLs
- `node/app/docs/layout.tsx` — Change `nav={{ title: "AppSeed Docs" }}` to `nav={{ title: "APP_NAME Docs" }}`
- `node/openapi-gen.config.json` — Change `"title": "AppSeed API"` to `"title": "APP_NAME API"` and update the server URL port

### 6b-c. Seed the dev wiki

The template includes starter wiki pages in `node/content/docs/dev/`. These are good starting points but should be reviewed after the project is customized. No changes needed at scaffolding time — the content is generic enough to apply to any AppSeed-derived project.

---

## Step 7 — Install & Initialize

Run these steps in order:

**If STACK includes Node.js:**
```bash
cd TARGET_DIR/node

# 1. Install dependencies
npm install

# 2. Run database migrations (creates auth tables + any app tables in local SQLite)
npm run db:migrate

# 3. Verify the local build compiles cleanly
npm run build
```

**If STACK includes Node.js AND DEPLOY_TARGET is `cloudflare`:** Also verify the Workers bundle builds:
```bash
# 4. Verify the Cloudflare Workers bundle builds (no actual deploy yet)
npm run build:cf
```

This runs `opennextjs-cloudflare build` against the customized project. It catches issues that don't surface in `npm run build` (Workers bundle size, OpenNext + Next config compatibility, etc.). The actual `wrangler login` / `wrangler d1 create` / `wrangler deploy` dance is the operator's responsibility — point them at the README "Cloudflare Workers Deploy" section. Do NOT run those commands during scaffolding.

**If STACK includes Rails:**
```bash
cd TARGET_DIR/rails && bundle install && bin/rails db:migrate
```

**If any build fails:** Fix the issue (usually a missed string replacement or import). Then rebuild. Do NOT proceed to git init until both builds succeed.

```bash
cd TARGET_DIR

# 4. Verify .gitignore excludes .env.local before committing
grep -q '.env.local' .gitignore || echo '.env.local' >> .gitignore

# 5. Initialize a fresh git repository
git init
git add -A
git commit -m "Initial project from AppSeed template"
```

---

## Step 8 — Summary

Present a clean summary, branching the "Next steps" by `DEPLOY_TARGET`:

```
Your new project is ready!

  Project:        APP_NAME
  Location:       TARGET_DIR
  Stack:          STACK
  Local DB:       SQLite at node/data/SLUG.db
  Deploy target:  DEPLOY_TARGET

  Node.js:        cd node && npm run dev → http://localhost:DEV_PORT       (if Node selected)
  Rails:          cd rails && bin/rails server → http://localhost:RAILS_DEV_PORT  (if Rails selected)
  Docker dev:     docker compose --profile dev up                          (both stacks)
  Docker prod:    docker compose --profile prod up                         (both stacks)

  Auth secret:    Generated and saved to node/.env.local (Node) / rails/.env (Rails)
  Local DB:       Migrations applied, auth tables ready
  Build:          Verified clean (npm run build  +  npm run build:cf if DEPLOY_TARGET=cloudflare)

Documentation:
  Customer docs:  http://localhost:DEV_PORT/docs           (content in node/content/docs/guide/)
  API reference:  http://localhost:DEV_PORT/api-docs        (auto-generated from @openapi JSDoc)
  Dev wiki:       http://localhost:DEV_PORT/admin/docs      (content in node/content/docs/dev/)
  Wiki hook:      Post-commit hook reminds agents to update docs when code changes
```

**Then append the Next-steps block matching `DEPLOY_TARGET`:**

### If `DEPLOY_TARGET` is `cloudflare`:

```
Next steps:
  1. cd TARGET_DIR/node && npm run dev → visit http://localhost:DEV_PORT
  2. Sign up at /auth to test the full auth flow against local SQLite
  3. When ready to deploy to Cloudflare, follow the README's
     "Cloudflare Workers Deploy" section — concrete steps:
        a. npx wrangler login
        b. npx wrangler d1 create SLUG-db
           → copy database_id into wrangler.toml
        c. (one-time, dashboard) Enable R2 on your CF account
        d. npx wrangler r2 bucket create SLUG-storage
        e. openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET
           plus secrets for any features enabled (Stripe, Resend, OAuth)
        f. npx wrangler d1 migrations apply SLUG-db --remote
        g. npm run deploy:cf
  4. Configure OAuth providers: /configure-sso
  5. Add feature secrets to wrangler:
        STRIPE_SECRET_KEY, STRIPE_PRICE_ID, RESEND_API_KEY, GOOGLE_CLIENT_*, etc.
        Each one: npx wrangler secret put VAR_NAME
  6. Bookmark: https://dash.cloudflare.com/<account>/workers/services/view/SLUG
```

### If `DEPLOY_TARGET` is `vercel`:

```
Next steps:
  1. cd TARGET_DIR/node && npm run dev → visit http://localhost:DEV_PORT
  2. Sign up at /auth to test the auth flow against local SQLite
  3. Connect this repo to Vercel: https://vercel.com/new
  4. Pick a managed Postgres (Neon / Supabase / Vercel Postgres),
     copy its connection string, set DATABASE_URL in Vercel env
  5. Configure OAuth providers: /configure-sso
  6. Add to Vercel env: BETTER_AUTH_SECRET, BETTER_AUTH_URL,
     STRIPE_SECRET_KEY, RESEND_API_KEY, etc.
  7. Push to deploy
```

### If `DEPLOY_TARGET` is `railway`:

```
Next steps:
  1. cd TARGET_DIR/node && npm run dev → visit http://localhost:DEV_PORT
  2. Sign up at /auth to test the auth flow
  3. railway init / railway link in TARGET_DIR
  4. railway add postgres → copy the connection string into DATABASE_URL
  5. Set env vars: railway variables set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
        plus BETTER_AUTH_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, etc.
  6. railway up to deploy
  7. Configure OAuth providers: /configure-sso
```

### If `DEPLOY_TARGET` is `other`:

```
Next steps:
  1. cd TARGET_DIR/node && npm run dev → visit http://localhost:DEV_PORT
  2. Sign up at /auth to test the auth flow
  3. The codebase supports three deploy targets out of the box:
        - Cloudflare Workers + D1 — README has a runbook
        - Vercel + managed Postgres — set DATABASE_URL in env
        - Railway / Fly / any Node host — set DATABASE_URL or DATABASE_PATH in env
  4. Configure OAuth providers: /configure-sso
  5. Pick a target and follow its setup; the dialect resolver in lib/db.ts
     picks SQLite, PG, or D1 from env vars at runtime.
```

---

## Important Notes

- **Generate real copy, don't just find-and-replace.** The landing page should read like it was written for this specific product. Use the project name and description to write compelling, specific marketing copy.
- **Run `npm run build` before git init.** Catch any missed replacements early.
- **The theme storage key MUST match across ALL 4 locations:** `lib/theme.tsx` STORAGE_KEY, `lib/theme.tsx` COOKIE_KEY, the inline script in `app/layout.tsx`, and the `localStorage.setItem` calls in `app/(protected)/app/page.tsx` (3 occurrences).
- **Docker port changes must be consistent** across `docker-compose.yml`, `Dockerfile`, and `.env.local`.
- **Don't modify Better Auth logic** in `lib/auth.ts` or `app/api/auth/[...all]/route.ts` — only update string defaults (DATABASE_PATH, APP_NAME). The auth module handles SQLite/PG/D1 switching automatically via `isPg()` / `isD1()` and the lazy-init `getAuth()` Proxy. The Proxy's `has` trap is required for `better-auth/next-js`'s `toNextJsHandler` to dispatch correctly — don't simplify it away.
- **Don't modify the DB layer architecture.** The async dialect-agnostic layer (`db.ts`, `db-dialect.ts`, `db-helpers.ts`, `db-raw.ts`, `schema.ts` barrel, `schema.sqlite.ts`, `schema.pg.ts`, `schema.d1.ts`, `schema.auth.ts`) is designed to work for SQLite, PostgreSQL, and Cloudflare D1 without changes. Only update string defaults like `DATABASE_PATH` fallbacks.
- **`lib/schema.auth.ts` is required** — it's the mode-annotated mirror of the auth tables (booleans → 0/1, Dates → unix epoch seconds), passed to Better Auth's `drizzleAdapter` on the D1 path. App code keeps reading the auth columns as integers via `lib/schema.sqlite.ts`. If you add a new column to an auth table, update **both** files.
- **All DB calls are async.** Every Drizzle query uses `await`. Functions like `isAdmin()`, `enqueueJob()`, `createNotification()`, etc. are all async and must be awaited. If you add new DB code, follow the same `await db.select()...` pattern (no `.all()`, `.get()`, `.run()`).
- **Don't modify the component library** (`components/ui/`) — it's product-agnostic by design.
- **Middleware filename — `middleware.ts` for Cloudflare, `proxy.ts` is Vercel-only:** Next.js 16 added `proxy.ts` as a successor convention but locked it to the Node runtime; OpenNext (Cloudflare) rejects Node-runtime middleware. Use `middleware.ts` (defaults to Edge runtime) for any project that targets — or might target — Cloudflare. Use `proxy.ts` only for Vercel-locked projects. AppSeed ships `middleware.ts` for portability; don't rename it.
- **`wrangler.toml`'s `database_id` is a placeholder.** The skill leaves it as `00000000-0000-0000-0000-000000000000`. The operator replaces it after running `wrangler d1 create SLUG-db` (in their own deploy flow, not in this skill). Don't try to provision the D1 from the skill — it requires interactive auth and creates billable resources.
- **Rails uses different auth conventions** — singular `user` table in Node (Better Auth), plural `users` table in Rails (ActiveRecord). Do not try to unify table names across stacks.
- **Rails OAuth callbacks** use `/api/auth/oauth/:provider/callback` pattern (not `/api/auth/callback/:provider` like Node).
- **Don't modify Rails controller logic** — only update string defaults and branding in views, helpers, and Stimulus controllers.
- **Monorepo structure:** Node.js code lives in `node/`, Rails code in `rails/`, shared config (docker-compose.yml, CLAUDE.md, AGENTS.md) at root. All `npm` commands run from the `node/` directory.
- **Verify completeness**: After all edits, run `grep -ri "appseed" --include="*.ts" --include="*.tsx" --include="*.yml" --include="*.md" --include="*.rb" --include="*.erb" --include="*.js" node/ rails/` to catch any remaining references. The only acceptable remaining occurrences are in `.claude/skills/appseed-sync/` (which can be deleted from the new project if desired).
- If any step fails, fix the issue before proceeding. Don't skip steps.
