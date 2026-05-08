# Launch Checklist

Step-by-step guide to take a new app from MaddieHQ to live production.

---

## Domain & Hosting

- [ ] Register domain (recommend Cloudflare Registrar — at-cost pricing)
- [ ] Set up Cloudflare Tunnel (LaunchAgent plist for auto-start)
  - `cloudflared tunnel create myapp`
  - Create `~/Library/LaunchAgents/com.cloudflare.myapp.plist`
  - `launchctl load ~/Library/LaunchAgents/com.cloudflare.myapp.plist`
- [ ] Configure Caddy reverse proxy — add to `~/.config/caddy/Caddyfile`:
  ```
  myapp.yourdomain.com {
    reverse_proxy localhost:3006
  }
  ```
  Then: `caddy reload --config ~/.config/caddy/Caddyfile`
- [ ] Add public hostname route in Cloudflare Zero Trust dashboard:
  - Zero Trust → Networks → Tunnels → your tunnel → Public Hostname
  - Delete any manually-created CNAME first (CF creates it automatically)
- [ ] Add app to `docker-compose.yml`:
  ```yaml
  myapp:
    image: myapp:latest
    restart: unless-stopped
    ports:
      - "3006:3006"
    environment:
      - APP_URL=https://myapp.yourdomain.com
      - APP_NAME=MyApp
      - BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
      - BETTER_AUTH_URL=https://myapp.yourdomain.com
      - DATABASE_PATH=/data/myapp.db
      - RESEND_API_KEY=re_...
      - GOOGLE_CLIENT_ID=...
      - GOOGLE_CLIENT_SECRET=...
      - GITHUB_CLIENT_ID=...
      - GITHUB_CLIENT_SECRET=...
      - STRIPE_SECRET_KEY=sk_live_...
      - STRIPE_PRICE_ID=price_...
      - STRIPE_WEBHOOK_SECRET=whsec_...
    volumes:
      - myapp_data:/data
  volumes:
    myapp_data:
  ```

---

## Branding

- [ ] Create logo (PNG with transparency preferred) — place in `public/logo.png`
- [ ] Update app name throughout codebase (search for "MaddieHQ")
- [ ] Set `APP_NAME` env var (used in emails and MFA enrollment)
- [ ] Update `APP_URL` and `BETTER_AUTH_URL` env vars
- [ ] Update Resend from-email domain in `lib/email.ts` (change `noreply@YOUR_DOMAIN`)
- [ ] Update placeholder text in `app/privacy-policy/page.tsx` and `app/terms/page.tsx`:
  - Replace: `YOUR_COMPANY`, `YOUR_DOMAIN`, `YOUR_EMAIL`, `YOUR_STATE`

---

## Services — Resend (email)

- [ ] Create account at [resend.com](https://resend.com)
- [ ] Add and verify your domain in Resend dashboard
- [ ] Generate API key
- [ ] Add `RESEND_API_KEY=re_...` to docker-compose / .env
- [ ] Update `FROM` address in `lib/email.ts` to use your verified domain

---

## Services — OAuth (Google + GitHub)

- [ ] Set up Google OAuth (see `docs/OAUTH_SETUP.md` for details):
  - Create OAuth client at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  - Add redirect URI: `https://yourdomain.com/api/auth/callback/google`
  - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- [ ] Set up GitHub OAuth (see `docs/OAUTH_SETUP.md` for details):
  - Create OAuth app at [github.com/settings/developers](https://github.com/settings/developers)
  - Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`
  - Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` env vars

---

## Services — Stripe (payments)

- [ ] Create Stripe account at [stripe.com](https://stripe.com)
- [ ] Create product (e.g. "Pro Plan") with monthly price
- [ ] Get secret key (`sk_live_...`) — use live keys, not test
- [ ] Get price ID (`price_...`)
- [ ] Set up webhook endpoint in Stripe dashboard:
  - URL: `https://yourdomain.com/api/stripe/webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
  - Set API version to `2025-02-24.acacia` (must match `lib/stripe.ts`)
- [ ] Get webhook secret (`whsec_...`)
- [ ] Add all Stripe env vars to docker-compose / .env:
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `STRIPE_PRICE_ID=price_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] Note: Publishable key NOT needed for hosted checkout

---

## Services — Plaid (bank sync, optional)

- [ ] Create Plaid account at [dashboard.plaid.com](https://dashboard.plaid.com)
- [ ] Start in Sandbox (fake data, free)
- [ ] Get Client ID and Secret from dashboard
- [ ] Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox` to docker-compose
- [ ] Test with sandbox credentials: `user_good` / `pass_good`
- [ ] Apply for Development access (free, up to 100 real accounts):
  - Requires live Privacy Policy URL
  - Requires live Terms of Service URL
  - Requires live public product
- [ ] Apply for Production when ready (paid per item)

---

## Legal

- [ ] Privacy Policy live at `/privacy-policy` (link from footer)
- [ ] Terms of Service live at `/terms` (link from footer)
- [ ] Update company name, email, governing state in both docs

---

## Database

- [ ] Set `DATABASE_PATH` env var (e.g. `/data/myapp.db`)
- [ ] Set up Docker volume for persistence (see docker-compose.yml above)
- [ ] Rotate `BETTER_AUTH_SECRET` before real users: `openssl rand -base64 32`

---

## Pre-launch

- [ ] Verify OAuth sign-in works (Google and GitHub)
- [ ] Verify email flow end-to-end:
  1. Sign up → check inbox for verification email
  2. Click verification link → redirected to `/app?verified=1`
  3. Verified banner shows in dashboard
- [ ] Verify Stripe checkout flow:
  1. Click "Upgrade to Pro" → Stripe hosted checkout
  2. Complete payment → redirected to `/app?upgraded=1`
  3. Plan shows as Pro in dashboard
  4. Check Stripe webhook logs (no signature errors)
- [ ] Verify webhook signing (check `STRIPE_WEBHOOK_SECRET` is correct)
- [ ] Test forgot password flow:
  1. Submit email → receive reset email
  2. Click link → reset password page
- [ ] Test on mobile (responsive design)
- [ ] Check all footer links work (Privacy Policy, Terms)
- [ ] Verify `/api/health` returns 200

---

## Post-launch

- [ ] Apply for Plaid Development if using bank sync
- [ ] Set up error monitoring (e.g. [Sentry](https://sentry.io))
- [ ] Add analytics (e.g. [Plausible](https://plausible.io) or Google Analytics)
- [ ] Set up uptime monitoring (e.g. [UptimeRobot](https://uptimerobot.com))
- [ ] Switch Stripe from test mode to live mode
- [ ] Consider setting up a backup for the SQLite database file

---

## Docker Build Commands

```bash
# Build image (MUST use DOCKER_BUILDKIT=0 — BuildKit hangs on node:20-alpine)
cd /path/to/workspace && DOCKER_BUILDKIT=0 docker build -t myapp:latest ./myapp/

# Start container
docker-compose up -d myapp

# Check HTTP response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/

# View logs
docker-compose logs -f myapp
```
