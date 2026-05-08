package scaffold

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/marknutter/appseed/cli/internal/config"
)

// GenerateDockerCompose writes a docker-compose.yml with only the selected
// stack's services and the appropriate database (SQLite or PostgreSQL).
func GenerateDockerCompose(p *config.Project) error {
	path := filepath.Join(p.TargetDir, "docker-compose.yml")

	var content string
	isPg := p.Database == config.DBPostgres

	if p.IncludesNode() {
		if isPg {
			content = nodePostgresCompose(p)
		} else {
			content = nodeSqliteCompose(p)
		}
	} else {
		if isPg {
			content = railsPostgresCompose(p)
		} else {
			content = railsSqliteCompose(p)
		}
	}

	return os.WriteFile(path, []byte(content), 0644)
}

// ─── Node + SQLite ──────────────────────────────────────────────────────────

func nodeSqliteCompose(p *config.Project) string {
	devPort := strconv.Itoa(p.DevPort)
	prodPort := strconv.Itoa(p.ProdPort)

	return fmt.Sprintf(`services:
  # ── Development ──────────────────────────────────────────────────────────
  dev:
    profiles: [dev]
    build:
      context: ./node
      dockerfile: Dockerfile.dev
    container_name: %[1]s-dev
    ports:
      - "${DEV_PORT:-%[2]s}:3000"
    volumes:
      - ./node:/app
      - /app/node_modules
      - ./node/data:/app/data
    env_file: ./node/.env.local
    environment:
      NODE_ENV: development
      DATABASE_PATH: /app/data/%[1]s.db
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:-http://localhost:%[2]s}
      APP_URL: ${APP_URL:-http://localhost:%[2]s}
      WATCHPACK_POLLING: "true"
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      ELEVENLABS_API_KEY: ${ELEVENLABS_API_KEY:-}

  # ── Production ───────────────────────────────────────────────────────────
  prod:
    profiles: [prod]
    build:
      context: ./node
      dockerfile: Dockerfile
    container_name: %[1]s
    restart: unless-stopped
    ports:
      - "%[3]s:%[3]s"
    volumes:
      - %[1]s_data:/data
    environment:
      NODE_ENV: production
      DATABASE_PATH: /data/%[1]s.db
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-}
      BETTER_AUTH_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_NAME: ${APP_NAME:-%[4]s}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}

  # ── Litestream (SQLite replication) ──────────────────────────────────────
  litestream:
    profiles: [prod]
    image: litestream/litestream:latest
    command: replicate
    volumes:
      - %[1]s_data:/data
      - ./node/litestream.yml:/etc/litestream.yml
    environment:
      DATABASE_PATH: /data/%[1]s.db
      LITESTREAM_ACCESS_KEY_ID: ${LITESTREAM_ACCESS_KEY_ID:-}
      LITESTREAM_SECRET_ACCESS_KEY: ${LITESTREAM_SECRET_ACCESS_KEY:-}
      LITESTREAM_REPLICA_BUCKET: ${LITESTREAM_REPLICA_BUCKET:-}
      LITESTREAM_REPLICA_PATH: ${LITESTREAM_REPLICA_PATH:-%[1]s}
      LITESTREAM_REPLICA_ENDPOINT: ${LITESTREAM_REPLICA_ENDPOINT:-}
      LITESTREAM_REPLICA_REGION: ${LITESTREAM_REPLICA_REGION:-us-east-1}
    depends_on:
      - prod
    restart: unless-stopped

volumes:
  %[1]s_data:
`, p.Slug, devPort, prodPort, p.AppName)
}

// ─── Node + PostgreSQL ──────────────────────────────────────────────────────

func nodePostgresCompose(p *config.Project) string {
	devPort := strconv.Itoa(p.DevPort)
	prodPort := strconv.Itoa(p.ProdPort)

	return fmt.Sprintf(`services:
  # ── PostgreSQL ───────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - %[1]s_pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: %[1]s
      POSTGRES_USER: %[1]s
      POSTGRES_PASSWORD: %[1]s_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U %[1]s"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ── Development ──────────────────────────────────────────────────────────
  dev:
    profiles: [dev]
    build:
      context: ./node
      dockerfile: Dockerfile.dev
    container_name: %[1]s-dev
    ports:
      - "${DEV_PORT:-%[2]s}:3000"
    volumes:
      - ./node:/app
      - /app/node_modules
    env_file: ./node/.env.local
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://%[1]s:%[1]s_dev@postgres:5432/%[1]s
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:-http://localhost:%[2]s}
      APP_URL: ${APP_URL:-http://localhost:%[2]s}
      WATCHPACK_POLLING: "true"
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      ELEVENLABS_API_KEY: ${ELEVENLABS_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy

  # ── Production ───────────────────────────────────────────────────────────
  prod:
    profiles: [prod]
    build:
      context: ./node
      dockerfile: Dockerfile
    container_name: %[1]s
    restart: unless-stopped
    ports:
      - "%[3]s:%[3]s"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL:-postgres://%[1]s:%[1]s_dev@postgres:5432/%[1]s}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-}
      BETTER_AUTH_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_NAME: ${APP_NAME:-%[4]s}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  %[1]s_pgdata:
`, p.Slug, devPort, prodPort, p.AppName)
}

