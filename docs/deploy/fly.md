# Deploy AppSeed to Fly.io

Fly.io runs Docker containers on lightweight VMs with persistent volumes -- a good fit for SQLite-backed apps like AppSeed. Estimated cost: **~$3-5/month** (shared-cpu-1x, 512 MB RAM, 1 GB volume).

---

## Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed and authenticated (`fly auth login`)
- Docker (used locally only for `fly deploy`)

---

## 1. Create the Fly app

```bash
fly apps create appseed        # pick any unique name
```

Update `deploy/fly/fly.toml` — replace `app = "appseed"` with your app name and set `primary_region` to your preferred region (default: `iad`).

## 2. Create a persistent volume

SQLite data lives on a Fly volume. Create one in the **same region** as your app:

```bash
fly volumes create appseed_data --region iad --size 1   # 1 GB, expand later if needed
```

> **Important:** Fly volumes are tied to a single machine. Never scale beyond **1 machine** — SQLite does not support multiple concurrent writers.

## 3. Copy the Fly config into `node/`

```bash
cp deploy/fly/fly.toml node/fly.toml
```

Fly deploys from the directory containing `fly.toml`, which needs to be alongside the `Dockerfile`.

## 4. Set secrets

Secrets are injected as environment variables at runtime. Set every required value:

```bash
cd node

# Required
fly secrets set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
fly secrets set BETTER_AUTH_URL="https://appseed.fly.dev"
fly secrets set APP_URL="https://appseed.fly.dev"

# Optional — display name
fly secrets set APP_NAME="AppSeed"

# Email (Resend)
fly secrets set RESEND_API_KEY="re_..."

# OAuth (Google)
fly secrets set GOOGLE_CLIENT_ID="..."
fly secrets set GOOGLE_CLIENT_SECRET="..."

# OAuth (GitHub)
fly secrets set GITHUB_CLIENT_ID="..."
fly secrets set GITHUB_CLIENT_SECRET="..."

# Stripe
fly secrets set STRIPE_SECRET_KEY="sk_..."
fly secrets set STRIPE_PRICE_ID="price_..."
fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 5. Deploy

```bash
cd node
fly deploy
```

First deploy takes 2-3 minutes. Subsequent deploys are faster thanks to Docker layer caching.

Verify:

```bash
fly status
fly logs
```

Visit `https://appseed.fly.dev` (or your custom domain).

---

## Litestream backup (recommended)

SQLite on a single volume has no built-in redundancy. [Litestream](https://litestream.io) continuously replicates WAL frames to S3-compatible storage. AppSeed ships with a `litestream.yml` config already.

### Setup

1. **Create an S3 bucket** (AWS S3, Tigris, Backblaze B2, or any S3-compatible provider).

2. **Set Litestream secrets:**

```bash
fly secrets set \
  LITESTREAM_ACCESS_KEY_ID="..." \
  LITESTREAM_SECRET_ACCESS_KEY="..." \
  LITESTREAM_REPLICA_BUCKET="my-backups" \
  LITESTREAM_REPLICA_PATH="appseed-db" \
  LITESTREAM_REPLICA_ENDPOINT="https://s3.us-east-1.amazonaws.com" \
  LITESTREAM_REPLICA_REGION="us-east-1"
```

3. **Modify the Dockerfile CMD** to use Litestream's `-exec` flag, which restores the DB on startup and then launches your app as a child process:

```dockerfile
# Install Litestream in the runner stage
COPY --from=litestream/litestream:latest /usr/local/bin/litestream /usr/local/bin/litestream
COPY litestream.yml /etc/litestream.yml

CMD ["litestream", "replicate", "-exec", "node_modules/.bin/next start -p 3013"]
```

The `-exec` flag is the key: Litestream first restores the database from the replica (if the volume is empty), then starts Next.js, and continuously replicates changes in the background. If the machine restarts, the DB is automatically restored from the latest snapshot.

---

## Custom domain

```bash
fly certs add yourdomain.com
```

Fly provisions a Let's Encrypt certificate automatically. Point your DNS:
- **CNAME** `yourdomain.com` -> `appseed.fly.dev`

Then update your secrets:

```bash
fly secrets set \
  APP_URL="https://yourdomain.com" \
  BETTER_AUTH_URL="https://yourdomain.com"
```

---

## SSH and debugging

```bash
fly ssh console             # shell into the running machine
fly logs                    # stream logs
fly status                  # machine health
fly volumes list            # check volume status
```

Inspect the database directly:

```bash
fly ssh console -C "ls -la /data/"
fly ssh console -C "sqlite3 /data/appseed.db '.tables'"
```

---

## Single-machine constraint

SQLite requires a single writer. AppSeed on Fly.io **must** run exactly one machine:

- `auto_stop_machines = false` in `fly.toml` ensures the machine stays running (a stopped machine detaches its volume and halts Litestream replication).
- `min_machines_running = 1` ensures the app is always available.
- Never run `fly scale count 2` -- this will cause database corruption.

If you need horizontal scaling, migrate to PostgreSQL first (see `docs/pg-migration/`).

---

## Cost breakdown

| Resource | Monthly cost |
|---|---|
| shared-cpu-1x, 512 MB | ~$3.19 |
| 1 GB volume | ~$0.15 |
| Outbound transfer (first 100 GB free) | $0.00 |
| **Total** | **~$3-5/mo** |

Prices as of early 2026. Check [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing/) for current rates.
