#!/bin/bash

# =====================================================
# Credit System Fix - Deployment Script
# =====================================================
# This script deploys all database migrations and edge functions
# to fix the "insufficient credits" issue

set -e  # Exit on error

echo "=========================================="
echo "CREDIT SYSTEM FIX - DEPLOYMENT"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if linked to a project
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}ERROR: Not authenticated with Supabase${NC}"
    echo "Run: supabase login"
    exit 1
fi

echo -e "${YELLOW}Step 1: Applying database migrations...${NC}"
echo ""

# Apply migrations
if supabase db push; then
    echo -e "${GREEN}✓ Database migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Failed to apply migrations${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Deploying edge functions...${NC}"
echo ""

# Deploy critical edge functions
FUNCTIONS=(
    "reserve-credits"
    "commit-credits"
    "check-feature-access"
)

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy "$func"; then
        echo -e "${GREEN}✓ $func deployed${NC}"
    else
        echo -e "${RED}✗ Failed to deploy $func${NC}"
        exit 1
    fi
done

echo ""
echo -e "${YELLOW}Step 3: Verifying deployment...${NC}"
echo ""

# Run verification queries
echo "Checking user_roles table..."
if supabase db execute "SELECT COUNT(*) FROM public.user_roles;" &> /dev/null; then
    echo -e "${GREEN}✓ user_roles table exists${NC}"
else
    echo -e "${RED}✗ user_roles table not found${NC}"
    exit 1
fi

echo "Checking admin user setup..."
ADMIN_CHECK=$(supabase db execute "
SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin';
" | grep -o '[0-9]\+' | head -1)

if [ "$ADMIN_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓ Admin user configured${NC}"
else
    echo -e "${YELLOW}⚠ No admin user found. This may be expected if no users exist yet.${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Log into your app as the admin user"
echo "2. Try using a feature that requires credits"
echo "3. Check edge function logs for admin bypass messages"
echo ""
echo "Monitoring:"
echo "- Edge Function Logs: https://supabase.com/dashboard/project/YOUR_PROJECT/functions/logs"
echo "- Database: https://supabase.com/dashboard/project/YOUR_PROJECT/editor"
echo ""
echo "To view credit status for all users, run:"
echo "  cat scripts/verify_credits.sql | supabase db execute"
echo ""
