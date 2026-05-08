# MaddieHQ

A production-ready SaaS starter template with two framework implementations: **Node.js** (Next.js) and **Ruby on Rails**. Both share the same feature set — auth, payments, admin panel, blog, email — with framework-appropriate conventions.

## Quick Start (Docker)

Both apps run via Docker Compose using profiles (`dev` or `prod`) and service names (`node-*` or `rails-*`).

### Node.js (Next.js) — Port 3013

```bash
# Development (hot reload, bind mounts)
docker compose build node-dev
docker compose --profile dev up node-dev

# Production
docker compose build node-prod
docker compose --profile prod up node-prod
```

### Rails — Port 3014

```bash
# Development (hot reload, bind mounts)
docker compose build rails-dev
docker compose --profile dev up rails-dev

# Production
docker compose build rails-prod
docker compose --profile prod up rails-prod
```

### Rebuilding After Code Changes

If you've changed `Gemfile`, `package.json`, Dockerfiles, or want a clean slate:

```bash
# Rebuild a specific service
docker compose build <service>

# Force rebuild without cache
docker compose build --no-cache <service>

# Rebuild and start in one command
docker compose up --build --profile dev <service>
```

Where `<service>` is one of: `node-dev`, `node-prod`, `rails-dev`, `rails-prod`.

> **Note:** In dev mode, source code is bind-mounted so file changes appear automatically. You only need to rebuild when dependencies (gems/packages) or Docker config change.

### Running Both Apps

```bash
docker compose --profile dev up node-dev rails-dev
```

## Local Development (Without Docker)

### Node.js

```bash
cd node
cp .env.example .env        # fill in values
npm install
npm run db:migrate
npm run dev                  # http://localhost:3013
```

### Rails

```bash
cd rails
cp .env.example .env         # fill in values
bundle install
bin/rails db:migrate
bin/rails server -p 3014     # http://localhost:3014
```

### Refreshing dev container dependencies

The dev profile keeps `node_modules` and gems in **named volumes** so they survive `docker compose down/up`. When you change `package.json` or `Gemfile`, the named volume still has the old deps — refresh it without rebuilding the image:

```bash
# Node
docker compose --profile dev run --rm node-dev npm install

# Rails
docker compose --profile dev run --rm --no-deps --entrypoint "" rails-dev bundle install
```

If a dep is deeply broken, nuke the volume and start over:

```bash
docker compose --profile dev down
docker volume rm maddiehq_node_modules    # or maddiehq_rails_bundle
docker compose --profile dev up          # repopulates from the image
```

### Resetting a dev password

Better Auth stores password hashes — there's no default admin account. To set a known password on any existing user (so you can log in for testing without going through the email reset flow):

```bash
docker compose --profile dev exec node-dev \
  node scripts/reset-password.mjs <email> <new-password>
```

The script uses Better Auth's own `hashPassword` function so the stored hash is guaranteed compatible. It also creates a credential account row if the user only had OAuth sign-ins. Dev/test only — never run against a production database.

## Rails Console

```bash
# Via Docker
docker compose --profile dev exec rails-dev bin/rails console

# Local
cd rails && bin/rails console
```

## Remote Dev (phone QA via Tailscale)

