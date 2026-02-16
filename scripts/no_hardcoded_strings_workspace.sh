#!/usr/bin/env bash
#
# Detect hardcoded English strings in workspace components.
# Fails if any user-visible string literals are found that aren't from microcopy.
#
# Target: src/components/workspace/**/*.tsx
# Allowlist: mc.*, aria-*, className, console.*, import, type annotations
#
# Run: ./scripts/no_hardcoded_strings_workspace.sh
# Use in CI: exits 1 on violations, 0 on clean.
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TARGET_DIR="src/components/workspace"

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR"
  exit 1
fi

echo "========================================="
echo "  Hardcoded String Detector"
echo "  Scope: ${TARGET_DIR}/**/*.tsx"
echo "========================================="
echo ""

VIOLATIONS=0

# Find string literals in JSX that look like user-visible text.
# Pattern: looks for quoted strings (>2 chars) inside JSX return blocks
# that are not: className, aria-*, import, console, key, id, src, alt with mc.*

# Strategy: find lines with string literals that appear to be UI text
# Exclude: imports, console.*, className, aria-*, data-*, key=, id=, src=, href=
# Exclude: lines containing mc. (microcopy reference)
# Exclude: type annotations, interface definitions, comments
# Exclude: single-word CSS/technical tokens

while IFS= read -r file; do
  # Skip test files
  [[ "$file" == *".test."* ]] && continue
  [[ "$file" == *".spec."* ]] && continue

  # Look for suspicious string literals that could be hardcoded UI text
  HITS=$(rg -n \
    ">['\"][A-Z][a-z].*['\"]<|title=['\"][A-Z]|placeholder=['\"][A-Z]|label=['\"][A-Z]" \
    "$file" 2>/dev/null \
    | grep -v "mc\." \
    | grep -v "aria-" \
    | grep -v "className" \
    | grep -v "console\." \
    | grep -v "import " \
    | grep -v "// " \
    | grep -v "tooltips\." \
    || true)

  if [ -n "$HITS" ]; then
    echo -e "${RED}VIOLATION${NC} in $file:"
    echo "$HITS" | sed 's/^/  /'
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find "$TARGET_DIR" -name "*.tsx" -type f)

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}Found $VIOLATIONS file(s) with potential hardcoded strings.${NC}"
  echo "  Move these to src/lib/microcopy.ts and reference via mc.*"
  exit 1
else
  echo -e "${GREEN}✓ No hardcoded strings detected in workspace components.${NC}"
  exit 0
fi
