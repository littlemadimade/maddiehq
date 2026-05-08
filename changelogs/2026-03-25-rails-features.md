---
date: 2026-03-25
scope: [rails]
category: feature
files_changed:
  - rails/lib/rbac.rb
  - rails/lib/analytics.rb
  - rails/lib/realtime.rb
  - rails/lib/plan_helpers.rb
  - rails/lib/webhook_service.rb
  - rails/lib/notification_service.rb
  - rails/app/controllers/api/realtime_controller.rb
  - rails/app/controllers/api/waitlist_controller.rb
  - rails/app/controllers/api/admin/roles_controller.rb
  - rails/app/controllers/api/admin/waitlist_controller.rb
  - rails/db/migrate/
requires_migration: true
requires_env_vars: [ANALYTICS_PROVIDER, WAITLIST_MODE]
breaking: false
---

## Port Node.js features to Rails

Ported 5 features from the Node app to Rails for stack parity:

- **RBAC**: `lib/rbac.rb` with permission groups matching Node's system
- **Analytics**: Pluggable analytics (`lib/analytics.rb`) supporting PostHog, Plausible, console, noop
- **Real-time SSE**: `lib/realtime.rb` with in-process pub/sub for server-sent events
- **Plan helpers**: `lib/plan_helpers.rb` for subscription status checks
- **Waitlist**: Full waitlist API with referral tracking and admin management
