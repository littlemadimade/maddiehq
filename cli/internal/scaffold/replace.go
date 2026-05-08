package scaffold

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/marknutter/appseed/cli/internal/config"
)

// Replacements defines all the string replacements to apply across the project.
type replacement struct {
	old string
	new string
}

// CustomizeProject applies all find-and-replace operations to customize the template.
func CustomizeProject(p *config.Project) error {
	if p.IncludesNode() {
		if err := customizeNode(p); err != nil {
			return fmt.Errorf("node customization failed: %w", err)
		}
	}

	if p.IncludesRails() {
		if err := customizeRails(p); err != nil {
			return fmt.Errorf("rails customization failed: %w", err)
		}
	}

	// docker-compose.yml is generated fresh by GenerateDockerCompose(), not patched here.

	if err := customizeRootDocs(p); err != nil {
		return fmt.Errorf("root docs customization failed: %w", err)
	}

	return nil
}

func customizeNode(p *config.Project) error {
	nodeDir := filepath.Join(p.TargetDir, "node")
	devPortStr := strconv.Itoa(p.DevPort)
	prodPortStr := strconv.Itoa(p.ProdPort)

	// Global replacements across all Node.js source files
	globalReplacements := []replacement{
		// App name
		{`"AppSeed"`, fmt.Sprintf(`"%s"`, p.AppName)},
		{`'AppSeed'`, fmt.Sprintf(`'%s'`, p.AppName)},
		{`AppSeed`, p.AppName}, // Catches remaining bare references

		// Slug-based replacements
		{`"appseed"`, fmt.Sprintf(`"%s"`, p.Slug)},
		{`appseed-theme`, p.Slug + "-theme"},
		{`appseed-cookie-consent`, p.Slug + "-cookie-consent"},
		{`appseed-onboarding-completed`, p.Slug + "-onboarding-completed"},
		{`appseed-export-`, p.Slug + "-export-"},

		// Database path
		{`./data/appseed.db`, fmt.Sprintf(`./data/%s.db`, p.Slug)},
		{`appseed.db`, fmt.Sprintf(`%s.db`, p.Slug)},

		// Fallback URL
		{`https://appseed.dev`, fmt.Sprintf(`https://%s.example.com`, p.Slug)},

		// DATABASE_URL comment in .env.example
		{`postgres://user:password@localhost:5432/appseed`, fmt.Sprintf(`postgres://user:password@localhost:5432/%s`, p.Slug)},
	}

	// Walk all .ts, .tsx, .env, .toml files and apply replacements
	exts := map[string]bool{
		".ts": true, ".tsx": true, ".json": true, ".yml": true, ".yaml": true,
		".env": true, ".md": true, ".mdx": true, ".toml": true,
	}

	err := filepath.Walk(nodeDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			// Skip node_modules and .next
			base := info.Name()
			if base == "node_modules" || base == ".next" || base == ".git" {
				return filepath.SkipDir
			}
			return nil
		}

		ext := filepath.Ext(path)
		// Also handle files like ".env.example", ".env.local"
		base := filepath.Base(path)
		isEnvFile := strings.HasPrefix(base, ".env")

		if !exts[ext] && !isEnvFile {
			return nil
		}

		return applyReplacements(path, globalReplacements)
	})
	if err != nil {
		return err
	}

	// Port-specific replacements in Docker files
	nodeDockerfile := filepath.Join(nodeDir, "Dockerfile")
	if fileExists(nodeDockerfile) {
		portReplacements := []replacement{
			{"EXPOSE 3006", fmt.Sprintf("EXPOSE %s", prodPortStr)},
			{"ENV PORT=3006", fmt.Sprintf("ENV PORT=%s", prodPortStr)},
			{"/data/appseed.db", fmt.Sprintf("/data/%s.db", p.Slug)},
		}
		if err := applyReplacements(nodeDockerfile, portReplacements); err != nil {
			return err
		}
	}

	// Update .env.example with correct ports
	envExample := filepath.Join(nodeDir, ".env.example")
	if fileExists(envExample) {
		portReplacements := []replacement{
			{"http://localhost:3000", fmt.Sprintf("http://localhost:%s", devPortStr)},
		}
		if err := applyReplacements(envExample, portReplacements); err != nil {
			return err
		}
	}

	// wrangler.toml — Cloudflare Workers config. Always update (even when
	// DeployTarget != cloudflare) so the file is correct if the user later
	// switches targets. The file is shipped in the template regardless.
	if err := customizeWrangler(nodeDir, p); err != nil {
		return err
	}

	return nil
}

