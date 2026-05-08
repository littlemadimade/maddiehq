package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var version = "dev"

var rootCmd = &cobra.Command{
	Use:   "appseed",
	Short: "AppSeed CLI — scaffold production-ready web applications",
	Long: `AppSeed CLI scaffolds production-ready web applications from the AppSeed
template. Choose Node.js (Next.js) or Rails, pick your features, and get
a fully configured project with auth, payments, email, admin panel, and more.

Single binary, no runtime dependencies. Works with AI agents via flags
or interactively via TUI.

Quick start:
  appseed create                              Interactive mode (TUI)
  appseed create --name MyApp --stack node    Non-interactive with flags

Documentation:
  appseed create --help                       Full flag reference
  appseed features                            List available features
  appseed stacks                              List available stacks`,
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the CLI version",
	Long: `Print the current version of the AppSeed CLI.

Use this to verify which version is installed, or to check compatibility
with the AppSeed template.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("appseed %s\n", version)
	},
}

var featuresCmd = &cobra.Command{
	Use:   "features",
	Short: "List all available features and their descriptions",
	Long: `List all optional features that can be included when creating a new project.

Each feature can be toggled on or off via the --features flag on 'appseed create'.
Auth is optional — deselecting it automatically removes features that depend on
user accounts (payments, email, webhooks, admin).

Features are passed as a comma-separated list:
  appseed create --name MyApp --features auth,payments,blog

Use "all" to include everything (default):
  appseed create --name MyApp --features all

Use "none" for a bare app with no optional features:
  appseed create --name MyApp --features none`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println()
		fmt.Println("Available features:")
		fmt.Println()
		fmt.Println("  auth         User accounts, login/signup, OAuth (Google, GitHub, Apple,")
		fmt.Println("               Facebook, Microsoft), two-factor authentication, sessions.")
		fmt.Println("               Most other features depend on this.")
		fmt.Println()
		fmt.Println("  payments     Stripe integration — checkout sessions, subscription management,")
		fmt.Println("               billing portal, webhook handling, plan upgrades/downgrades.")
		fmt.Println("               Requires: auth")
		fmt.Println()
		fmt.Println("  email        Transactional email via Resend — verification emails, password")
		fmt.Println("               reset, welcome emails, subscription confirmations.")
		fmt.Println("               Requires: auth")
		fmt.Println()
		fmt.Println("  blog         MDX-powered blog and changelog — content in markdown files,")
		fmt.Println("               RSS feed, SEO metadata, admin editor for database-backed posts.")
		fmt.Println()
		fmt.Println("  webhooks     Outgoing webhook system — HMAC-SHA256 signed payloads, automatic")
		fmt.Println("               retry with exponential backoff, delivery tracking, test pings.")
		fmt.Println("               Requires: auth")
		fmt.Println()
		fmt.Println("  newsletter   Email newsletter — public signup form, subscriber management,")
		fmt.Println("               admin list view. Standalone (works without auth).")
		fmt.Println()
		fmt.Println("  admin        Admin panel — user management, analytics dashboard (growth,")
		fmt.Println("               revenue, product metrics), database browser, audit logs,")
		fmt.Println("               blog editor, subscriber management.")
		fmt.Println("               Requires: auth")
		fmt.Println()
		fmt.Println("  chatbot      AI chatbot with voice support, streaming responses,")
		fmt.Println("               conversation history, and file attachments. Uses Anthropic")
		fmt.Println("               Claude. Voice output optional (requires ELEVENLABS_API_KEY).")
		fmt.Println("               Requires: ANTHROPIC_API_KEY")
		fmt.Println()
		fmt.Println("Dependency rules:")
		fmt.Println("  Deselecting 'auth' automatically removes: payments, email, webhooks, admin")
		fmt.Println("  'blog' and 'newsletter' work independently of auth")
		fmt.Println()
		fmt.Println("Defaults:")
		fmt.Println("  --features all     Include everything (default)")
		fmt.Println("  --features none    Bare app, no optional features")
		fmt.Println()
	},
}

var stacksCmd = &cobra.Command{
	Use:   "stacks",
	Short: "List available technology stacks",
	Long: `List the technology stacks available when creating a new project.

Each project uses one stack. The stack determines which framework,
ORM, auth system, and deployment configuration is used.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println()
		fmt.Println("Available stacks:")
		fmt.Println()
		fmt.Println("  node    Next.js 16 + TypeScript + Drizzle ORM + Better Auth")
		fmt.Println("          SQLite (default) or PostgreSQL via DATABASE_URL")
		fmt.Println("          Tailwind CSS 4, React 19, Turbopack")
		fmt.Println("          Default ports: dev 3000, prod 3006")
		fmt.Println()
		fmt.Println("  rails   Ruby on Rails 8 + SQLite + Devise + Hotwire")
		fmt.Println("          Stimulus controllers, Turbo, Tailwind CSS")
		fmt.Println("          Default ports: dev 3014, prod 3014")
		fmt.Println()
		fmt.Println("Both stacks include:")
		fmt.Println("  - Docker (dev + prod + Litestream backup)")
		fmt.Println("  - Landing page with pricing, features, testimonials, FAQ")
		fmt.Println("  - Dark mode with cookie-persisted theme")
		fmt.Println("  - Stripe payments integration")
		fmt.Println("  - OAuth (Google, GitHub, Apple, Facebook, Microsoft)")
		fmt.Println("  - Admin panel with analytics")
		fmt.Println()
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(featuresCmd)
	rootCmd.AddCommand(stacksCmd)
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
