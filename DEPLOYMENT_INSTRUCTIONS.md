# Backend Deployment Instructions

## Quick Start

1. **Login to Supabase CLI:**
   ```bash
   supabase login
   ```

2. **Link your project (if not already linked):**
   ```bash
   supabase link --project-ref vsbjxktlrbfxfhxiqzlr
   ```

3. **Run the deployment script:**
   ```bash
   ./deploy-backend.sh
   ```

   Or deploy manually:

   ```bash
   # Deploy database migration
   supabase db push --project-ref vsbjxktlrbfxfhxiqzlr
   
   # Deploy edge functions
   supabase functions deploy generate-image --project-ref vsbjxktlrbfxfhxiqzlr
   supabase functions deploy remove-background --project-ref vsbjxktlrbfxfhxiqzlr
   ```

## What Gets Deployed

### Database Migration
- File: `supabase/migrations/20260124_generation_metadata_enhancement.sql`
- Adds columns: `prompt_version`, `full_prompt_object`, `negative_prompt_object`, `source_asset_id`, `operation_type`, `model_used`, `seed`, `width`, `height`, `guidance_scale`, `steps`

### Edge Functions
1. **generate-image** - Updated with:
   - New parameter contract validation
   - Structured prompt engine
   - Enhanced metadata storage
   - DEBUG mode support

2. **remove-background** - New function for background removal

## Verification

After deployment, verify:

1. **Check Migration:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'generated_assets' 
   AND column_name IN ('prompt_version', 'full_prompt_object', 'model_used');
   ```

2. **Test Generation:**
   - Generate an image from the UI
   - Check Supabase Dashboard → Edge Functions → generate-image → Logs
   - Look for structured logs with `normalized_params` and `prompt_version`

3. **Check Database:**
   ```sql
   SELECT 
     prompt_version,
     model_used,
     aspect_ratio,
     background_mode,
     quality
   FROM generated_assets 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## Troubleshooting

### "Access token not provided"
Run: `supabase login`

### "Project not found"
Verify project ID: `vsbjxktlrbfxfhxiqzlr` matches your Supabase project

### Migration fails
Check if columns already exist:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'generated_assets';
```

If they exist, the migration will skip them (uses `IF NOT EXISTS`).
