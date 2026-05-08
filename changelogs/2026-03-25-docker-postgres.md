---
date: 2026-03-25
scope: [node, rails]
category: feature
files_changed:
  - cli/internal/scaffold/docker.go
requires_migration: false
requires_env_vars: []
breaking: false
---

## PostgreSQL Docker container in CLI scaffolding

When creating a new project with `appseed create` and selecting PostgreSQL as the database, the generated `docker-compose.yml` now includes a self-contained `postgres:16-alpine` container with:

- Health check (`pg_isready`)
- `depends_on: condition: service_healthy` on app services
- `DATABASE_URL` auto-wired to the postgres service hostname
- No Litestream (not needed for PostgreSQL)

Works for both Node.js and Rails stacks.
