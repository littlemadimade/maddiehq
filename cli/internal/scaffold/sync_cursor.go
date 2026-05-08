package scaffold

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/marknutter/appseed/cli/internal/config"
)

// WriteSyncCursor creates a .appseed-sync-cursor file in the new project.
// This records the template commit hash and date so that AI agents and the
// appseed-sync skill know exactly which changelog entries are newer than
// the project's creation point.
//
// It also:
// - Copies the update check script
// - Generates Claude Code hook config for auto-update checks
// - Adds AppSeed update instructions to the project's CLAUDE.md
func WriteSyncCursor(p *config.Project) error {
	commitHash := getTemplateCommitHash(p.TemplatePath)
	date := time.Now().UTC().Format("2006-01-02")

	// 1. Write sync cursor
	cursorContent := fmt.Sprintf(`# AppSeed Sync Cursor
# This file records when this project was created from the AppSeed template.
# AI agents and the /appseed-sync skill use this to determine which
# changelog entries are newer and should be considered for syncing.
#
# Do not delete this file. Update it after syncing to track your position.

created_from_commit: %s
created_at: %s
last_synced_at: %s
`, commitHash, date, date)

	cursorPath := filepath.Join(p.TargetDir, ".appseed-sync-cursor")
	if err := os.WriteFile(cursorPath, []byte(cursorContent), 0644); err != nil {
		return err
	}

	// 2. Copy the update check script
	if err := copyUpdateCheckScript(p); err != nil {
		// Non-fatal — the script is a convenience, not required
		fmt.Printf("  (skipped update check script: %v)\n", err)
	}

	// 3. Generate Claude Code hook config
	if err := writeClaudeHookConfig(p); err != nil {
		fmt.Printf("  (skipped Claude Code hook: %v)\n", err)
	}

	// 4. Append AppSeed update instructions to CLAUDE.md
	if err := appendUpdateInstructions(p); err != nil {
		fmt.Printf("  (skipped CLAUDE.md update instructions: %v)\n", err)
	}

	return nil
}

func getTemplateCommitHash(templatePath string) string {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = templatePath
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}

func copyUpdateCheckScript(p *config.Project) error {
	src := filepath.Join(p.TemplatePath, "scripts", "check-appseed-updates.sh")
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	scriptsDir := filepath.Join(p.TargetDir, "scripts")
	if err := os.MkdirAll(scriptsDir, 0755); err != nil {
		return err
	}

	dst := filepath.Join(scriptsDir, "check-appseed-updates.sh")
	return os.WriteFile(dst, data, 0755)
}

func writeClaudeHookConfig(p *config.Project) error {
	claudeDir := filepath.Join(p.TargetDir, ".claude")
	if err := os.MkdirAll(claudeDir, 0755); err != nil {
		return err
	}

	// Write project-level settings with the update check hook
	settingsContent := `{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "bash scripts/check-appseed-updates.sh 2>/dev/null || true"
      }
    ]
  }
}
`
	settingsPath := filepath.Join(claudeDir, "settings.json")

	// Don't overwrite if it already exists
	if _, err := os.Stat(settingsPath); err == nil {
		return nil
	}

	return os.WriteFile(settingsPath, []byte(settingsContent), 0644)
}

func appendUpdateInstructions(p *config.Project) error {
	claudeMdPath := filepath.Join(p.TargetDir, "CLAUDE.md")

	// Read existing content
	existing, err := os.ReadFile(claudeMdPath)
	if err != nil {
		// No CLAUDE.md exists — create one with just the update section
		existing = []byte(fmt.Sprintf("# CLAUDE.md — %s\n\n", p.AppName))
	}

	instructions := `
## AppSeed Updates

This project was created from the [AppSeed](https://github.com/marknutter/appseed) template.
The ` + "`.appseed-sync-cursor`" + ` file tracks which template version this project is based on.

**Automatic checks:** A Claude Code hook runs on each prompt to check for updates.
If updates are available, you'll see a message suggesting ` + "`/appseed-sync`" + `.

**For any AI agent (Cursor, Windsurf, Copilot, etc.):** On first interaction each session,
check if ` + "`.appseed-sync-cursor`" + ` exists. If it does, look for the AppSeed repo at
` + "`~/Kode/appseed`" + ` and read its ` + "`changelogs/`" + ` directory. Compare entry dates against
the ` + "`last_synced_at`" + ` value in the cursor file. If newer entries exist that match this
project's stack, mention them to the user. Never auto-apply changes — always present
a checklist and wait for confirmation.
`

	content := string(existing) + instructions
	return os.WriteFile(claudeMdPath, []byte(content), 0644)
}
