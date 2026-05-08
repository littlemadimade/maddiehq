package scaffold

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/marknutter/appseed/cli/internal/config"
)

// StripDeselectedFeatures removes files and cleans up code for features
// that the user chose not to include.
func StripDeselectedFeatures(p *config.Project) error {
	if !p.IncludesNode() {
		return nil // Only Node.js features are stripped for now
	}

	nodeDir := filepath.Join(p.TargetDir, "node")

	for _, feature := range config.AllFeatures() {
		if p.HasFeature(feature) {
			continue // Feature is included, skip
		}

		switch feature {
		case config.FeatureAuth:
			if err := stripAuth(nodeDir); err != nil {
				return fmt.Errorf("strip auth: %w", err)
			}
		case config.FeaturePayments:
			if err := stripPayments(nodeDir); err != nil {
				return fmt.Errorf("strip payments: %w", err)
			}
		case config.FeatureEmail:
			if err := stripEmail(nodeDir); err != nil {
				return fmt.Errorf("strip email: %w", err)
			}
		case config.FeatureBlog:
			if err := stripBlog(nodeDir); err != nil {
				return fmt.Errorf("strip blog: %w", err)
			}
		case config.FeatureWebhooks:
			if err := stripWebhooks(nodeDir); err != nil {
				return fmt.Errorf("strip webhooks: %w", err)
			}
		case config.FeatureNewsletter:
			if err := stripNewsletter(nodeDir); err != nil {
				return fmt.Errorf("strip newsletter: %w", err)
			}
		case config.FeatureAdmin:
			if err := stripAdmin(nodeDir); err != nil {
				return fmt.Errorf("strip admin: %w", err)
			}
		case config.FeatureChatbot:
			if err := stripChatbot(nodeDir); err != nil {
				return fmt.Errorf("strip chatbot: %w", err)
			}
		}
	}

	return nil
}

func stripAuth(nodeDir string) error {
	// Delete auth-related files
	deletePaths := []string{
		// Auth library & config
		"lib/auth.ts",
		"lib/auth-client.ts",

		// Auth API route (Better Auth catch-all)
		"app/api/auth",

		// Auth pages
		"app/(auth)",

		// Protected pages (require login)
		"app/(protected)",

		// Settings pages (account management)
		"app/api/settings/account",
		"app/api/settings/avatar",
		"app/api/settings/delete-account",
		"app/api/settings/export",

		// Middleware / proxy (session cookie check)
		"proxy.ts",
		"middleware.ts",

		// Items CRUD (user-scoped)
		"app/api/items",
		"lib/search.ts",

		// Files (user-scoped)
		"app/api/files",

		// Notifications (user-scoped)
		"app/api/notifications",
		"lib/notifications.ts",

		// Jobs system (depends on user context for most jobs)
		"app/api/admin/jobs",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove auth-related schema tables (Better Auth tables)
	for _, table := range []string{"user", "session", "account", "verification", "twoFactor"} {
		removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), table)
		removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), table)
		removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), table)
	}

	// Remove user-scoped app tables
	for _, table := range []string{"items", "files", "notifications"} {
		removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), table)
		removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), table)
		removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), table)
	}

	// Remove auth env vars from .env.example
	removeLineContaining(filepath.Join(nodeDir, ".env.example"),
		"BETTER_AUTH_SECRET", "BETTER_AUTH_URL")

	// Remove Better Auth packages from package.json
	removeLine(filepath.Join(nodeDir, "package.json"), "better-auth", "better-sqlite3", "@types/better-sqlite3")

	// Remove items migration + the search index that depends on it
	os.Remove(filepath.Join(nodeDir, "migrations/001_create_items.sql"))
	os.Remove(filepath.Join(nodeDir, "migrations/006_create_search_index.sql"))

	// Remove the auth-schema migration and the mode-annotated auth schema
	// (lib/schema.auth.ts is the boolean/timestamp-mode mirror used by
	// Better Auth's drizzleAdapter on D1). Both are no-ops without auth.
	os.Remove(filepath.Join(nodeDir, "migrations/000_better_auth_init.sql"))
	os.Remove(filepath.Join(nodeDir, "lib/schema.auth.ts"))

	return nil
}

