---
date: 2026-03-25
scope: [rails]
category: feature
files_changed:
  - rails/app/controllers/api/auth/oauth_controller.rb
  - rails/app/views/auth/show.html.erb
  - rails/app/javascript/controllers/auth_form_controller.js
  - rails/app/javascript/controllers/waitlist_controller.js
  - rails/app/javascript/controllers/webhooks_controller.js
  - rails/app/javascript/controllers/admin_logs_controller.js
  - rails/app/javascript/controllers/admin_waitlist_controller.js
  - rails/app/javascript/controllers/admin_roles_controller.js
  - rails/app/views/pages/landing.html.erb
  - rails/app/views/admin_pages/waitlist.html.erb
  - rails/app/views/admin_pages/roles.html.erb
  - rails/app/views/admin_pages/logs.html.erb
  - rails/app/views/layouts/admin.html.erb
  - rails/app/mailers/app_mailer.rb
  - rails/app/controllers/api/auth/registrations_controller.rb
requires_migration: false
requires_env_vars: [WAITLIST_MODE, APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
breaking: false
---

## Rails/Node parity: OAuth, waitlist, emails, admin UI

Brought the Rails app to feature parity with Node across 14 identified discrepancies.

### Auth
- Added Apple, Facebook, Microsoft OAuth providers (5 total, matching Node)
- Removed explicit Name field from signup (auto-generates from email prefix)
- Added invite code field for waitlist mode
- Added `WAITLIST_MODE` env var support

### Landing page
- Conditional waitlist/newsletter section based on `WAITLIST_MODE`
- Hero CTA switches to "Join the Waitlist" in waitlist mode

### Emails
- Added `lifetime_purchase_email` and `waitlist_invite_email` to AppMailer
- Welcome + verification emails now sent on signup

### Admin
- Audit logs: full filtering (action, target type, date range, search) + pagination
- Waitlist: stats cards, bulk select/invite, search, status filter
- Roles: full RBAC management page
- Sidebar: added Waitlist and Roles navigation links

### Settings
- Webhooks: deliveries view toggle showing last 10 delivery attempts
