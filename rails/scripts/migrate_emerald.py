#!/usr/bin/env python3
"""
Migrate hardcoded emerald-* Tailwind classes to semantic tokens in Rails views.

Mapping rules are mirrored from node/content/docs/dev/theming.mdx so the Rails
port ends up with the same token vocabulary as the Node app.

Run from the repo root:
    python3 rails/scripts/migrate_emerald.py

Or dry-run:
    python3 rails/scripts/migrate_emerald.py --dry-run
"""
import argparse
import re
import sys
from pathlib import Path

# Ordered rules — longer/more-specific patterns first.
# Each rule is (old_regex, new_string). The regex captures an optional
# Tailwind prefix (hover:, focus:, dark:, md:, lg:, etc.) so we preserve it.
PREFIX = r"(?P<pre>(?:[a-z]+:)*)"

RULES: list[tuple[str, str]] = [
    # Dark-mode foreground-on-accent: emerald-900/XX opacity → accent-foreground
    (rf"{PREFIX}bg-emerald-(?:900|950)/\d+", r"\g<pre>bg-accent"),
    (rf"{PREFIX}text-emerald-(?:900|950)/\d+", r"\g<pre>text-accent-foreground"),
    (rf"{PREFIX}border-emerald-(?:900|950)/\d+", r"\g<pre>border-accent-foreground"),
    # Solid darks → accent-foreground (text on accent background)
    (rf"{PREFIX}text-emerald-(?:900|950)\b", r"\g<pre>text-accent-foreground"),
    (rf"{PREFIX}bg-emerald-(?:900|950)\b", r"\g<pre>bg-accent-foreground"),
    # Subtle brand tints → accent
    (rf"{PREFIX}bg-emerald-(?:50|100|200)(?:/\d+)?\b", r"\g<pre>bg-accent"),
    (rf"{PREFIX}border-emerald-(?:50|100|200)\b", r"\g<pre>border-accent"),
    # Hover primary → primary/90
    (rf"hover:bg-emerald-(?:600|700)\b", r"hover:bg-primary/90"),
    (rf"hover:text-emerald-(?:600|700)\b", r"hover:text-primary/90"),
    (rf"hover:border-emerald-(?:600|700)\b", r"hover:border-primary/90"),
    # Primary brand color (all shades 300/400/500/600/700 → primary)
    (rf"{PREFIX}bg-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>bg-primary"),
    (rf"{PREFIX}text-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>text-primary"),
    (rf"{PREFIX}border-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>border-primary"),
    (rf"{PREFIX}ring-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>ring-ring"),
    (rf"{PREFIX}from-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>from-primary"),
    (rf"{PREFIX}to-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>to-primary"),
    (rf"{PREFIX}via-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>via-primary"),
    (rf"{PREFIX}shadow-emerald-(?:300|400|500|600|700|800)(?:/\d+)?\b", r"\g<pre>shadow-primary"),
    # Catch-all for any remaining emerald-<something>
    (rf"{PREFIX}bg-emerald-\S+", r"\g<pre>bg-primary"),
    (rf"{PREFIX}text-emerald-\S+", r"\g<pre>text-primary"),
    (rf"{PREFIX}border-emerald-\S+", r"\g<pre>border-primary"),
]


def migrate(content: str) -> tuple[str, int]:
    total = 0
    for pattern, replacement in RULES:
        new_content, n = re.subn(pattern, replacement, content)
        content = new_content
        total += n
    return content, total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--root",
        default="rails/app",
        help="Directory to migrate (relative to cwd, default: rails/app)",
    )
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        print(f"error: {root} does not exist", file=sys.stderr)
        return 1

    EXCLUDE_DIRS = {"builds", "node_modules", "tmp", "vendor"}
    files = [
        p
        for p in root.rglob("*")
        if p.is_file()
        and p.suffix in {".erb", ".rb", ".js", ".html"}
        and not any(part in EXCLUDE_DIRS for part in p.parts)
    ]

    total_changes = 0
    changed_files = 0
    for f in files:
        text = f.read_text()
        new_text, n = migrate(text)
        if n > 0:
            total_changes += n
            changed_files += 1
            if args.dry_run:
                print(f"[dry-run] {f}: {n} replacement(s)")
            else:
                f.write_text(new_text)
                print(f"{f}: {n} replacement(s)")

    print()
    print(f"Total: {total_changes} replacement(s) across {changed_files} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