func stripPayments(nodeDir string) error {
	// Delete Stripe files
	deletePaths := []string{
		"lib/stripe.ts",
		"app/api/stripe",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove plan override route (depends on payments)
	os.RemoveAll(filepath.Join(nodeDir, "app/api/admin/users/[id]/plan"))

	// Remove plan-override-form component
	os.Remove(filepath.Join(nodeDir, "components/admin/plan-override-form.tsx"))

	// Remove Stripe env vars from .env.example
	removeLineContaining(filepath.Join(nodeDir, ".env.example"),
		"STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_WEBHOOK_SECRET")

	// Remove planOverrides from schema files
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "planOverrides")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "planOverrides")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "planOverrides")

	// Remove stripe-related user fields from auth.ts additionalFields
	removeBlockBetween(filepath.Join(nodeDir, "lib/auth.ts"),
		"stripeCustomerId: {", "},", true)
	removeBlockBetween(filepath.Join(nodeDir, "lib/auth.ts"),
		"stripeSubscriptionId: {", "},", true)
	removeBlockBetween(filepath.Join(nodeDir, "lib/auth.ts"),
		"subscriptionStatus: {", "},", true)

	// Remove syncStripeStatus job from jobs/index.ts
	removeBlockBetween(filepath.Join(nodeDir, "jobs/index.ts"),
		"async function syncStripeStatus", "}", false)
	removeLine(filepath.Join(nodeDir, "jobs/index.ts"), "sync-stripe-status")

	return nil
}

func stripEmail(nodeDir string) error {
	// Delete email module
	os.Remove(filepath.Join(nodeDir, "lib/email.ts"))

	// Delete admin reset-pw route (sends email)
	os.RemoveAll(filepath.Join(nodeDir, "app/api/admin/users/[id]/reset-pw"))

	// Remove email imports and callbacks from auth.ts
	removeLine(filepath.Join(nodeDir, "lib/auth.ts"),
		"sendWelcomeEmail", "sendVerificationEmail", "sendPasswordResetEmail")

	// Remove Resend env var from .env.example
	removeLineContaining(filepath.Join(nodeDir, ".env.example"), "RESEND_API_KEY")

	return nil
}

func stripBlog(nodeDir string) error {
	deletePaths := []string{
		"lib/mdx.ts",
		"components/mdx-components.tsx",
		"components/admin/blog-editor.tsx",
		"app/blog",
		"app/changelog",
		"app/feed.xml",
		"app/api/admin/blog",
		"content/blog",
		"content/changelog",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove blogPosts from schema
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "blogPosts")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "blogPosts")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "blogPosts")

	// Remove blog-related packages from package.json
	removeLine(filepath.Join(nodeDir, "package.json"),
		"gray-matter", "next-mdx-remote", "reading-time", "remark", "remark-gfm", "remark-html")

	return nil
}

func stripWebhooks(nodeDir string) error {
	deletePaths := []string{
		"lib/webhooks.ts",
		"app/api/webhooks",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove webhook schema tables
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "webhooks")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "webhookDeliveries")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "webhooks")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "webhookDeliveries")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "webhooks")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "webhookDeliveries")

	// Remove deliver-webhook job handler from jobs/index.ts
	removeLine(filepath.Join(nodeDir, "jobs/index.ts"), "deliver-webhook", "deliverWebhook")

	// Delete webhook migration if it exists
	os.Remove(filepath.Join(nodeDir, "migrations/007_create_webhooks.sql"))

	return nil
}

func stripNewsletter(nodeDir string) error {
	deletePaths := []string{
		"app/api/subscribe",
		"app/api/admin/subscribers",
		"components/admin/subscriber-list.tsx",
		"components/landing/newsletter.tsx",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove newsletter schema table
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "newsletterSubscribers")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "newsletterSubscribers")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "newsletterSubscribers")

	return nil
}