// ─── Rails + SQLite ─────────────────────────────────────────────────────────

func railsSqliteCompose(p *config.Project) string {
	devPort := strconv.Itoa(p.DevPort)
	prodPort := strconv.Itoa(p.ProdPort)

	// Internal port is always 3014 (hardcoded in Dockerfile.dev CMD).
	return fmt.Sprintf(`services:
  # ── Development ──────────────────────────────────────────────────────────
  dev:
    profiles: [dev]
    build:
      context: ./rails
      dockerfile: Dockerfile.dev
    container_name: %[1]s-dev
    ports:
      - "${DEV_PORT:-%[2]s}:3014"
    volumes:
      - ./rails:/app
      - /app/vendor/bundle
      - ./rails/db:/app/db
    env_file: ./rails/.env
    environment:
      RAILS_ENV: development
      DATABASE_PATH: /app/db/development.sqlite3

  # ── Production ───────────────────────────────────────────────────────────
  prod:
    profiles: [prod]
    build:
      context: ./rails
      dockerfile: Dockerfile
    container_name: %[1]s
    restart: unless-stopped
    ports:
      - "%[3]s:%[3]s"
    volumes:
      - %[1]s_data:/data
    environment:
      RAILS_ENV: production
      SECRET_KEY_BASE: ${SECRET_KEY_BASE:-}
      DATABASE_PATH: /data/%[1]s.db
      APP_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_NAME: ${APP_NAME:-%[4]s}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}

  # ── Litestream (SQLite replication) ──────────────────────────────────────
  litestream:
    profiles: [prod]
    image: litestream/litestream:latest
    command: replicate
    volumes:
      - %[1]s_data:/data
      - ./rails/litestream.yml:/etc/litestream.yml
    environment:
      DATABASE_PATH: /data/%[1]s.db
      LITESTREAM_ACCESS_KEY_ID: ${LITESTREAM_ACCESS_KEY_ID:-}
      LITESTREAM_SECRET_ACCESS_KEY: ${LITESTREAM_SECRET_ACCESS_KEY:-}
      LITESTREAM_REPLICA_BUCKET: ${LITESTREAM_REPLICA_BUCKET:-}
      LITESTREAM_REPLICA_PATH: ${LITESTREAM_REPLICA_PATH:-%[1]s}
      LITESTREAM_REPLICA_ENDPOINT: ${LITESTREAM_REPLICA_ENDPOINT:-}
      LITESTREAM_REPLICA_REGION: ${LITESTREAM_REPLICA_REGION:-us-east-1}
    depends_on:
      - prod
    restart: unless-stopped

volumes:
  %[1]s_data:
`, p.Slug, devPort, prodPort, p.AppName)
}

// ─── Rails + PostgreSQL ─────────────────────────────────────────────────────

func railsPostgresCompose(p *config.Project) string {
	devPort := strconv.Itoa(p.DevPort)
	prodPort := strconv.Itoa(p.ProdPort)

	return fmt.Sprintf(`services:
  # ── PostgreSQL ───────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - %[1]s_pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: %[1]s
      POSTGRES_USER: %[1]s
      POSTGRES_PASSWORD: %[1]s_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U %[1]s"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ── Development ──────────────────────────────────────────────────────────
  dev:
    profiles: [dev]
    build:
      context: ./rails
      dockerfile: Dockerfile.dev
    container_name: %[1]s-dev
    ports:
      - "${DEV_PORT:-%[2]s}:3014"
    volumes:
      - ./rails:/app
      - /app/vendor/bundle
    env_file: ./rails/.env
    environment:
      RAILS_ENV: development
      DATABASE_URL: postgres://%[1]s:%[1]s_dev@postgres:5432/%[1]s
    depends_on:
      postgres:
        condition: service_healthy

  # ── Production ───────────────────────────────────────────────────────────
  prod:
    profiles: [prod]
    build:
      context: ./rails
      dockerfile: Dockerfile
    container_name: %[1]s
    restart: unless-stopped
    ports:
      - "%[3]s:%[3]s"
    environment:
      RAILS_ENV: production
      SECRET_KEY_BASE: ${SECRET_KEY_BASE:-}
      DATABASE_URL: ${DATABASE_URL:-postgres://%[1]s:%[1]s_dev@postgres:5432/%[1]s}
      APP_URL: ${APP_URL:-http://localhost:%[3]s}
      APP_NAME: ${APP_NAME:-%[4]s}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  %[1]s_pgdata:
`, p.Slug, devPort, prodPort, p.AppName)
}
