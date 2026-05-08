---
date: 2026-03-23
scope: [node]
category: feature
files_changed:
  - node/app/auth/page.tsx
  - node/app/page.tsx
  - node/components/landing/waitlist-signup.tsx
  - node/app/api/waitlist/join/route.ts
  - node/app/api/waitlist/status/route.ts
  - node/app/api/waitlist/validate-invite/route.ts
  - node/app/api/waitlist/redeem-invite/route.ts
  - node/app/admin/waitlist/page.tsx
  - node/lib/schema.sqlite.ts
  - node/migrations/008_create_waitlist.sql
requires_migration: true
requires_env_vars: [NEXT_PUBLIC_WAITLIST_MODE]
breaking: false
---

## Waitlist mode with invite codes

Gate signups behind invite codes. When `NEXT_PUBLIC_WAITLIST_MODE=true`:

- Landing page shows waitlist signup instead of newsletter
- Hero CTA changes to "Join the Waitlist"
- Signup form requires and validates an invite code
- Referral tracking with shareable referral links
- Admin waitlist management page with bulk invite

Tables added: `waitlist`, `invite_codes`.
