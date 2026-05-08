---
date: 2026-03-25
scope: [node, rails]
category: feature
files_changed:
  - node/lib/analytics.ts
  - node/app/api/analytics/track/route.ts
  - rails/lib/analytics.rb
  - rails/app/controllers/api/analytics_controller.rb
requires_migration: false
requires_env_vars: [ANALYTICS_PROVIDER, POSTHOG_API_KEY, POSTHOG_HOST, PLAUSIBLE_DOMAIN, PLAUSIBLE_HOST]
breaking: false
---

## Pluggable analytics abstraction

Server-side analytics with swappable providers. Set `ANALYTICS_PROVIDER` to one of:

- `posthog` - PostHog (requires `POSTHOG_API_KEY`, `POSTHOG_HOST`)
- `plausible` - Plausible Analytics (requires `PLAUSIBLE_DOMAIN`, `PLAUSIBLE_HOST`)
- `console` - Logs events to console (development)
- `none` - No-op (default)

API: `track(event, properties, userId)`, `identify(userId, traits)`.
Client-side tracking via `POST /api/analytics/track`.
