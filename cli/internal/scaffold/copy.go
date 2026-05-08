package scaffold

import (
	"fmt"
	"os/exec"

	"github.com/marknutter/appseed/cli/internal/config"
)

// CopyTemplate copies the AppSeed template to the target directory using rsync.
func CopyTemplate(p *config.Project) error {
	args := []string{
		"-a",
		"--exclude=.git",
		"--exclude=node_modules",
		"--exclude=.next",
		"--exclude=data/",
		"--exclude=.env.local",
		"--exclude=.env",
		"--exclude=qa/",
		"--exclude=cli/",           // Don't copy the CLI itself into new projects
		"--exclude=*.sqlite3",      // Don't copy template databases
		"--exclude=*.sqlite3-*",    // Don't copy WAL/SHM files
		"--exclude=storage/",       // Rails storage dir (databases, cache)
		"--exclude=log/",           // Rails log files
		"--exclude=tmp/",           // Rails temp files
	}

	switch p.Stack {
	case config.StackNode:
		args = append(args, "--exclude=rails/")
	case config.StackRails:
		args = append(args, "--exclude=node/")
	}

	// Ensure trailing slash on source for rsync content copy
	src := p.TemplatePath
	if src[len(src)-1] != '/' {
		src += "/"
	}

	args = append(args, src, p.TargetDir+"/")

	cmd := exec.Command("rsync", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("rsync failed: %w\n%s", err, output)
	}

	return nil
}
