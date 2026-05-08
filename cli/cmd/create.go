package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/marknutter/appseed/cli/internal/config"
	"github.com/marknutter/appseed/cli/internal/scaffold"
	"github.com/marknutter/appseed/cli/internal/tui"
	"github.com/spf13/cobra"
)

var (
	successStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Bold(true)
	errorStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Bold(true)
	dimStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("240"))
	brandStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("212")).Bold(true)
)

// Flag variables
var (
	flagName         string
	flagDescription  string
	flagDir          string
	flagStack        string
	flagDatabase     string
	flagDeployTarget string
	flagFeatures     string
	flagDevPort      int
	flagProdPort     int
	flagTemplatePath string
	flagNoInstall    bool
	flagNoGit        bool
	flagStart        bool
)

var createCmd = &cobra.Command{
	Use:   "create [--name NAME]",
	Short: "Create a new project from the AppSeed template",
	Long: `Scaffold a new project from the AppSeed template.

INTERACTIVE MODE (default):
  When run without flags, presents a TUI form to collect project details.
  Requires a terminal with cursor control (not suitable for CI or AI agents).

    appseed create

NON-INTERACTIVE MODE:
  Pass --name (required) and any other flags to skip the TUI entirely.
  All unspecified options use sensible defaults. Suitable for scripts,
  CI pipelines, and AI agents.

    appseed create --name Moxmo --stack node
    appseed create --name Moxmo --stack rails --database postgres
    appseed create --name Moxmo --features auth,payments,blog --dev-port 4000

WHAT IT DOES:
  1. Copies the AppSeed template (respecting stack selection)
  2. Generates a stack-specific docker-compose.yml
  3. Strips files for deselected features (schema, routes, components)
  4. Customizes branding — replaces "AppSeed" with your project name
  5. Generates .env files with cryptographic secrets
  6. Installs dependencies and runs database migrations
  7. Verifies the build compiles cleanly
  8. Initializes a git repository with initial commit

FEATURE SELECTION:
  Features are comma-separated. Use "all" (default) or "none".
  See 'appseed features' for the full list with descriptions.

    --features all                     Everything (default)
    --features auth,payments,blog      Specific features
    --features none                    Bare app, no optional features

  Deselecting "auth" automatically removes features that require user
  accounts: payments, email, webhooks, admin.

EXAMPLES:
  # Interactive TUI
  appseed create

  # Minimal Node.js app with auth only
  appseed create --name MyApp --stack node --features auth

  # Full Rails app with everything
  appseed create --name MyApp --stack rails --features all

  # Node.js app, PostgreSQL, custom ports, no blog
  appseed create \
    --name MyApp \
    --description "Project management for teams" \
    --stack node \
    --database postgres \
    --features auth,payments,email,webhooks,admin \
    --dev-port 4000 \
    --prod-port 4006

  # Bare static site — no auth, no features
  appseed create --name LandingPage --stack node --features none

  # Skip install and git init (useful for debugging)
  appseed create --name MyApp --no-install --no-git`,
	RunE: runCreate,
}

