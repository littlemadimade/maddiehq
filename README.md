# MaddieHQ

Maddie's HQ — a Next.js app deployed on Cloudflare Workers + D1 + R2.

Production: <https://maddiehq.oqodo.com>
Dev (tailnet): <https://maddiehq.gate-cardassian.ts.net>
Dev (local):   <http://localhost:3005>

## Quick start

```bash
cd node
cp .env.example .env.local      # fill in BETTER_AUTH_SECRET, etc.
npm install
npm run db:migrate              # local SQLite at node/data/maddiehq.db
npm run dev                     # http://localhost:3005
```

## Docker (local dev)

Single dev mode — Caddy + Tailscale sidecar fronts Next dev on the tailnet so the iPhone can hit a real HTTPS URL.

```bash
docker compose build
docker compose up -d
docker compose logs -f
docker compose down
```

The sidecar joins the tailnet as `${TS_HOSTNAME}` (default `maddiehq`) and serves HTTPS at `https://maddiehq.<your-tailnet>.ts.net`. Same `next dev` process is reachable via `localhost:3005` on the Mac.

### Refreshing dev container dependencies

After a `package.json` change:

```bash
docker compose run --rm app-dev npm install
```

If `node_modules` gets fully wedged:

```bash
docker compose down
docker volume rm maddiehq_node_modules
docker compose up
```

### Resetting a dev password

Better Auth stores password hashes — there's no default admin account. To set a known password on any user:

```bash
docker compose exec app-dev \
  node scripts/reset-password.mjs <email> <new-password>
```

The script uses Better Auth's own `hashPassword` so the stored hash is compatible. Dev only — never run against production.

## Remote dev (phone QA via Tailscale)

Access the dev container from your phone (or any tailnet device) over real HTTPS. No public exposure, no port forwarding, no ngrok. Apple HSTS-preloads `*.ts.net`, so plain HTTP is rejected by iOS Safari — the Tailscale ACME cert is the only path that works.

### One-time setup

1. Install [Tailscale](https://tailscale.com) on the Mac and on your phone; sign in to the same account.
2. Get a reusable auth key at <https://login.tailscale.com/admin/settings/keys>.
3. Create `.env` at the project root:
   ```
   TS_AUTHKEY=tskey-auth-...
   TS_HOSTNAME=maddiehq
   DEV_PORT=3005
   APP_URL=https://maddiehq.gate-cardassian.ts.net
   ```
4. `docker compose up -d`

The sidecar registers as an ephemeral tailnet node, provisions a real TLS cert, and reverse-proxies `:443` → Next dev on `127.0.0.1:3000`.

### iOS DNS gotcha

If the tailnet hostname doesn't resolve on iPhone: open the Tailscale iOS app → profile avatar → Settings → toggle **Use Tailscale DNS Settings** on. Also disable iCloud Private Relay (Settings → Apple ID → iCloud → Private Relay) — it routes DNS through Apple's proxy and breaks tailnet resolution. Quit Safari fully (swipe away in app switcher) after toggling to drop stale cached failures.

### OAuth callback URLs

OAuth providers (Google, GitHub, Microsoft) need both URLs allow-listed:

- `https://maddiehq.oqodo.com/api/auth/callback/<provider>` — production
- `https://maddiehq.gate-cardassian.ts.net/api/auth/callback/<provider>` — tailnet dev

Set up via `/configure-sso` — it knows about both.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | ≥32 chars; `openssl rand -base64 32`. Set on CF via `wrangler secret put`. |
| `BETTER_AUTH_URL` | Yes | Public URL of the app (Better Auth uses for callbacks). |
| `APP_URL` | Yes | Same as above; used in emails and Stripe redirects. |
| `APP_NAME` | No | Display name; defaults to `MaddieHQ`. |
| `DATABASE_PATH` | Local dev only | SQLite file path; defaults to `./data/maddiehq.db`. Ignored on CF (D1 binding takes over). |
| `RESEND_API_KEY` | If using email | Transactional email via Resend. |
| `STRIPE_SECRET_KEY` | If using payments | Stripe API key. |
| `STRIPE_PRICE_ID` | If using payments | Subscription price ID. |
| `STRIPE_WEBHOOK_SECRET` | If using payments | Webhook signature verification. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If using Google SSO | OAuth credentials. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | If using GitHub SSO | OAuth credentials. |
| `ANTHROPIC_API_KEY` | If using AI chat | Claude API for the chat surface. |
| `ELEVENLABS_API_KEY` | If using voice | ElevenLabs TTS (optional — chat falls back to text). |

Local: put these in `node/.env.local` (gitignored). Production: `npx wrangler secret put VAR_NAME`.

## Project structure

```
maddiehq/
├── node/                  # Next.js app (the only stack)
│   ├── app/               # App Router pages + API routes
│   ├── components/        # React components
│   ├── lib/               # Auth, DB, email, Stripe, errors
│   ├── content/           # Blog/docs (MDX)
│   ├── migrations/        # SQLite/D1 schema migrations
│   └── wrangler.toml      # Cloudflare Workers config
├── tailscale/Caddyfile    # Caddy + tsnet config for the dev sidecar
├── docker-compose.yml     # Local dev (single profile-less stack)
├── legacy/                # Pre-AppSeed maddiehq, archived
├── CLAUDE.md              # AI assistant instructions
└── AGENTS.md              # Feature documentation
```

## Cloudflare Workers deploy

The Node app deploys to Cloudflare Workers + D1 + R2 via `@opennextjs/cloudflare`.

### Routine deploy

```bash
cd node
npm run build:cf
npm run deploy:cf
```

~20s end-to-end. Bindings (`DB`, `STORAGE`, `ASSETS`) wire automatically via `getCloudflareContext()` — no `instrumentation.ts` needed.

### When to do what

| Change | Run |
|---|---|
| Code only | `npm run build:cf && npm run deploy:cf` |
| New SQL migration | `npx wrangler d1 migrations apply maddiehq-db --remote`, then deploy |
| New secret | `npx wrangler secret put VAR_NAME` (no redeploy needed; secrets hot-reload) |
| New non-secret env var | Edit `wrangler.toml [vars]`, then deploy |
| New D1/R2/KV binding | Edit `wrangler.toml`, deploy |
| Promote a user to admin | `npx wrangler d1 execute maddiehq-db --remote --command "UPDATE user SET isAdmin = 1 WHERE email = 'you@example.com'"` |

### Sanity checks

```bash
curl -sS https://maddiehq.oqodo.com/api/health
# Expected: {"ok":true,"db":true,"auth":true,"timestamp":"..."}

npx wrangler tail --format=pretty
```

### Local Workers preview

To repro Workers-specific bugs that don't surface in `next dev`:

```bash
npm run build:cf
npm run preview:cf      # local D1 emulator on 127.0.0.1:8787
npx wrangler d1 migrations apply maddiehq-db --local   # one-time
```

## Where each piece lives

- `node/wrangler.toml` — bindings, vars, compatibility flags
- `node/open-next.config.ts` — OpenNext adapter config
- `node/lib/db.ts` — D1 / SQLite driver resolver
- `node/lib/storage.ts` — R2 / S3 / local-fs storage resolver
- `node/migrations/*.sql` — schema migrations (lexical order; `000_better_auth_init.sql` creates auth tables)
- `node/content/docs/dev/cloudflare-workers-compat.mdx` — Workers compatibility audit
