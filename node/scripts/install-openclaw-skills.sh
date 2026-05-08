#!/usr/bin/env bash
#
# Install AppSeed OpenClaw skills globally into ~/.openclaw/skills/
# Idempotent — safe to re-run.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_SRC="$REPO_DIR/.openclaw/skills"
SKILLS_DEST="$HOME/.openclaw/skills"

# Verify source skills exist
if [ ! -d "$SKILLS_SRC" ]; then
  echo "Error: OpenClaw skills not found at $SKILLS_SRC"
  echo "Make sure you're running this from the AppSeed repository."
  exit 1
fi

# Create destination if needed
mkdir -p "$SKILLS_DEST"

# Copy each skill
for skill_dir in "$SKILLS_SRC"/*/; do
  skill_name="$(basename "$skill_dir")"
  echo "Installing $skill_name..."
  mkdir -p "$SKILLS_DEST/$skill_name"
  cp -f "$skill_dir"SKILL.md "$SKILLS_DEST/$skill_name/SKILL.md"
done

echo ""
echo "OpenClaw skills installed to $SKILLS_DEST:"
ls -1 "$SKILLS_DEST"
echo ""
echo "Done. Your OpenClaw bot can now use /appseed-create, /appseed-sync, and /configure-sso."