func init() {
	f := createCmd.Flags()

	f.StringVar(&flagName, "name", "", "Project display name (e.g. \"Moxmo\"). Required for non-interactive mode.")
	f.StringVar(&flagDescription, "description", "", "One-line description of what the app does.\nDefaults to \"A <name> application\".")
	f.StringVar(&flagDir, "dir", "", "Parent directory for the new project. Defaults to ~/Kode.\nProject is created in <dir>/<slug> where slug is the kebab-case name.")
	f.StringVar(&flagStack, "stack", "", "Technology stack: \"node\" or \"rails\".\nSee 'appseed stacks' for details. (default \"node\")")
	f.StringVar(&flagDatabase, "database", "", "Database engine: \"sqlite\" or \"postgres\".\nSQLite is zero-config; PostgreSQL requires DATABASE_URL. (default \"sqlite\")")
	f.StringVar(&flagDeployTarget, "deploy-target", "", "Primary deploy target for the Node stack:\n\"cloudflare\", \"vercel\", \"railway\", or \"other\".\nDrives wrangler.toml customization and Next-Steps output. (default \"cloudflare\")")
	f.StringVar(&flagFeatures, "features", "", "Comma-separated list of features to include.\nUse \"all\" for everything, \"none\" for bare app.\nSee 'appseed features' for the full list. (default \"all\")")
	f.IntVar(&flagDevPort, "dev-port", 0, "Development server port.\nNode.js default: 3000, Rails default: 3014.")
	f.IntVar(&flagProdPort, "prod-port", 0, "Production server port.\nNode.js default: 3006, Rails default: 3014.")
	f.StringVar(&flagTemplatePath, "template-path", "", "Path to the AppSeed template repository.\nAutodetected from ~/Kode/appseed, ~/code/appseed, etc.")
	f.BoolVar(&flagNoInstall, "no-install", false, "Skip dependency installation and build verification.\nUseful for debugging or when dependencies aren't available.")
	f.BoolVar(&flagNoGit, "no-git", false, "Skip git init and initial commit.")
	f.BoolVar(&flagStart, "start", false, "Start the Docker dev container after scaffolding.\nRuns 'docker compose --profile dev up --build'.")

	rootCmd.AddCommand(createCmd)
}

func runCreate(cmd *cobra.Command, args []string) error {
	fmt.Println()
	fmt.Println(brandStyle.Render("  AppSeed") + dimStyle.Render(" — project scaffolding"))
	fmt.Println()

	// Find template
	templatePath := flagTemplatePath
	if templatePath == "" {
		var err error
		templatePath, err = config.FindTemplate()
		if err != nil {
			return fmt.Errorf("cannot find AppSeed template: %w\nSpecify with --template-path", err)
		}
	}

	var project *config.Project

	if flagName != "" {
		// Non-interactive mode — build config from flags
		var err error
		project, err = projectFromFlags(templatePath)
		if err != nil {
			return err
		}
	} else {
		// Interactive mode — run TUI form
		var err error
		project, err = tui.RunForm(templatePath)
		if err != nil {
			return err
		}
	}

	// Validate target doesn't exist
	if _, err := os.Stat(project.TargetDir); err == nil {
		return fmt.Errorf("target directory already exists: %s\nRemove it first or choose a different --dir", project.TargetDir)
	}

	fmt.Println()
	fmt.Printf("  Creating %s...\n", brandStyle.Render(project.AppName))
	fmt.Println()

	// Step 1: Copy template
	step("Copying template")
	if err := scaffold.CopyTemplate(project); err != nil {
		return fail("Copy template", err)
	}
	done()

	// Step 2: Generate stack-specific docker-compose.yml
	step("Generating docker-compose.yml")
	if err := scaffold.GenerateDockerCompose(project); err != nil {
		return fail("Docker compose", err)
	}
	done()

	// Step 3: Strip deselected features
	step("Stripping deselected features")
	if err := scaffold.StripDeselectedFeatures(project); err != nil {
		return fail("Strip features", err)
	}
	done()

	// Step 4: Customize branding & config
	step("Customizing branding & config")
	if err := scaffold.CustomizeProject(project); err != nil {
		return fail("Customize", err)
	}
	done()

	// Step 5: Generate env files
	step("Generating .env files with secrets")
	if err := scaffold.GenerateEnvFiles(project); err != nil {
		return fail("Generate env", err)
	}
	done()

	// Step 6: Install & verify
	if !flagNoInstall {
		if project.IncludesNode() {
			step("Installing & building Node.js")
			if err := scaffold.InstallAndVerify(project); err != nil {
				return fail("Install & verify", err)
			}
			done()
		}
		if project.IncludesRails() {
			step("Installing & building Rails")
			if err := scaffold.InstallAndVerify(project); err != nil {
				return fail("Install & verify", err)
			}
			done()
		}
	}

	// Step 7: Git init
	if !flagNoGit {
		step("Initializing git repository")
		if err := scaffold.GitInit(project); err != nil {
			return fail("Git init", err)
		}
		done()
	}

	// Step 8: Write sync cursor so agents know when this project was created
	step("Writing sync cursor")
	if err := scaffold.WriteSyncCursor(project); err != nil {
		return fail("Write sync cursor", err)
	}
	done()

	// Summary
	printSummary(project)

	// Step 9: Optionally start the dev container
	shouldStart := flagStart
	if !shouldStart && flagName == "" {
		// Interactive mode — ask the user
		shouldStart = askStartContainer()
	}
	if shouldStart {
		return startDevContainer(project)
	}

	return nil
}