Access your local dev containers from your phone — or any tailnet device — anywhere in the world over **real HTTPS**. No public exposure, no port forwarding, no ngrok. Full Next.js dev mode: hot reload, error overlay, source maps. Uses [Tailscale](https://tailscale.com)'s WireGuard mesh; only devices on your tailnet can reach the apps.

### How it works

Each dev app runs alongside a **Caddy + Tailscale sidecar** (`ghcr.io/tailscale/caddy-tailscale:main`) that joins the tailnet as its own ephemeral hostname node, provisions a real TLS cert via Tailscale's ACME flow, and reverse-proxies HTTPS traffic to the app on `127.0.0.1`. The app container shares the sidecar's network namespace via `network_mode: service:caddy-*-dev`, so both the tailnet HTTPS URL and `localhost:<port>` hit the same `next dev` / `rails s` process. Sidecars are dev-only — prod uses plain port mappings.

### Why HTTPS (not plain HTTP)

Apple **HSTS-preloads the `tailscale.ts.net` zone**, which means iOS Safari refuses plain HTTP on any `*.ts.net` hostname, no exceptions. Chrome is fine with HTTP, Safari isn't. Real HTTPS via the Tailscale cert flow is mandatory for iPhone QA, which is the whole point of this setup. HTTPS also unlocks secure-context browser features (Web Speech, Service Workers, clipboard, etc.) that plain HTTP blocks.

### Framework gates

Two config gates have to be opened so Next.js and Better Auth accept non-localhost origins:

**`node/next.config.ts`** — `allowedDevOrigins` whitelists the hosts that can connect to Next dev's HMR WebSocket. Without this, Next rejects the upgrade handshake with `ERR_INVALID_HTTP_RESPONSE`, which silently poisons React hydration. Template ships with `*.ts.net` pre-allowed.

**`node/lib/auth.ts`** — Better Auth's `trustedOrigins` rejects sign-in POSTs from unknown origins as "Invalid email or password." The dev-mode logic already trusts `*.ts.net` AND localhost on the dev port, so both paths work.

### One-time setup

1. **Install Tailscale** on the Mac (`brew install --cask tailscale`) and on your phone. Sign into the same account on both.
2. **Get a Tailscale auth key** at https://login.tailscale.com/admin/settings/keys (make it reusable if you'll bring the stack up/down frequently).
3. **Add to `.env`**:
   ```
   TS_AUTHKEY=tskey-auth-...
   TS_HOSTNAME_NODE=maddiehq-node    # optional, this is the default
   TS_HOSTNAME_RAILS=maddiehq-rails  # optional, this is the default
   ```
4. **Bring up the dev profile**: `docker compose --profile dev up`

That's it. The sidecars will register as ephemeral nodes on your tailnet. From your phone:

| App | URL |
|-----|-----|
| Node  | `https://maddiehq-node.<your-tailnet>.ts.net` |
| Rails | `https://maddiehq-rails.<your-tailnet>.ts.net` |

`localhost:3013` / `localhost:3014` also still work on the Mac itself — both paths hit the same dev process.

### iOS DNS gotcha

If the tailnet hostname isn't resolving on your iPhone, open the Tailscale iOS app → profile avatar → Settings → toggle **"Use Tailscale DNS Settings"** on. Also check that **iCloud Private Relay** is off (Settings → Apple ID → iCloud → Private Relay) — it runs DNS through Apple's proxy and breaks tailnet resolution. Quit Safari fully (swipe away from app switcher) after toggling to clear stale cached DNS failures.

### Adding more projects

For any additional project, replicate the sidecar pattern from `docker-compose.yml`:

1. Add a `caddy-<service>-dev` sidecar (dev profile only) with `ghcr.io/tailscale/caddy-tailscale:main`
2. Create `tailscale/Caddyfile.<service>` — reverse-proxy `:443` (bound to `tailscale/app`) to `127.0.0.1:<app-port>`
3. Give the existing dev app service `network_mode: service:caddy-<service>-dev` and remove its `ports:` — the sidecar owns them
4. Add `TS_AUTHKEY`, `TS_HOSTNAME_<SERVICE>`, `DEV_PORT` to `.env.example`
5. For Next.js projects, copy the `allowedDevOrigins` block from `node/next.config.ts`
6. For Better Auth projects, copy the `trustedOrigins` logic from `node/lib/auth.ts`

**Caddyfile gotcha:** don't write `https://{env.TS_HOSTNAME}` as the site address — Caddy's site-address parser doesn't expand env placeholders. Bind `:443` to `tailscale/app` and let the cert manager fetch the FQDN at runtime. See `tailscale/Caddyfile.node` for the exact shape.

### OAuth gotcha

OAuth providers (Google, GitHub, Microsoft) need the tailnet URL added to their allowed redirect URI lists. Add `https://maddiehq-node.<your-tailnet>.ts.net/api/auth/callback/<provider>` to each provider's console. Note: **HTTPS**, not HTTP, and no port — the sidecar terminates TLS on `:443`.

## Environment Variables

Both apps use the same env vars where applicable:

| Variable | Node | Rails | Description |
|----------|------|-------|-------------|
| `APP_NAME` | Yes | Yes | Display name (default: MaddieHQ) |
| `APP_URL` | Yes | Yes | Public URL |
| `BETTER_AUTH_SECRET` | Yes | — | Auth secret (Node only) |
| `SECRET_KEY_BASE` | — | Yes | Rails secret key |
| `RESEND_API_KEY` | Yes | Yes | Transactional email |
| `STRIPE_SECRET_KEY` | Yes | Yes | Stripe payments |
| `STRIPE_PRICE_ID` | Yes | Yes | Subscription price |
| `STRIPE_WEBHOOK_SECRET` | Yes | Yes | Webhook verification |
| `GOOGLE_CLIENT_ID` | Yes | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Yes | Google OAuth |
| `GITHUB_CLIENT_ID` | Yes | Yes | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Yes | Yes | GitHub OAuth |

## Project Structure

```
maddiehq/
├── node/                  # Next.js app (port 3013)
│   ├── app/               # App Router pages + API routes
│   ├── components/        # React components
│   ├── lib/               # Auth, DB, email, Stripe, errors
│   └── content/           # Blog posts (MDX)
├── rails/                 # Rails app (port 3014)
│   ├── app/               # Controllers, models, views, mailers
│   ├── lib/               # Errors, rate limiter, helpers
│   └── content/           # Blog posts (Markdown)
├── docker-compose.yml     # Shared Docker Compose config
├── CLAUDE.md              # AI assistant instructions
└── AGENTS.md              # Feature documentation
```

## Features

Both implementations include:

- **Auth** — Email/password, OAuth (Google, GitHub, Apple, Facebook, Microsoft), TOTP 2FA, email verification, password reset
- **Payments** — Stripe checkout, billing portal, webhooks, subscription lifecycle
- **Admin Panel** — Dashboard, user management, analytics, audit logs, DB browser, blog editor, newsletter subscribers
- **Email** — Welcome, verification, password reset, subscription confirmation via Resend
- **Blog** — Markdown content with frontmatter, RSS feed, sitemap
- **Settings** — Account info, appearance (dark mode), billing, security (MFA), data export, account deletion
- **Frontend** — Landing page, auth pages, dashboard, legal pages, cookie consent

## MaddieHQ CLI

A Go binary at `cli/` for non-interactive scaffolding. It's what AI agents and CI pipelines use to create new projects from this template — same flow as the `/maddiehq-create` Claude Code skill but driven by flags instead of an interview.

### Install

```bash
cd ~/Code/maddiehq/cli
go build -o ~/go/bin/maddiehq .
```

If `~/go/bin` isn't on your PATH:

```bash
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
maddiehq --help
which maddiehq                # /Users/<you>/go/bin/maddiehq
```

### Use

```bash
# Interactive TUI (charmbracelet/huh prompts)
maddiehq create

# Non-interactive — every option as a flag
maddiehq create \
  --name MyApp \
  --description "What it does" \
  --stack node \
  --database sqlite \
  --deploy-target cloudflare \
  --features auth,payments,blog \
  --dev-port 3000 \
  --prod-port 3006

# Other useful subcommands
maddiehq features        # list available features with descriptions
maddiehq stacks          # list supported stacks
maddiehq version
```

The `--deploy-target` choice (`cloudflare` / `vercel` / `railway` / `other`) drives the post-create Next-Steps output and customizes `wrangler.toml` for Cloudflare deploys. The codebase supports all four targets simultaneously — choice is at runtime, not build-time.

### Rebuilding after pulling updates

The CLI is checked into this repo at `cli/`. After `git pull`, rebuild:

```bash
cd ~/Code/maddiehq/cli && go build -o ~/go/bin/maddiehq .
```

Or alias it in your shell:

```bash
maddiehq-rebuild() { (cd ~/Code/maddiehq/cli && go build -o ~/go/bin/maddiehq .); }
```

---

## Cloudflare Workers Deploy (Node.js stack)

The Node.js app deploys to Cloudflare Workers + D1 via `@opennextjs/cloudflare`. The full migration is tracked in [#275](https://github.com/marknutter/maddiehq/issues/275).

### Every deploy (the routine flow)

From `node/`:

```bash
npm run build:cf   # opennextjs-cloudflare build
npm run deploy:cf  # opennextjs-cloudflare deploy
```

That's the whole routine deploy — about 20 seconds end-to-end. The deploy log shows which bindings get wired:

```
env.DB (maddiehq-db)            D1 Database
env.STORAGE (maddiehq-storage)  R2 Bucket
env.ASSETS                     Assets
env.DATABASE_DRIVER ("d1")     Environment Variable
```

Result lives at `https://<worker-name>.<your-subdomain>.workers.dev`. Bindings wire automatically via `@opennextjs/cloudflare`'s `getCloudflareContext()` — no `instrumentation.ts` or wrapper override needed.

### When to do what

| Change | What you run |
|---|---|
| Code changes only | `npm run build:cf && npm run deploy:cf` |
| Added a new migration in `node/migrations/` | `npx wrangler d1 migrations apply maddiehq-db --remote`, then deploy |
| Added a new secret (private env var) | `npx wrangler secret put VAR_NAME` (no redeploy needed; secrets hot-reload) |
| Added a non-secret env var | Edit `wrangler.toml [vars]` block, then deploy |
| Added a new R2/D1/KV binding | Edit `wrangler.toml`, deploy. New bindings show up in `getCloudflareContext().env` automatically |
| Promoting a user to admin | `npx wrangler d1 execute maddiehq-db --remote --command "UPDATE user SET isAdmin = 1 WHERE email = 'you@example.com'"` |

### Sanity checks after deploy

```bash
# Health endpoint should return ok:true on all three
curl -sS https://<your-worker>.workers.dev/api/health
# Expected: {"ok":true,"db":true,"auth":true,"timestamp":"..."}

# Tail live worker logs to debug runtime errors
npx wrangler tail --format=pretty
```

### One-time setup (already done for `maddiehq`)

You don't need to redo this for the existing `maddiehq` deployment, but for spinning up a tenant clone:

1. **Wrangler auth** (browser-based OAuth, persists in keychain):
   ```bash
   npx wrangler login
   ```

2. **Create the D1 database.** From `node/`:
   ```bash
   npx wrangler d1 create maddiehq-db
   ```
   Copy the printed `database_id` into `wrangler.toml` under the `[[d1_databases]]` block.

3. **Enable R2 in the CF dashboard** (one-time, free; no CLI for this) → https://dash.cloudflare.com/&lt;account&gt;/r2/overview → click **Enable R2**.

4. **Create the R2 bucket:**
   ```bash
   npx wrangler r2 bucket create maddiehq-storage
   ```
   `wrangler.toml` already declares `[[r2_buckets]] binding = "STORAGE"` — `lib/storage.ts` picks it up automatically. See "Storage backends" below for the alternative S3-compatible path.

5. **Set runtime secrets** (Workers won't read your local `.env`). Pipe values rather than echoing — wrangler also supports interactive prompts:
   ```bash
   openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET
   npx wrangler secret put STRIPE_SECRET_KEY    # paste at prompt
   npx wrangler secret put RESEND_API_KEY       # paste at prompt
   # …and any other secrets required by features you've enabled
   ```

6. **Apply schema migrations to the remote D1.** All `node/migrations/*.sql` files are applied in lexical order; `000_better_auth_init.sql` creates the Better Auth tables:
   ```bash
   npx wrangler d1 migrations apply maddiehq-db --remote
   ```

7. **First deploy:**
   ```bash
   npm run build:cf && npm run deploy:cf
   ```

### Storage backends

`lib/storage.ts` selects a backend at request time. Selection priority:

| Condition | Backend | Notes |
| --- | --- | --- |
| On Workers AND `[[r2_buckets]]` binding declared | **R2 binding** | Recommended for Cloudflare deploys. No API tokens, free intra-Worker R2 ops, faster than S3 round-trip. |
| `S3_ENDPOINT` + `S3_BUCKET` + `S3_ACCESS_KEY` + `S3_SECRET_KEY` all set | **S3-compatible** | Works on any host. Use for MaddieHQ on Vercel/Railway/Fly with R2-via-S3-API or actual AWS S3. |
| Local dev (no envs set, not on Workers) | **Local filesystem** | `./data/uploads/`. Crashes on Workers (no fs). |
| On Workers with neither configured | — | Throws a clear error at first storage call. |

To use **R2 via the S3 API** (e.g. when MaddieHQ is on Vercel and you still want R2 storage):

```bash
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=maddiehq-storage
S3_ACCESS_KEY=<r2-api-token-key>
S3_SECRET_KEY=<r2-api-token-secret>
S3_REGION=auto
```

Generate R2 API tokens at https://dash.cloudflare.com/?to=/:account/r2/api-tokens.

### Local Workers preview

Run the Workers runtime locally to chase Workers-specific bugs that don't reproduce in `next dev`:

```bash
npm run build:cf
npm run preview:cf    # wrangler dev — runs against a local D1 emulator at 127.0.0.1:8787
```

For local D1 to have schema, apply migrations against the local emulator too:

```bash
npx wrangler d1 migrations apply maddiehq-db --local
```

### Where each piece lives

- `node/wrangler.toml` — bindings, vars, compatibility flags
- `node/open-next.config.ts` — OpenNext adapter config
- `node/lib/db.ts` — D1 binding resolver (`getCloudflareContext().env.DB`)
- `node/lib/storage.ts` — R2 binding resolver (`getCloudflareContext().env.STORAGE`)
- `node/migrations/*.sql` — schema migrations (applied via `wrangler d1 migrations apply`)
- `node/content/docs/dev/cloudflare-workers-compat.mdx` — full Workers compatibility audit

### Why the SQLite/D1 split

The same codebase deploys to both — `lib/db.ts` selects the driver from `DATABASE_DRIVER` (D1) or `DATABASE_URL` (PG), defaulting to local SQLite. Drizzle ORM is the unified query layer; raw SQL paths (`bootstrapAuthSchema`, the migration runner) only run on the SQLite path. See `content/docs/dev/cloudflare-workers-compat.mdx` for the full Workers compatibility audit.
