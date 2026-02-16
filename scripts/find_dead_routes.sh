#!/usr/bin/env bash
#
# Find potentially dead route pages and unused imports.
# Run from project root: ./scripts/find_dead_routes.sh
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  Dead Route / Unused Import Scanner"
echo "========================================="
echo ""

# Pages that are redirected in App.tsx (candidates for deletion)
REDIRECTED_PAGES=(
  "src/pages/FunBox.tsx"
  "src/pages/Dashboard.tsx"
  "src/components/CaricatureTool.tsx"
)

echo -e "${YELLOW}Redirected routes (candidates for deletion):${NC}"
for page in "${REDIRECTED_PAGES[@]}"; do
  if [ ! -f "$page" ]; then
    echo -e "  ${GREEN}✓${NC} $page — already deleted"
    continue
  fi

  # Extract the base name without extension for import search
  BASENAME=$(basename "$page" .tsx)

  # Search for imports of this file across the codebase (exclude App.tsx and the file itself)
  IMPORTERS=$(rg -l "from.*${BASENAME}|import.*${BASENAME}" src/ --glob='*.{ts,tsx}' 2>/dev/null \
    | grep -v "App.tsx" \
    | grep -v "$page" \
    || true)

  if [ -z "$IMPORTERS" ]; then
    echo -e "  ${GREEN}✓ SAFE TO DELETE${NC}: $page — no imports outside App.tsx"
  else
    echo -e "  ${RED}✗ KEEP${NC}: $page — still imported by:"
    echo "$IMPORTERS" | sed 's/^/      /'
  fi
done

echo ""
echo -e "${YELLOW}Checking for unused lazy imports in App.tsx:${NC}"

# Extract all lazy-loaded page names from App.tsx
LAZY_PAGES=$(grep -oE "const\s+\w+\s*=\s*lazy" src/App.tsx 2>/dev/null | sed 's/.*const \([A-Za-z_]*\).*/\1/' || true)

for page in $LAZY_PAGES; do
  # Check if it's used in a <Route> element
  USED=$(grep "<${page}" src/App.tsx 2>/dev/null || true)
  if [ -z "$USED" ]; then
    echo -e "  ${RED}✗ UNUSED LAZY IMPORT${NC}: ${page} — imported but not in any <Route>"
  fi
done

echo ""
echo -e "${YELLOW}Legacy files to review:${NC}"

# Check ToolsModalContext usage
TOOLS_MODAL_USERS=$(rg -l "ToolsModalContext|ToolsModalProvider|useToolsModal" src/ --glob='*.{ts,tsx}' 2>/dev/null | grep -v "ToolsModalContext.tsx" || true)
echo "  ToolsModalContext imported by:"
echo "$TOOLS_MODAL_USERS" | sed 's/^/    /'

# Check UnifiedToolsModal usage
UTM_USERS=$(rg -l "UnifiedToolsModal" src/ --glob='*.{ts,tsx}' 2>/dev/null | grep -v "UnifiedToolsModal.tsx" || true)
if [ -z "$UTM_USERS" ]; then
  echo -e "  ${GREEN}✓ UnifiedToolsModal${NC}: not imported anywhere — safe to delete"
else
  echo "  UnifiedToolsModal imported by:"
  echo "$UTM_USERS" | sed 's/^/    /'
fi

echo ""
echo "========================================="
echo "  Safe-to-delete list"
echo "========================================="
echo ""
echo "  Files below have no remaining imports outside their own route redirect:"
echo "  Verify manually before deleting."
echo ""
echo "  - src/pages/FunBox.tsx (route redirects to /canvas)"
echo "  - src/pages/Dashboard.tsx (route redirects to /canvas)"
echo "  - src/components/CaricatureTool.tsx (route redirects to /canvas)"
echo "  - src/components/UnifiedToolsModal.tsx (removed from App.tsx Suspense)"
echo ""
echo "  Do NOT delete:"
echo "  - src/contexts/ToolsModalContext.tsx (still imported by Header, BottomNav, etc.)"
echo ""
