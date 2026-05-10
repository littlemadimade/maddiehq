# Deploying AppSeed on Cloudflare

Three approaches, from most flexible to most constrained.

| Approach | What you need | Cost | Docker? | SQLite? |
|----------|--------------|------|---------|---------|
| **A. Cloudflare VPS** | Cloudflare cloud VM | ~$5/mo | Yes | Yes |
| **B. Cloudflare Tunnel** | Any machine (home server, office PC, old laptop) | Free | Yes | Yes |
| **C. Workers** | Nothing (serverless) | Free tier available | No | No (needs D1) |

**Recommendation:** Use **Approach B** (Tunnel) for most deployments. It is free, keeps your existing Docker setup, and exposes zero ports to the internet.

---

## Approach A: Cloudflare VPS (Full Docker Support)

Cloudflare offers cloud VMs that run Docker natively. This is the simplest path if you want a traditional VPS without managing your own hardware.

### 1. Provision a VM

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com).
2. Navigate to **Compute (Workers)** > **VMs** (or search "Virtual Machines").
3. Create a new VM:
   - **Image:** Ubuntu 22.04 or Debian 12
   - **Size:** 1 vCPU / 1 GB RAM is sufficient for AppSeed
   - **Region:** Choose closest to your users
4. Note the public IP address.

### 2. Install Docker

SSH into the VM and install Docker:

```bash
ssh root@<vm-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 3. Clone and configure

```bash
git clone https://github.com/your-org/your-app.git
cd your-app

# Create environment file
cat > .env << 'EOF'
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://yourapp.com
APP_URL=https://yourapp.com
APP_NAME=YourApp
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
EOF
```

Edit `.env` with your actual values.

### 4. Start the production stack

```bash
DOCKER_BUILDKIT=0 docker compose --profile prod up -d node-prod
```

The app is now running on port 3013 inside the VM.

### 5. Set up DNS and SSL

Option 1 — **Cloudflare Proxy (recommended):**

1. In the Cloudflare dashboard, go to **DNS** for your domain.
2. Add an **A record**: `yourapp` -> `<vm-ip>`, Proxy enabled (orange cloud).
3. Cloudflare handles SSL termination automatically.

Option 2 — **Caddy on the VM:**

```bash
# Install Caddy
sudo apt install -y caddy

# Configure reverse proxy
cat > /etc/caddy/Caddyfile << 'EOF'
yourapp.com {
    reverse_proxy localhost:3013
}
EOF

sudo systemctl restart caddy
```

### 6. Enable Litestream backups (recommended)

See the [R2 backup section](#r2-for-litestream-backups-zero-egress) below.

```bash
docker compose --profile prod up -d node-prod litestream
```

---

## Approach B: Cloudflare Tunnel (Any Machine, Zero Exposed Ports)

Cloudflare Tunnel (`cloudflared`) creates an outbound-only connection from your machine to Cloudflare's edge. No ports need to be opened, no firewall rules, no static IP required. Traffic flows: `User -> Cloudflare Edge -> Tunnel -> Your Machine -> Docker Container`.

This is the approach used by the existing AppSeed local deployment (Mac mini + Caddy).

### Prerequisites

- Any machine that can run Docker (Mac, Linux, even a Raspberry Pi)
- A domain on Cloudflare (free plan is fine)
- `cloudflared` CLI installed

### 1. Install cloudflared

**macOS:**
```bash
brew install cloudflared
```

**Linux (Debian/Ubuntu):**
```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflare-d $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare.list
sudo apt-get update && sudo apt-get install -y cloudflared
```

**Docker (alternative):**
```bash
docker pull cloudflare/cloudflared:latest
```

### 2. Authenticate

```bash
cloudflared tunnel login
```

This opens a browser to authorize `cloudflared` with your Cloudflare account. A certificate is saved to `~/.cloudflared/cert.pem`.

### 3. Create a tunnel

```bash
cloudflared tunnel create my-app-tunnel
```

This generates a tunnel ID and credentials file at `~/.cloudflared/<tunnel-id>.json`. Note the tunnel ID.

### 4. Configure the tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /home/you/.cloudflared/<tunnel-id>.json

ingress:
  # Your app
  - hostname: yourapp.com
    service: http://localhost:3013

  # Health check (optional)
  - hostname: yourapp.com
    path: /api/health
    service: http://localhost:3013

  # Catch-all (required by cloudflared)
  - service: http_status:404
```

**Multiple apps on one tunnel:**

```yaml
ingress:
  - hostname: app1.yourdomain.com
    service: http://localhost:3013
  - hostname: app2.yourdomain.com
    service: http://localhost:3014
  - service: http_status:404
```

