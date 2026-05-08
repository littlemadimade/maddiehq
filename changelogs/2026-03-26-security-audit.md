---
date: 2026-03-26
scope: [node, rails]
category: security
files_changed:
  - node/lib/db.ts
  - node/app/api/cron/route.ts
  - node/app/api/admin/database/[table]/route.ts
  - node/app/api/files/route.ts
  - node/app/api/files/[key]/route.ts
  - node/app/api/webhooks/route.ts
  - node/app/api/webhooks/[id]/route.ts
  - node/package.json
  - rails/config/initializers/seed_admin.rb
  - rails/app/controllers/api/cron_controller.rb
  - rails/app/controllers/api/auth/sessions_controller.rb
  - rails/app/controllers/api/auth/registrations_controller.rb
  - rails/app/controllers/api/auth/oauth_controller.rb
  - rails/app/controllers/api/auth/two_factor_controller.rb
  - rails/app/controllers/api/base_controller.rb
  - rails/app/controllers/api/files_controller.rb
  - rails/app/controllers/api/webhooks_controller.rb
  - rails/app/controllers/api/admin/database_controller.rb
  - rails/app/helpers/markdown_helper.rb
requires_migration: false
requires_env_vars: [CRON_SECRET]
breaking: true
---

## Security audit fixes

Full security audit of both apps. Fixed 16 critical and high severity issues.

### Breaking changes
- **File downloads now require authentication** and are scoped to the file owner
- **Session tokens removed from login/signup API response body** (Rails) -- httponly cookie is the only auth mechanism now
- **SVG uploads blocked** (SVGs can contain embedded JavaScript)
- **Cron endpoint rejects requests when `CRON_SECRET` is not set** -- previously it was silently open

### Critical fixes
- Default admin only seeds in development, never production
- Blog content sanitized through SafeListSanitizer (Rails)
- Database browser hides sensitive tables (sessions, 2FA, verifications) and redacts sensitive columns

### High fixes
- SSRF protection on webhook URLs (blocks internal IPs in production)
- File upload content-type allowlist (images, PDFs, text, JSON, zip)
- Filename sanitization in Content-Disposition headers
- Disabled users rejected at session validation (Rails)
- Next.js updated to 16.2.1 (CSRF bypass + HTTP smuggling CVEs)

### Deferred (see issues #156-#160)
- Apple JWT signature verification
- CSP/HSTS headers
- RBAC enforcement on all admin endpoints
- OAuth account linking email verification
- Persistent rate limiter
