package tui

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/marknutter/appseed/cli/internal/config"
)

// RunForm presents the interactive form and returns a filled Project config.
func RunForm(templatePath string) (*config.Project, error) {
	home, _ := os.UserHomeDir()

	var (
		appName      string
		description  string
		targetDir    string
		devPort      string
		prodPort     string
		stack        string
		database     string
		deployTarget string
		features     []string
	)

	// Pre-select all features by default
	allFeatureKeys := []string{"auth", "payments", "email", "blog", "webhooks", "newsletter", "admin"}
	features = make([]string, len(allFeatureKeys))
	copy(features, allFeatureKeys)

	// ── Form 1: basics + stack ───────────────────────────────────────────

	form1 := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Project name").
				Description("Display name for your app").
				Placeholder("Moxmo").
				Value(&appName).
				Validate(func(s string) error {
					if len(s) < 1 {
						return fmt.Errorf("project name is required")
					}
					return nil
				}),

			huh.NewInput().
				Title("One-line description").
				Description("What does it do?").
				Placeholder("Personal expense tracking with bank syncing").
				Value(&description),

			huh.NewInput().
				Title("Target directory").
				Description("Where to create the project").
				Placeholder(filepath.Join(home, "Kode", "<slug>")).
				Value(&targetDir),
		),

		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Stack").
				Description("Which framework to use").
				Options(
					huh.NewOption("Node.js (Next.js)", "node"),
					huh.NewOption("Rails", "rails"),
				).
				Value(&stack),

			huh.NewSelect[string]().
				Title("Database").
				Description("Default database engine").
				Options(
					huh.NewOption("SQLite (default, zero-config)", "sqlite"),
					huh.NewOption("PostgreSQL", "postgres"),
				).
				Value(&database),

			huh.NewSelect[string]().
				Title("Deploy target").
				Description("Where the Node stack will deploy (Rails always deploys to a Ruby host)").
				Options(
					huh.NewOption("Cloudflare Workers + D1 + R2 ($5/mo, unlimited workers)", "cloudflare"),
					huh.NewOption("Vercel + managed Postgres", "vercel"),
					huh.NewOption("Railway with built-in Postgres", "railway"),
					huh.NewOption("Other / pick later", "other"),
				).
				Value(&deployTarget),
		),
	)

	if err := form1.Run(); err != nil {
		return nil, err
	}

	// ── Form 2: features + ports (adapt to selected stack) ───────────────

	devPortPlaceholder := "3000"
	prodPortPlaceholder := "3006"
	if stack == "rails" {
		devPortPlaceholder = "3014"
		prodPortPlaceholder = "3014"
	}

	form2 := huh.NewForm(
		huh.NewGroup(
			huh.NewMultiSelect[string]().
				Title("Features").
				Description("Deselect features you don't need").
				Options(
					huh.NewOption("Auth (user accounts, login, signup, OAuth, 2FA)", "auth").Selected(true),
					huh.NewOption("Payments (Stripe checkout, subscriptions, billing portal)", "payments").Selected(true),
					huh.NewOption("Email (Resend — verification, password reset, welcome)", "email").Selected(true),
					huh.NewOption("Blog/CMS (MDX blog, changelog, RSS feed)", "blog").Selected(true),
					huh.NewOption("Webhooks (outgoing events with HMAC signing & retry)", "webhooks").Selected(true),
					huh.NewOption("Newsletter (subscriber signup & admin management)", "newsletter").Selected(true),
					huh.NewOption("Admin panel (user management, analytics, database browser)", "admin").Selected(true),
					huh.NewOption("AI Chatbot (Claude, voice I/O, file attachments, conversations)", "chatbot").Selected(true),
				).
				Value(&features),
		),

		huh.NewGroup(
			huh.NewInput().
				Title("Dev server port").
				Placeholder(devPortPlaceholder).
				Value(&devPort),

			huh.NewInput().
				Title("Production port").
				Placeholder(prodPortPlaceholder).
				Value(&prodPort),
		),
	)

	if err := form2.Run(); err != nil {
		return nil, err
	}

	// ── Derive defaults ──────────────────────────────────────────────────

	if appName == "" {
		return nil, fmt.Errorf("project name is required")
	}

	slug := config.Slugify(appName)

	if description == "" {
		description = fmt.Sprintf("A %s application", appName)
	}

	if targetDir == "" {
		targetDir = filepath.Join(home, "Kode", slug)
	}
	if len(targetDir) > 0 && targetDir[0] == '~' {
		targetDir = filepath.Join(home, targetDir[1:])
	}

	defaultDevPort := 3000
	defaultProdPort := 3006
	if stack == "rails" {
		defaultDevPort = 3014
		defaultProdPort = 3014
	}

	dp := defaultDevPort
	if devPort != "" {
		if v, err := strconv.Atoi(devPort); err == nil {
			dp = v
		}
	}

	pp := defaultProdPort
	if prodPort != "" {
		if v, err := strconv.Atoi(prodPort); err == nil {
			pp = v
		}
	}

	if stack == "" {
		stack = "node"
	}
	if database == "" {
		database = "sqlite"
	}
	if deployTarget == "" {
		deployTarget = "cloudflare"
	}

	// Convert feature strings to typed features
	selectedFeatures := make([]config.Feature, 0, len(features))
	for _, f := range features {
		selectedFeatures = append(selectedFeatures, config.Feature(f))
	}

	// Enforce dependencies: if auth is deselected, remove features that require it
	hasAuth := false
	for _, f := range selectedFeatures {
		if f == config.FeatureAuth {
			hasAuth = true
			break
		}
	}
	if !hasAuth {
		requiresAuth := make(map[config.Feature]bool)
		for _, f := range config.FeaturesRequiringAuth() {
			requiresAuth[f] = true
		}
		var filtered []config.Feature
		var removed []string
		for _, f := range selectedFeatures {
			if requiresAuth[f] {
				removed = append(removed, string(f))
			} else {
				filtered = append(filtered, f)
			}
		}
		selectedFeatures = filtered
		if len(removed) > 0 {
			fmt.Printf("\n  Note: %s removed (require auth)\n", strings.Join(removed, ", "))
		}
	}

	return &config.Project{
		AppName:      appName,
		Slug:         slug,
		ModuleName:   config.Pascalize(appName),
		Description:  description,
		TargetDir:    targetDir,
		DevPort:      dp,
		ProdPort:     pp,
		RailsDevPort: dp,
		Stack:        config.Stack(stack),
		Database:     config.DB(database),
		DeployTarget: config.DeployTarget(deployTarget),
		TemplatePath: templatePath,
		Features:     selectedFeatures,
	}, nil
}
