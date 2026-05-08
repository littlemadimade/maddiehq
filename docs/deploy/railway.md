# Deploy AppSeed to Railway

Railway gives you auto-deploy from GitHub, persistent volumes for SQLite, HTTPS, and custom domains out of the box. Expect ~$5/month on the Hobby plan.

---

## Prerequisites

1. A [Railway](https://railway.app) account (GitHub sign-in recommended)
2. Railway CLI installed: `npm install -g @railway/cli`
3. Your AppSeed repo pushed to GitHub

---

## 1. Create the Railway Project

```bash
railway login
railway init          # choose "Create new project"
railway link          # link to the GitHub repo
```

In the Railway dashboard, go to **Settings > Source** and connect your GitHub repo with the `main` branch for auto-deploy.

---

## 2. Configure the Build

The repo includes a `deploy/railway/railway.toml` that tells Railway to use the Node.js Dockerfile and health-check at `/api/health`:

```toml
[build]
dockerfilePath = "node/Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Railway reads this file automatically from the repo root-relative path `deploy/railway/railway.toml`. If Railway does not detect it, copy it to the repo root:

```bash
cp deploy/railway/railway.toml railway.toml
```

---

## 3. Add a Persistent Volume

SQLite needs a persistent filesystem. Without a volume, your database is wiped on every deploy.

1. Open your service in the Railway dashboard
2. Go to **Volumes > Add Volume**
3. Set the mount path to `/data`
4. Choose 1 GB (plenty for most apps; scale later if needed)

The volume must exist **before** the first deploy that writes to `/data`.

---

## 4. Set Environment Variables

### Required

```bash
railway variables set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
railway variables set BETTER_AUTH_URL="https://<your-app>.up.railway.app"
railway variables set APP_URL="https://<your-app>.up.railway.app"
railway variables set APP_NAME="YourApp"
railway variables set DATABASE_PATH="/data/appseed.db"
```

### OAuth (optional)

```bash
railway variables set GOOGLE_CLIENT_ID="..."
railway variables set GOOGLE_CLIENT_SECRET="..."
railway variables set GITHUB_CLIENT_ID="..."
railway variables set GITHUB_CLIENT_SECRET="..."
```

Add callback URLs to each OAuth provider:

```
https://<your-app>.up.railway.app/api/auth/callback/google
https://<your-app>.up.railway.app/api/auth/callback/github
```

### Email (optional)

```bash
railway variables set RESEND_API_KEY="re_..."
```

### Stripe (optional)

```bash
railway variables set STRIPE_SECRET_KEY="sk_test_..."
railway variables set STRIPE_PRICE_ID="price_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
```

You can also set variables through the dashboard under **Variables > New Variable**.

---

## 5. Deploy

Railway auto-deploys on every push to `main`:

```bash
git push origin main
```

Or trigger a manual deploy:

```bash
railway up
```

Or force a redeploy:

```bash
railway redeploy --yes
```

Check deployment status:

```bash
railway logs
```

---

## 6. Litestream Backups (Recommended)

Litestream continuously replicates your SQLite database to S3-compatible storage. If Railway ever loses your volume, you can restore in seconds.

### Setup

1. Create an S3 bucket (AWS S3 or Cloudflare R2 -- R2 has no egress fees).
2. Create access credentials with read/write to the bucket.
3. Set the environment variables:

```bash
railway variables set LITESTREAM_ACCESS_KEY_ID="..."
railway variables set LITESTREAM_SECRET_ACCESS_KEY="..."
railway variables set LITESTREAM_REPLICA_BUCKET="my-app-backups"
railway variables set LITESTREAM_REPLICA_PATH="db"
railway variables set LITESTREAM_REPLICA_REGION="us-east-1"
# For R2, also set the endpoint:
railway variables set LITESTREAM_REPLICA_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
```

4. The `docker-compose.yml` already includes a `litestream` sidecar. For Railway, you have two options:
   - **Option A:** Run Litestream as a separate Railway service sharing the same volume.
   - **Option B:** Modify your Dockerfile entrypoint to run Litestream as a wrapper process (see [Litestream as a supervisor](https://litestream.io/guides/docker/)).

### Restore

```bash
bash scripts/litestream-restore.sh /data/appseed.db
```

---

## 7. Custom Domain

1. In the Railway dashboard, go to **Settings > Domains > Add Domain**
2. Enter your domain (e.g., `app.example.com`)
3. Add the DNS records Railway provides (CNAME or A record)
4. Railway auto-provisions an SSL certificate
5. Update your env vars to match the new domain:

```bash
railway variables set BETTER_AUTH_URL="https://app.example.com"
railway variables set APP_URL="https://app.example.com"
```

6. Update OAuth callback URLs to use the custom domain.

---

## Rails Variant

To deploy the Rails stack instead of Node.js:

1. Change the Dockerfile path in `railway.toml`:

```toml
[build]
dockerfilePath = "rails/Dockerfile"
```

2. Set Rails-specific env vars:

```bash
railway variables set SECRET_KEY_BASE="$(bin/rails secret)"
railway variables set DATABASE_PATH="/data/appseed-rails.db"
railway variables set RAILS_ENV="production"
railway variables set APP_URL="https://<your-app>.up.railway.app"
railway variables set APP_NAME="YourApp"
```

3. The Rails Dockerfile runs `bin/rails db:migrate` automatically on startup.

4. The health check endpoint is the same: `/api/health`.

---

## Cost

Railway Hobby plan: **$5/month** (includes $5 of usage credit).

This covers a single service running 24/7 with 512 MB RAM, 1 GB disk, and ~1 vCPU. More than enough for most AppSeed deployments. Usage beyond the credit is billed per resource-hour.

---

## Troubleshooting

### "SQLITE_CANTOPEN"
- Verify the volume is mounted at `/data`
- Confirm `DATABASE_PATH=/data/appseed.db` is set
- Check file permissions (the Dockerfile creates `/data` owned by the app user)

### "MissingSecret" or auth errors
- `BETTER_AUTH_SECRET` must be at least 32 characters
- `BETTER_AUTH_URL` must match your actual public URL (including `https://`)

### Health check fails
- Visit `https://<your-app>.up.railway.app/api/health` directly
- If `auth: false`, migrations may not have run -- check deploy logs

### Stale content after deploy
- Cloudflare edge cache can hold old pages for 5-10 minutes
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

### OAuth "redirect URI mismatch"
- Callback URLs must match exactly, no trailing slash:
  `https://<your-app>.up.railway.app/api/auth/callback/google`