### 5. Route DNS

```bash
cloudflared tunnel route dns my-app-tunnel yourapp.com
```

This creates a CNAME record pointing `yourapp.com` to `<tunnel-id>.cfargotunnel.com`. Cloudflare handles SSL automatically.

### 6. Start the app and the tunnel

```bash
# Start AppSeed
cd /path/to/your-app
DOCKER_BUILDKIT=0 docker compose --profile prod up -d node-prod

# Start the tunnel
cloudflared tunnel run my-app-tunnel
```

### 7. Run the tunnel as a system service

**Linux (systemd):**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**macOS (launchd):**
```bash
sudo cloudflared service install
# Starts automatically on boot
```

**Docker Compose (add to your docker-compose.yml):**

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run my-app-tunnel
    volumes:
      - ~/.cloudflared:/etc/cloudflared
    restart: unless-stopped
    depends_on:
      - node-prod
```

### 8. Verify

```bash
# Check tunnel status
cloudflared tunnel info my-app-tunnel

# Hit the health endpoint
curl https://yourapp.com/api/health
```

Expected response:
```json
{"ok": true, "db": true, "auth": true, "timestamp": "..."}
```

### Using Caddy as a local reverse proxy (optional)

If you run multiple apps behind one tunnel, Caddy can handle local routing:

```
Cloudflare Tunnel -> localhost:8080 (Caddy) -> localhost:3013 (app1)
                                              -> localhost:3014 (app2)
```

Caddyfile:
```
:8080 {
    @app1 host yourapp1.com
    handle @app1 {
        reverse_proxy localhost:3013
    }

    @app2 host yourapp2.com
    handle @app2 {
        reverse_proxy localhost:3014
    }
}
```

Tunnel config points everything at `http://localhost:8080`, and Caddy routes by hostname.

---

## Approach C: Cloudflare Workers (Not Viable for AppSeed)

Cloudflare Workers are serverless functions running on Cloudflare's edge network. They are fast and globally distributed, but **not compatible with AppSeed** due to fundamental runtime constraints:

| Requirement | AppSeed needs | Workers provides |
|-------------|--------------|------------------|
| Database | `better-sqlite3` (native C module) | D1 (SQL-over-HTTP, different API) |
| Runtime | Node.js with native modules | V8 isolates (no native modules) |
| Filesystem | SQLite file on disk | No filesystem |
| Framework | Next.js with `nodejs` runtime | Limited Next.js support via `@cloudflare/next-on-pages` |
| Auth | Better Auth (requires Node.js) | Would need full rewrite |

**What would be required to make it work:**

1. Replace `better-sqlite3` with Cloudflare D1 (completely different query API)
2. Replace Better Auth with a Workers-compatible auth solution
3. Rewrite all `export const runtime = "nodejs"` routes to use the edge runtime
4. Replace Litestream with D1's built-in replication
5. Replace any Node.js-specific APIs (crypto, fs, etc.)

This is effectively a full rewrite. If you need serverless Cloudflare deployment, consider starting from a Workers-native template instead.

**If you only need static hosting:** Cloudflare Pages can host the Next.js frontend with `output: 'export'`, but you lose all server-side functionality (API routes, SSR, auth).

---

## R2 for Litestream Backups (Zero Egress)

Cloudflare R2 is an S3-compatible object store with **zero egress fees**, making it ideal for Litestream database backups regardless of which deployment approach you use.

### 1. Create an R2 bucket

1. In the Cloudflare dashboard, go to **R2 Object Storage**.
2. Click **Create bucket**.
3. Name it (e.g., `myapp-backups`).
4. Choose **Automatic** location (or pick a specific region).

### 2. Create API credentials

1. Go to **R2** > **Manage R2 API Tokens**.
2. Click **Create API token**.
3. Permissions: **Object Read & Write**.
4. Scope: limit to your backup bucket.
5. Save the **Access Key ID** and **Secret Access Key**.

### 3. Find your account ID

Your R2 endpoint follows this pattern:
```
https://<account-id>.r2.cloudflarestorage.com
```

Find your account ID in the Cloudflare dashboard URL or under **R2** > **Overview**.

### 4. Configure environment variables

Add these to your `.env` or `docker-compose.yml`:

```bash
LITESTREAM_ACCESS_KEY_ID=<r2-access-key-id>
LITESTREAM_SECRET_ACCESS_KEY=<r2-secret-access-key>
LITESTREAM_REPLICA_BUCKET=myapp-backups
LITESTREAM_REPLICA_PATH=db
LITESTREAM_REPLICA_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
LITESTREAM_REPLICA_REGION=auto
```