// projectFromFlags builds a Project config from CLI flags (non-interactive mode).
func projectFromFlags(templatePath string) (*config.Project, error) {
	home, _ := os.UserHomeDir()

	slug := config.Slugify(flagName)
	if slug == "" {
		return nil, fmt.Errorf("--name is required and must contain alphanumeric characters")
	}

	description := flagDescription
	if description == "" {
		description = fmt.Sprintf("A %s application", flagName)
	}

	dir := flagDir
	if dir == "" {
		dir = filepath.Join(home, "Kode", slug)
	} else {
		if len(dir) > 0 && dir[0] == '~' {
			dir = filepath.Join(home, dir[1:])
		}
		// --dir is the parent directory; append the project slug
		dir = filepath.Join(dir, slug)
	}

	stack := config.StackNode
	if flagStack == "rails" {
		stack = config.StackRails
	}

	database := config.DBSQLite
	if flagDatabase == "postgres" {
		database = config.DBPostgres
	}

	deployTarget := config.DeployCloudflare
	switch flagDeployTarget {
	case "vercel":
		deployTarget = config.DeployVercel
	case "railway":
		deployTarget = config.DeployRailway
	case "other":
		deployTarget = config.DeployOther
	case "", "cloudflare":
		deployTarget = config.DeployCloudflare
	default:
		return nil, fmt.Errorf("--deploy-target must be one of: cloudflare, vercel, railway, other (got %q)", flagDeployTarget)
	}

	// Parse features
	features := parseFeatures(flagFeatures, stack)

	// Port defaults
	devPort := flagDevPort
	if devPort == 0 {
		if stack == config.StackRails {
			devPort = 3014
		} else {
			devPort = 3000
		}
	}

	prodPort := flagProdPort
	if prodPort == 0 {
		if stack == config.StackRails {
			prodPort = 3014
		} else {
			prodPort = 3006
		}
	}

	return &config.Project{
		AppName:      flagName,
		Slug:         slug,
		ModuleName:   config.Pascalize(flagName),
		Description:  description,
		TargetDir:    dir,
		DevPort:      devPort,
		ProdPort:     prodPort,
		RailsDevPort: devPort,
		Stack:        stack,
		Database:     database,
		DeployTarget: deployTarget,
		TemplatePath: templatePath,
		Features:     features,
	}, nil
}

// parseFeatures interprets the --features flag value into a feature list.
func parseFeatures(flagVal string, stack config.Stack) []config.Feature {
	// Default: all features
	if flagVal == "" || flagVal == "all" {
		return config.AllFeatures()
	}

	// None: empty list
	if flagVal == "none" {
		return []config.Feature{}
	}

	// Parse comma-separated list
	parts := strings.Split(flagVal, ",")
	selected := make(map[config.Feature]bool)
	for _, p := range parts {
		f := config.Feature(strings.TrimSpace(p))
		selected[f] = true
	}

	// Build ordered list
	var features []config.Feature
	for _, f := range config.AllFeatures() {
		if selected[f] {
			features = append(features, f)
		}
	}

	// Enforce auth dependency cascade
	if !selected[config.FeatureAuth] {
		var filtered []config.Feature
		requiresAuth := make(map[config.Feature]bool)
		for _, f := range config.FeaturesRequiringAuth() {
			requiresAuth[f] = true
		}
		for _, f := range features {
			if !requiresAuth[f] {
				filtered = append(filtered, f)
			}
		}
		features = filtered
	}

	return features
}

