#!/bin/bash

# =====================================================
# Quick Credit Status Check
# =====================================================
# This script quickly checks the current state of the credit system

set -e

echo "=========================================="
echo "CREDIT SYSTEM STATUS CHECK"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Checking database state...${NC}"
echo ""

# Check if user_roles table exists
echo "1. Checking user_roles table..."
if supabase db execute "SELECT COUNT(*) FROM public.user_roles;" &> /dev/null; then
    ROLE_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.user_roles;" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    echo -e "${GREEN}✓ user_roles table exists (${ROLE_COUNT} roles assigned)${NC}"
else
    echo -e "${RED}✗ user_roles table NOT FOUND${NC}"
    echo -e "${YELLOW}→ Run: ./scripts/deploy_credit_fix.sh${NC}"
fi

echo ""

# Check for admin users
echo "2. Checking for admin users..."
ADMIN_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin';" 2>/dev/null | grep -o '[0-9]\+' | head -1 || echo "0")

if [ "$ADMIN_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found ${ADMIN_COUNT} admin user(s)${NC}"

    # Show admin details
    echo ""
    echo "Admin user details:"
    supabase db execute "
    SELECT
      u.email,
      p.free_credits,
      COALESCE(c.balance, 0) AS top_up_balance,
      (p.free_credits + COALESCE(c.balance, 0)) AS total_credits
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.credits c ON c.user_id = u.id
    WHERE ur.role = 'admin';
    " 2>/dev/null || echo -e "${RED}Failed to fetch admin details${NC}"
else
    echo -e "${RED}✗ No admin users found${NC}"
    echo -e "${YELLOW}→ Run migration: 20260216000006_grant_admin_access.sql${NC}"
fi

echo ""

# Check free_credits default
echo "3. Checking free_credits default value..."
DEFAULT=$(supabase db execute "
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'free_credits';
" 2>/dev/null | grep -o '[0-9]\+' | head -1 || echo "0")

if [ "$DEFAULT" -eq 59 ]; then
    echo -e "${GREEN}✓ free_credits default is 59${NC}"
else
    echo -e "${RED}✗ free_credits default is ${DEFAULT} (should be 59)${NC}"
    echo -e "${YELLOW}→ Run migration: 20260216000005_fix_existing_user_credits.sql${NC}"
fi

echo ""

# Check handle_new_user trigger
echo "4. Checking handle_new_user trigger..."
if supabase db execute "
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
" 2>/dev/null | grep -q "on_auth_user_created"; then
    echo -e "${GREEN}✓ handle_new_user trigger exists${NC}"
else
    echo -e "${RED}✗ handle_new_user trigger NOT FOUND${NC}"
    echo -e "${YELLOW}→ Run migration: 20260216000004_handle_new_user_trigger.sql${NC}"
fi

echo ""

# Show all users and their credits
echo "5. User credit summary:"
supabase db execute "
SELECT
  u.email,
  COALESCE(p.free_credits, 0) AS free,
  COALESCE(c.balance, 0) AS topup,
  (COALESCE(p.free_credits, 0) + COALESCE(c.balance, 0)) AS total,
  COALESCE(STRING_AGG(ur.role::text, ','), 'none') AS roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, p.free_credits, c.balance
ORDER BY total DESC;
" 2>/dev/null || echo -e "${RED}Failed to fetch user summary${NC}"

echo ""
echo "=========================================="
echo "STATUS CHECK COMPLETE"
echo "=========================================="
echo ""
echo "If any checks failed, run:"
echo "  ./scripts/deploy_credit_fix.sh"
echo ""
echo "For detailed verification, run:"
echo "  cat scripts/verify_credits.sql | supabase db execute"
echo ""
