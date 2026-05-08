#!/usr/bin/env bash
# check-appseed-updates.sh
# Checks if the AppSeed template has updates newer than this project's sync cursor.
# Designed to run as a Claude Code hook (UserPromptSubmit) or manually.
#
# Outputs a message to stdout ONLY if updates are available.
# Caches results for 24 hours to avoid slowing down every prompt.
#
# Usage: bash scripts/check-appseed-updates.sh [appseed-repo-path]

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

CURSOR_FILE=".appseed-sync-cursor"
CACHE_FILE="/tmp/.appseed-update-cache-$(echo "$PWD" | md5sum 2>/dev/null | cut -d' ' -f1 || md5 -q -s "$PWD")"
CACHE_TTL=86400  # 24 hours in seconds

# Find AppSeed repo
APPSEED_PATH="${1:-}"
if [ -z "$APPSEED_PATH" ]; then
  for candidate in "$HOME/Kode/appseed" "$HOME/code/appseed" "$HOME/Code/appseed" "$HOME/projects/appseed"; do
    if [ -d "$candidate/changelogs" ]; then
      APPSEED_PATH="$candidate"
      break
    fi
  done
fi

# ── Early exits ───────────────────────────────────────────────────────────────

# No cursor file = not an AppSeed downstream project
[ ! -f "$CURSOR_FILE" ] && exit 0

# No AppSeed repo found
[ -z "$APPSEED_PATH" ] && exit 0

# No changelogs directory
[ ! -d "$APPSEED_PATH/changelogs" ] && exit 0

# Check cache — if recent enough, use cached result
if [ -f "$CACHE_FILE" ]; then
  cache_age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || stat -c%Y "$CACHE_FILE" 2>/dev/null || echo 0)))
  if [ "$cache_age" -lt "$CACHE_TTL" ]; then
    cached=$(cat "$CACHE_FILE")
    [ -n "$cached" ] && echo "$cached"
    exit 0
  fi
fi

# ── Read cursor ───────────────────────────────────────────────────────────────

last_synced=$(grep -E '^last_synced_at:' "$CURSOR_FILE" 2>/dev/null | sed 's/last_synced_at: *//' | tr -d '[:space:]')
if [ -z "$last_synced" ]; then
  last_synced=$(grep -E '^created_at:' "$CURSOR_FILE" 2>/dev/null | sed 's/created_at: *//' | tr -d '[:space:]')
fi
[ -z "$last_synced" ] && exit 0

# ── Detect project stack ─────────────────────────────────────────────────────

stacks=""
[ -f "package.json" ] || [ -d "node/" ] && stacks="node"
[ -f "Gemfile" ] || [ -d "rails/" ] && stacks="${stacks:+$stacks }rails"
[ -z "$stacks" ] && stacks="node rails"  # default: show all

# ── Count new changelog entries ───────────────────────────────────────────────

count=0
categories=""
breaking=false

for entry in "$APPSEED_PATH"/changelogs/*.md; do
  [ ! -f "$entry" ] && continue

  # Extract date from frontmatter
  entry_date=$(grep -E '^date:' "$entry" 2>/dev/null | head -1 | sed 's/date: *//' | tr -d '[:space:]')
  [ -z "$entry_date" ] && continue

  # Compare dates (string comparison works for YYYY-MM-DD)
  [ "$entry_date" \> "$last_synced" ] || continue

  # Check scope
  entry_scope=$(grep -E '^scope:' "$entry" 2>/dev/null | head -1 | sed 's/scope: *//')
  scope_match=false
  for s in $stacks; do
    echo "$entry_scope" | grep -q "$s" && scope_match=true
  done
  $scope_match || continue

  count=$((count + 1))

  # Collect category
  cat=$(grep -E '^category:' "$entry" 2>/dev/null | head -1 | sed 's/category: *//' | tr -d '[:space:]')
  [ -n "$cat" ] && categories="${categories:+$categories, }$cat"

  # Check breaking
  is_breaking=$(grep -E '^breaking:' "$entry" 2>/dev/null | head -1 | sed 's/breaking: *//' | tr -d '[:space:]')
  [ "$is_breaking" = "true" ] && breaking=true
done

# ── Output ────────────────────────────────────────────────────────────────────

result=""
if [ "$count" -gt 0 ]; then
  unique_cats=$(echo "$categories" | tr ',' '\n' | sed 's/^ *//' | sort -u | tr '\n' ', ' | sed 's/, $//')
  warning=""
  $breaking && warning=" (includes breaking changes)"
  result="AppSeed: $count update(s) available ($unique_cats)$warning. Run /appseed-sync to review."
fi

# Cache the result
echo "$result" > "$CACHE_FILE"

[ -n "$result" ] && echo "$result"
exit 0
