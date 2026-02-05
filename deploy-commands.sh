#!/bin/bash

# Deploy Backend - Run these commands one at a time

PROJECT_REF="vsbjxktlrbfxfhxiqzlr"

echo "Deploying to project: $PROJECT_REF"
echo ""

echo "Step 1: Deploying database migration..."
supabase db push --project-ref "$PROJECT_REF"

echo ""
echo "Step 2: Deploying generate-image function..."
supabase functions deploy generate-image --project-ref "$PROJECT_REF"

echo ""
echo "Step 3: Deploying remove-background function..."
supabase functions deploy remove-background --project-ref "$PROJECT_REF"

echo ""
echo "✅ Deployment complete!"