func step(msg string) {
	fmt.Printf("  %s %s", dimStyle.Render("○"), msg)
}

func done() {
	fmt.Printf("\r  %s\n", successStyle.Render("✓"))
}

func fail(name string, err error) error {
	fmt.Printf("\r  %s\n", errorStyle.Render("✗"))
	return fmt.Errorf("%s: %w", name, err)
}

func printSummary(p *config.Project) {
	fmt.Println()
	fmt.Println(successStyle.Render("  Your project is ready!"))
	fmt.Println()
	fmt.Printf("  %-14s %s\n", "Project:", brandStyle.Render(p.AppName))
	fmt.Printf("  %-14s %s\n", "Location:", p.TargetDir)
	fmt.Printf("  %-14s %s\n", "Stack:", string(p.Stack))
	fmt.Printf("  %-14s %s\n", "Database:", string(p.Database))
	if p.IncludesNode() && p.DeployTarget != "" {
		fmt.Printf("  %-14s %s\n", "Deploy target:", string(p.DeployTarget))
	}

	// Show features
	featureNames := make([]string, 0, len(p.Features))
	for _, f := range p.Features {
		featureNames = append(featureNames, string(f))
	}
	if len(featureNames) == len(config.AllFeatures()) {
		fmt.Printf("  %-12s %s\n", "Features:", "all")
	} else if len(featureNames) > 0 {
		fmt.Printf("  %-12s %s\n", "Features:", strings.Join(featureNames, ", "))
	} else {
		fmt.Printf("  %-12s %s\n", "Features:", "none")
	}
	fmt.Println()

	if p.IncludesNode() {
		fmt.Printf("  %s  cd %s/node && npm run dev\n", dimStyle.Render("Local:  "), p.TargetDir)
		fmt.Printf("  %s  http://localhost:%s\n", dimStyle.Render("        "), strconv.Itoa(p.DevPort))
	}
	if p.IncludesRails() {
		fmt.Printf("  %s  cd %s/rails && bin/rails server\n", dimStyle.Render("Local:  "), p.TargetDir)
		fmt.Printf("  %s  http://localhost:%s\n", dimStyle.Render("        "), strconv.Itoa(p.DevPort))
	}
	fmt.Printf("  %s  cd %s && docker compose --profile dev up\n", dimStyle.Render("Docker: "), p.TargetDir)

	fmt.Println()
	printNextSteps(p)
	fmt.Println()
}

