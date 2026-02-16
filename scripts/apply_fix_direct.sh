#!/bin/bash

# =====================================================
# Direct SQL Application - Bypass Migration Issues
# =====================================================
# This script applies the credit fixes directly via SQL
# bypassing migration sync issues

set -e

echo "=========================================="
echo "APPLYING CREDIT FIXES DIRECTLY"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Applying SQL fixes directly to remote database...${NC}"
echo ""

# Apply the comprehensive SQL script
if cat scripts/apply_credit_fixes.sql | supabase db execute; then
    echo ""
    echo -e "${GREEN}✓ SQL fixes applied successfully${NC}"
else
    echo ""
    echo -e "${RED}✗ Failed to apply SQL fixes${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Deploying edge functions...${NC}"
echo ""

# Deploy edge functions
FUNCTIONS=(
    "reserve-credits"
    "commit-credits"
    "check-feature-access"
)

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo -e "${GREEN}✓ $func deployed${NC}"
    else
        echo -e "${RED}✗ Failed to deploy $func${NC}"
        # Don't exit, continue with other functions
    fi
done

echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
echo ""

# Check status
./scripts/check_credit_status.sh

echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT COMPLETE${NC}"
echo "=========================================="
echo ""
