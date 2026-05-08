package scaffold

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/marknutter/appseed/cli/internal/config"
)

// GenerateEnvFiles creates .env.local (Node) and .env (Rails) with generated secrets.
func GenerateEnvFiles(p *config.Project) error {
	if p.IncludesNode() {
		if err := generateNodeEnv(p); err != nil {
			return fmt.Errorf("failed to generate node .env.local: %w", err)
		}
	}

	if p.IncludesRails() {
		if err := generateRailsEnv(p); err != nil {
			return fmt.Errorf("failed to generate rails .env: %w", err)
		}
	}

	return nil
}

func generateNodeEnv(p *config.Project) error {
	secret, err := generateBase64Secret(32)
	if err != nil {
		return err
	}

	devPortStr := strconv.Itoa(p.DevPort)
	content := fmt.Sprintf(`BETTER_AUTH_SECRET=%s
BETTER_AUTH_URL=http://localhost:%s
DATABASE_PATH=./data/%s.db
APP_NAME=%s
APP_URL=http://localhost:%s
# Uncomment to use PostgreSQL instead of SQLite:
# DATABASE_URL=postgres://user:password@localhost:5432/%s
`, secret, devPortStr, p.Slug, p.AppName, devPortStr, p.Slug)

	if p.Database == config.DBPostgres {
		// Uncomment the DATABASE_URL line
		content = fmt.Sprintf(`BETTER_AUTH_SECRET=%s
BETTER_AUTH_URL=http://localhost:%s
DATABASE_PATH=./data/%s.db
APP_NAME=%s
APP_URL=http://localhost:%s
DATABASE_URL=postgres://user:password@localhost:5432/%s
`, secret, devPortStr, p.Slug, p.AppName, devPortStr, p.Slug)
	}

	return os.WriteFile(filepath.Join(p.TargetDir, "node", ".env.local"), []byte(content), 0600)
}

func generateRailsEnv(p *config.Project) error {
	secret, err := generateHexSecret(64)
	if err != nil {
		return err
	}

	content := fmt.Sprintf(`SECRET_KEY_BASE=%s
DATABASE_PATH=./db/development.sqlite3
APP_URL=http://localhost:%d
APP_NAME=%s
`, secret, p.RailsDevPort, p.AppName)

	return os.WriteFile(filepath.Join(p.TargetDir, "rails", ".env"), []byte(content), 0600)
}

func generateBase64Secret(bytes int) (string, error) {
	b := make([]byte, bytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func generateHexSecret(bytes int) (string, error) {
	b := make([]byte, bytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
