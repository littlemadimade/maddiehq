package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Feature represents an optional feature that can be included/excluded.
type Feature string

const (
	FeatureAuth       Feature = "auth"
	FeaturePayments   Feature = "payments"
	FeatureEmail      Feature = "email"
	FeatureBlog       Feature = "blog"
	FeatureWebhooks   Feature = "webhooks"
	FeatureNewsletter Feature = "newsletter"
	FeatureAdmin      Feature = "admin"
	FeatureChatbot    Feature = "chatbot"
)

// AllFeatures returns the full list of optional features.
func AllFeatures() []Feature {
	return []Feature{
		FeatureAuth,
		FeaturePayments,
		FeatureEmail,
		FeatureBlog,
		FeatureWebhooks,
		FeatureNewsletter,
		FeatureAdmin,
		FeatureChatbot,
	}
}

// FeaturesRequiringAuth returns features that cannot work without auth.
func FeaturesRequiringAuth() []Feature {
	return []Feature{
		FeaturePayments,
		FeatureEmail,
		FeatureWebhooks,
		FeatureAdmin,
	}
}

// Project holds all configuration derived from user input.
type Project struct {
	AppName      string       // Display name, e.g. "Moxmo"
	Slug         string       // Kebab-case, e.g. "moxmo"
	ModuleName   string       // PascalCase for Ruby modules, e.g. "Testapp"
	Description  string       // One-line description
	TargetDir    string       // Absolute path to output directory
	DevPort      int          // Node.js dev server port
	ProdPort     int          // Node.js production port
	RailsDevPort int          // Rails dev server port (always 3014)
	Stack        Stack        // Which stacks to include
	Database     DB           // SQLite or PostgreSQL
	DeployTarget DeployTarget // Where the Node stack will deploy to
	TemplatePath string       // Path to AppSeed template
	Features     []Feature    // Selected optional features
}

type Stack string

const (
	StackNode  Stack = "node"
	StackRails Stack = "rails"
)

type DB string

const (
	DBSQLite   DB = "sqlite"
	DBPostgres DB = "postgres"
)

// DeployTarget selects the primary deploy target for the Node stack. The
// choice mainly drives which files get customized for the new project's
// name (e.g. wrangler.toml only matters for Cloudflare) and the post-create
// Next-Steps output. The codebase supports all targets simultaneously —
// it's a runtime choice, not a build-time one.
type DeployTarget string

const (
	DeployCloudflare DeployTarget = "cloudflare"
	DeployVercel     DeployTarget = "vercel"
	DeployRailway    DeployTarget = "railway"
	DeployOther      DeployTarget = "other"
)

func (p *Project) IncludesNode() bool {
	return p.Stack == StackNode
}

func (p *Project) IncludesRails() bool {
	return p.Stack == StackRails
}

// HasFeature returns true if the project includes the given feature.
func (p *Project) HasFeature(f Feature) bool {
	for _, feat := range p.Features {
		if feat == f {
			return true
		}
	}
	return false
}

// Pascalize converts a display name to PascalCase for Ruby module names.
// "My App" → "MyApp", "test-app" → "TestApp", "moxmo" → "Moxmo"
func Pascalize(name string) string {
	var result strings.Builder
	capitalizeNext := true
	for _, r := range name {
		if r == ' ' || r == '-' || r == '_' {
			capitalizeNext = true
			continue
		}
		if capitalizeNext {
			result.WriteRune(rune(strings.ToUpper(string(r))[0]))
			capitalizeNext = false
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// Slugify converts a display name to kebab-case.
func Slugify(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	// Remove characters that aren't alphanumeric or hyphens
	var result strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// FindTemplate locates the AppSeed template directory.
func FindTemplate() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}

	candidates := []string{
		filepath.Join(home, "Kode", "appseed"),
		filepath.Join(home, "Code", "appseed"),
		filepath.Join(home, "code", "appseed"),
		filepath.Join(home, "projects", "appseed"),
	}

	for _, p := range candidates {
		if info, err := os.Stat(filepath.Join(p, "CLAUDE.md")); err == nil && !info.IsDir() {
			return p, nil
		}
	}

	return "", fmt.Errorf("AppSeed template not found in common locations. Please specify --template-path")
}