// printNextSteps emits a deploy-target-aware Next-Steps block. The Cloudflare
// block enumerates the wrangler login → d1 create → R2 enable → bucket create
// → secret put → migrations apply → deploy:cf sequence inline so the operator
// has it without context-switching to the README.
func printNextSteps(p *config.Project) {
	fmt.Println(dimStyle.Render("  Next steps:"))
	fmt.Println(dimStyle.Render("    1. Start the dev server (above)"))
	if p.HasFeature(config.FeatureAuth) {
		fmt.Println(dimStyle.Render("    2. Sign up at /auth — verifies the local DB + auth flow"))
	}

	// Deploy target only matters when Node is in the stack.
	if !p.IncludesNode() {
		return
	}

	switch p.DeployTarget {
	case config.DeployCloudflare:
		fmt.Println(dimStyle.Render("    3. When ready to deploy to Cloudflare:"))
		fmt.Println(dimStyle.Render("         a. cd node && npx wrangler login"))
		fmt.Println(dimStyle.Render(fmt.Sprintf("         b. npx wrangler d1 create %s-db", p.Slug)))
		fmt.Println(dimStyle.Render("            → copy database_id into wrangler.toml"))
		fmt.Println(dimStyle.Render("         c. (one-time) Enable R2 in CF dashboard"))
		fmt.Println(dimStyle.Render(fmt.Sprintf("         d. npx wrangler r2 bucket create %s-storage", p.Slug)))
		fmt.Println(dimStyle.Render("         e. openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET"))
		fmt.Println(dimStyle.Render(fmt.Sprintf("         f. npx wrangler d1 migrations apply %s-db --remote", p.Slug)))
		fmt.Println(dimStyle.Render("         g. npm run deploy:cf"))
		if p.HasFeature(config.FeaturePayments) || p.HasFeature(config.FeatureEmail) {
			fmt.Println(dimStyle.Render("    4. Add feature secrets via wrangler secret put:"))
			if p.HasFeature(config.FeaturePayments) {
				fmt.Println(dimStyle.Render("         STRIPE_SECRET_KEY, STRIPE_PRICE_ID"))
			}
			if p.HasFeature(config.FeatureEmail) {
				fmt.Println(dimStyle.Render("         RESEND_API_KEY, EMAIL_FROM"))
			}
		}
		fmt.Println(dimStyle.Render("    Full runbook: README \"Cloudflare Workers Deploy\" section"))

	case config.DeployVercel:
		fmt.Println(dimStyle.Render("    3. Connect this repo to Vercel: https://vercel.com/new"))
		fmt.Println(dimStyle.Render("    4. Pick a managed Postgres (Neon / Supabase / Vercel Postgres)"))
		fmt.Println(dimStyle.Render("       and set DATABASE_URL in Vercel env"))
		fmt.Println(dimStyle.Render("    5. Set Vercel env: BETTER_AUTH_SECRET, BETTER_AUTH_URL,"))
		fmt.Println(dimStyle.Render("       plus feature secrets (STRIPE_SECRET_KEY, RESEND_API_KEY, etc.)"))
		fmt.Println(dimStyle.Render("    6. Push to deploy"))

	case config.DeployRailway:
		fmt.Println(dimStyle.Render("    3. railway init / railway link in this directory"))
		fmt.Println(dimStyle.Render("    4. railway add postgres → DATABASE_URL is wired automatically"))
		fmt.Println(dimStyle.Render("    5. railway variables set BETTER_AUTH_SECRET=$(openssl rand -base64 32)"))
		fmt.Println(dimStyle.Render("       plus BETTER_AUTH_URL and feature secrets"))
		fmt.Println(dimStyle.Render("    6. railway up to deploy"))

	case config.DeployOther:
		fmt.Println(dimStyle.Render("    3. Pick a deploy target — the codebase supports all three out of the box:"))
		fmt.Println(dimStyle.Render("         - Cloudflare Workers + D1 (README runbook; cheapest at scale)"))
		fmt.Println(dimStyle.Render("         - Vercel + managed Postgres (set DATABASE_URL)"))
		fmt.Println(dimStyle.Render("         - Railway / Fly / any Node host (set DATABASE_URL or DATABASE_PATH)"))
		fmt.Println(dimStyle.Render("       The dialect resolver in lib/db.ts picks SQLite/PG/D1 from env at runtime."))
	}

	if p.HasFeature(config.FeatureAuth) {
		fmt.Println(dimStyle.Render("    Configure OAuth providers post-deploy: /configure-sso"))
	}
}

func askStartContainer() bool {
	var start bool
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewConfirm().
				Title("Start the dev container now?").
				Value(&start),
		),
	)
	if err := form.Run(); err != nil {
		return false
	}
	return start
}

func startDevContainer(p *config.Project) error {
	fmt.Println()
	fmt.Println(brandStyle.Render("  Starting dev container..."))
	fmt.Println()

	cmd := exec.Command("docker", "compose", "--profile", "dev", "up", "--build")
	cmd.Dir = p.TargetDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	return cmd.Run()
}