func stripAdmin(nodeDir string) error {
	deletePaths := []string{
		"lib/admin.ts",
		"app/admin",
		"app/api/admin",
		"components/admin",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove admin schema tables
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.sqlite.ts"), "adminLogs")
	removeSchemaTable(filepath.Join(nodeDir, "lib/schema.pg.ts"), "adminLogs")
	removeSchemaExport(filepath.Join(nodeDir, "lib/schema.ts"), "adminLogs")

	// If payments is also excluded, planOverrides was already removed.
	// If payments is included but admin isn't, keep planOverrides (stripe status page uses it).

	return nil
}

func stripChatbot(nodeDir string) error {
	deletePaths := []string{
		"lib/chat-engine.ts",
		"lib/chat-config.ts",
		"lib/chat-tags.ts",
		"lib/voice.ts",
		"lib/use-voice.ts",
		"lib/document-parser.ts",
		"app/api/chat",
		"app/api/voice",
		"app/api/conversations",
		"app/app/chat",
		"components/chat-message.tsx",
		"migrations/011_create_conversations.sql",
	}

	for _, p := range deletePaths {
		os.RemoveAll(filepath.Join(nodeDir, p))
	}

	// Remove chat link from dashboard
	removeLineContaining(filepath.Join(nodeDir, "app/app/page.tsx"), "/app/chat", "MessageSquare")

	return nil
}

// removeLineContaining removes lines containing any of the given substrings.
func removeLineContaining(path string, substrs ...string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}

	lines := strings.Split(string(content), "\n")
	var result []string
	for _, line := range lines {
		keep := true
		for _, substr := range substrs {
			if strings.Contains(line, substr) {
				keep = false
				break
			}
		}
		if keep {
			result = append(result, line)
		}
	}

	os.WriteFile(path, []byte(strings.Join(result, "\n")), 0644)
}

// removeLine removes lines containing any of the given substrings.
func removeLine(path string, substrs ...string) {
	removeLineContaining(path, substrs...)
}

// removeSchemaTable removes a Drizzle table definition block from a schema file.
// Looks for `export const <name> = sqliteTable(` or `pgTable(` and removes until
// the matching `});` followed by a blank line.
func removeSchemaTable(path string, tableName string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}

	lines := strings.Split(string(content), "\n")
	var result []string
	skipping := false

	for _, line := range lines {
		if !skipping {
			// Check for start of table definition
			if strings.Contains(line, fmt.Sprintf("export const %s =", tableName)) {
				skipping = true
				continue
			}
			result = append(result, line)
		} else {
			// Look for end of table definition: `});`
			trimmed := strings.TrimSpace(line)
			if trimmed == "});" {
				skipping = false
				// Skip the closing line and any following blank line
				continue
			}
		}
	}

	os.WriteFile(path, []byte(strings.Join(result, "\n")), 0644)
}

// removeSchemaExport removes a single `export const <name> = mod.<name>;` line
// from the schema barrel file.
func removeSchemaExport(path string, name string) {
	removeLineContaining(path, fmt.Sprintf("export const %s", name))
}

// removeBlockBetween removes a block of code starting with startMarker
// and ending with endMarker. If inclusive is true, removes the markers too.
func removeBlockBetween(path string, startMarker, endMarker string, inclusive bool) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}

	lines := strings.Split(string(content), "\n")
	var result []string
	skipping := false
	braceDepth := 0

	for _, line := range lines {
		if !skipping {
			if strings.Contains(line, startMarker) {
				skipping = true
				braceDepth = strings.Count(line, "{") - strings.Count(line, "}")
				if !inclusive {
					// For function blocks, just skip until closing brace at depth 0
				}
				continue
			}
			result = append(result, line)
		} else {
			braceDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if inclusive {
				// For config blocks (like additionalFields entries), look for endMarker
				if strings.Contains(strings.TrimSpace(line), endMarker) {
					skipping = false
					continue
				}
			} else {
				// For function blocks, track brace depth
				if braceDepth <= 0 {
					skipping = false
					continue
				}
			}
		}
	}

	os.WriteFile(path, []byte(strings.Join(result, "\n")), 0644)
}