// customizeWrangler updates the structured fields in wrangler.toml that the
// generic string-walk would mangle (since `appseed` appears as both a
// project-name token and as part of the bucket/D1 names with prefixes).
//
// Leaves untouched:
//   - `database_id` (placeholder; operator replaces after `wrangler d1 create`)
//   - `binding = "DB"` and `binding = "STORAGE"` (runtime code looks them up
//     verbatim via getCloudflareContext().env.DB / .STORAGE)
//   - `compatibility_date`, `compatibility_flags`, `[vars]` other than APP_NAME
func customizeWrangler(nodeDir string, p *config.Project) error {
	path := filepath.Join(nodeDir, "wrangler.toml")
	if !fileExists(path) {
		return nil
	}

	replacements := []replacement{
		// Worker name (top-level + production env)
		{`name = "appseed"`, fmt.Sprintf(`name = "%s"`, p.Slug)},
		// D1 database name
		{`database_name = "appseed-db"`, fmt.Sprintf(`database_name = "%s-db"`, p.Slug)},
		// R2 bucket name
		{`bucket_name = "appseed-storage"`, fmt.Sprintf(`bucket_name = "%s-storage"`, p.Slug)},
		// APP_NAME var (under [vars])
		{`APP_NAME = "AppSeed"`, fmt.Sprintf(`APP_NAME = "%s"`, p.AppName)},
	}

	return applyReplacements(path, replacements)
}

func customizeRails(p *config.Project) error {
	railsDir := filepath.Join(p.TargetDir, "rails")
	if !fileExists(railsDir) {
		return nil // Rails not included
	}

	// Order matters: replace Ruby module name first (PascalCase),
	// then quoted display name strings, then remaining bare references.
	globalReplacements := []replacement{
		// Ruby module/class name: module AppSeed → module Testapp
		{`module AppSeed`, fmt.Sprintf(`module %s`, p.ModuleName)},
		{`AppSeed::`, fmt.Sprintf(`%s::`, p.ModuleName)},
		// Quoted display name strings
		{`"AppSeed"`, fmt.Sprintf(`"%s"`, p.AppName)},
		{`'AppSeed'`, fmt.Sprintf(`'%s'`, p.AppName)},
		// Remaining bare references (team name, comments, etc.)
		{`AppSeed`, p.AppName},
		// Slug-based
		{`appseed-theme`, p.Slug + "-theme"},
		{`appseed-rails.db`, p.Slug + "-rails.db"},
	}

	exts := map[string]bool{
		".rb": true, ".erb": true, ".js": true, ".yml": true, ".yaml": true,
		".md": true, ".json": true,
	}

	return filepath.Walk(railsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			base := info.Name()
			if base == "node_modules" || base == ".git" || base == "vendor" {
				return filepath.SkipDir
			}
			return nil
		}

		ext := filepath.Ext(path)
		base := filepath.Base(path)
		isEnvFile := strings.HasPrefix(base, ".env")

		if !exts[ext] && !isEnvFile {
			return nil
		}

		return applyReplacements(path, globalReplacements)
	})
}

func customizeDocker(p *config.Project) error {
	prodPortStr := strconv.Itoa(p.ProdPort)
	devPortStr := strconv.Itoa(p.DevPort)

	dcPath := filepath.Join(p.TargetDir, "docker-compose.yml")
	if !fileExists(dcPath) {
		return nil
	}

	replacements := []replacement{
		// Container names
		{"container_name: appseed-dev", fmt.Sprintf("container_name: %s-dev", p.Slug)},
		{"container_name: appseed-rails-dev", fmt.Sprintf("container_name: %s-rails-dev", p.Slug)},
		{"container_name: appseed-rails", fmt.Sprintf("container_name: %s-rails", p.Slug)},
		{"container_name: appseed", fmt.Sprintf("container_name: %s", p.Slug)},

		// Volume names
		{"appseed_data", p.Slug + "_data"},
		{"appseed_rails_data", p.Slug + "_rails_data"},

		// Ports
		{"3006:3006", fmt.Sprintf("%s:%s", prodPortStr, prodPortStr)},

		// Database paths
		{"appseed.db", fmt.Sprintf("%s.db", p.Slug)},
		{"appseed-rails.db", fmt.Sprintf("%s-rails.db", p.Slug)},

		// App name
		{"APP_NAME:-AppSeed", fmt.Sprintf("APP_NAME:-%s", p.AppName)},

		// Dev port
		{"DEV_PORT:-3003", fmt.Sprintf("DEV_PORT:-%s", devPortStr)},
	}

	return applyReplacements(dcPath, replacements)
}

func customizeRootDocs(p *config.Project) error {
	// CLAUDE.md
	claudeMd := filepath.Join(p.TargetDir, "CLAUDE.md")
	if fileExists(claudeMd) {
		if err := applyReplacements(claudeMd, []replacement{
			{"AppSeed", p.AppName},
			{"appseed", p.Slug},
		}); err != nil {
			return err
		}
	}

	// AGENTS.md
	agentsMd := filepath.Join(p.TargetDir, "AGENTS.md")
	if fileExists(agentsMd) {
		if err := applyReplacements(agentsMd, []replacement{
			{"AppSeed", p.AppName},
			{"appseed", p.Slug},
		}); err != nil {
			return err
		}
	}

	return nil
}

// applyReplacements reads a file, applies all replacements, and writes it back.
func applyReplacements(path string, replacements []replacement) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	s := string(content)
	for _, r := range replacements {
		s = strings.ReplaceAll(s, r.old, r.new)
	}

	if s != string(content) {
		return os.WriteFile(path, []byte(s), 0644)
	}
	return nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
