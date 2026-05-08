package scaffold

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/marknutter/appseed/cli/internal/config"
)

// InstallAndVerify runs npm install, db:migrate, and npm run build for Node.js,
// and bundle install + db:migrate for Rails.
func InstallAndVerify(p *config.Project) error {
	if p.IncludesNode() {
		nodeDir := filepath.Join(p.TargetDir, "node")

		steps := []struct {
			name string
			cmd  string
			args []string
		}{
			{"Installing Node.js dependencies", "npm", []string{"install"}},
			{"Running database migrations", "npm", []string{"run", "db:migrate"}},
			{"Verifying Vercel/Node build", "npm", []string{"run", "build"}},
		}

		// Cloudflare deploys go through a different bundler (OpenNext) with
		// stricter constraints than `next build`. Run an extra verification
		// step so issues surface during scaffold rather than at first deploy.
		if p.DeployTarget == config.DeployCloudflare {
			steps = append(steps, struct {
				name string
				cmd  string
				args []string
			}{"Verifying Cloudflare Workers build", "npm", []string{"run", "build:cf"}})
		}

		for _, step := range steps {
			fmt.Printf("  %s...\n", step.name)
			cmd := exec.Command(step.cmd, step.args...)
			cmd.Dir = nodeDir
			cmd.Stdout = nil // Suppress stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("%s failed: %w", step.name, err)
			}
		}
	}

	if p.IncludesRails() {
		railsDir := filepath.Join(p.TargetDir, "rails")
		if fileExists(railsDir) {
			steps := []struct {
				name string
				cmd  string
				args []string
			}{
				{"Installing Ruby dependencies", "bundle", []string{"install"}},
				{"Running Rails migrations", "bin/rails", []string{"db:migrate"}},
			}

			for _, step := range steps {
				fmt.Printf("  %s...\n", step.name)
				cmd := exec.Command(step.cmd, step.args...)
				cmd.Dir = railsDir
				cmd.Stdout = nil
				cmd.Stderr = os.Stderr
				if err := cmd.Run(); err != nil {
					return fmt.Errorf("%s failed: %w", step.name, err)
				}
			}
		}
	}

	return nil
}

// GitInit initializes a fresh git repository in the target directory.
func GitInit(p *config.Project) error {
	// Ensure .env.local is in .gitignore
	gitignore := filepath.Join(p.TargetDir, ".gitignore")
	if fileExists(gitignore) {
		content, err := os.ReadFile(gitignore)
		if err == nil {
			s := string(content)
			if !contains(s, ".env.local") {
				s += "\n.env.local\n"
				os.WriteFile(gitignore, []byte(s), 0644)
			}
		}
	}

	cmds := []struct {
		name string
		args []string
	}{
		{"git init", []string{"init"}},
		{"git add", []string{"add", "-A"}},
		{"git commit", []string{"commit", "-m", "Initial project from AppSeed template"}},
	}

	for _, c := range cmds {
		cmd := exec.Command("git", c.args...)
		cmd.Dir = p.TargetDir
		cmd.Stdout = nil
		cmd.Stderr = nil
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("%s failed: %w", c.name, err)
		}
	}

	return nil
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsString(s, substr))
}

func containsString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
