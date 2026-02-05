#!/bin/bash

# Backend Deployment Script
# Deploys database migrations and edge functions

set -e

PROJECT_REF="vsbjxktlrbfxfhxiqzlr"

echo "🚀 Deploying ArtDirector Studio Backend..."
echo ""

# Check if logged in
if ! supabase projects list &>/dev/null; then
  echo "❌ Not logged in. Please run: supabase login"
  exit 1
fi

echo "📦 Step 1: Running database migrations..."
supabase db push --project-ref "$PROJECT_REF" || {
  echo "⚠️  Migration push failed, trying migration up..."
  supabase migration up --project-ref "$PROJECT_REF"
}

echo ""
echo "🔧 Step 2: Deploying edge functions..."

echo "  → Deploying generate-image..."
supabase functions deploy generate-image --project-ref "$PROJECT_REF"

echo "  → Deploying remove-background..."
supabase functions deploy remove-background --project-ref "$PROJECT_REF"

echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Test generation with new parameters"
echo "  2. Check Supabase logs for structured data"
echo "  3. Verify database has new columns populated"