### 5. Start Litestream

```bash
docker compose --profile prod up -d node-prod litestream
```

Litestream will continuously replicate your SQLite database to R2. Restoring:

```bash
bash scripts/litestream-restore.sh /data/appseed.db
```

### Cost

R2 pricing (as of 2026):
- **Storage:** $0.015/GB/month
- **Class A ops (writes):** $4.50 per million
- **Class B ops (reads):** $0.36 per million
- **Egress: $0** (this is R2's main advantage)

A typical AppSeed database with Litestream costs well under $1/month on R2.

---

## Domain Routing

### Single app

Point your domain at either the VPS IP (Approach A) or the tunnel (Approach B):

```
yourapp.com -> Cloudflare Proxy -> VPS / Tunnel -> Docker (port 3013)
```

DNS setup:
- **Approach A:** A record, `yourapp.com` -> `<vm-ip>`, Proxy ON
- **Approach B:** `cloudflared tunnel route dns my-app-tunnel yourapp.com` (creates CNAME automatically)

### Multiple apps on one domain

Use subdomains with a single tunnel:

```
app.yourdomain.com   -> localhost:3005 (Next.js dev)
```

```bash
cloudflared tunnel route dns my-tunnel app.yourdomain.com
cloudflared tunnel route dns my-tunnel admin.yourdomain.com
```

### Wildcard subdomains

1. In Cloudflare DNS, add a wildcard CNAME: `*` -> `<tunnel-id>.cfargotunnel.com`
2. In tunnel config, use Caddy or another reverse proxy to route by hostname

---

## Cost Summary

| Component | Free | Paid |
|-----------|------|------|
| Cloudflare Tunnel | Yes (unlimited tunnels) | - |
| Cloudflare DNS + SSL | Yes | - |
| Cloudflare VPS | - | ~$5/mo (1 vCPU, 1 GB) |
| R2 (Litestream backups) | 10 GB free | $0.015/GB/mo after |
| Your own hardware (Tunnel) | Use what you have | $0 |

**Cheapest production setup:** Approach B (Tunnel) on any spare machine + R2 for backups = **$0/month**.

**Simplest cloud setup:** Approach A (VPS) + R2 = **~$5/month**.

---

## Troubleshooting

### Tunnel: "connection refused" or "502 Bad Gateway"
The tunnel cannot reach your app. Check:
```bash
# Is the container running?
docker ps | grep appseed

# Can you reach it locally?
curl http://localhost:3013/api/health

# Check tunnel logs
cloudflared tunnel run my-app-tunnel --loglevel debug
```

### Tunnel: "failed to connect to origin" after reboot
The tunnel service is not starting automatically:
```bash
# Linux
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# macOS
sudo launchctl list | grep cloudflared
```

### R2: "AccessDenied" from Litestream
Check your API token permissions:
- Must have **Object Read & Write** on the specific bucket
- Verify `LITESTREAM_REPLICA_ENDPOINT` includes `https://` and ends with `.r2.cloudflarestorage.com`
- Verify `LITESTREAM_REPLICA_REGION` is set to `auto`

### VPS: Docker build hangs
Use `DOCKER_BUILDKIT=0`:
```bash
DOCKER_BUILDKIT=0 docker compose --profile prod up -d --build node-prod
```

### Workers: "X is not a function" / "Module not found"
This means you are trying to use Node.js-specific modules on Workers. See [Approach C](#approach-c-cloudflare-workers-not-viable-for-appseed) — AppSeed is not compatible with Workers.

---

## Quick Reference

```bash
# ── Tunnel commands ──────────────────────────────────
cloudflared tunnel login                    # Authenticate
cloudflared tunnel create <name>            # Create tunnel
cloudflared tunnel route dns <name> <host>  # Route domain
cloudflared tunnel run <name>               # Start tunnel
cloudflared tunnel info <name>              # Check status
cloudflared tunnel list                     # List all tunnels
cloudflared tunnel delete <name>            # Delete tunnel

# ── Docker (production) ──────────────────────────────
DOCKER_BUILDKIT=0 docker compose --profile prod up -d node-prod
DOCKER_BUILDKIT=0 docker compose --profile prod up -d node-prod litestream
docker compose --profile prod logs -f node-prod
docker compose --profile prod restart node-prod

# ── R2 (via wrangler CLI) ────────────────────────────
npx wrangler r2 bucket list                 # List buckets
npx wrangler r2 bucket create <name>        # Create bucket
npx wrangler r2 object list <bucket>        # List objects

# ── Health check ─────────────────────────────────────
curl https://yourapp.com/api/health
```
