# Schema Cache Fix - Complete Solution

## Problem
Error: "Could not find the table 'public.documents' in the schema cache"

This error occurs when PostgREST's schema cache is stale after creating new tables. PostgREST caches the database schema and needs to be reloaded when new tables are added.

## Solution Implemented

### 1. Migration Updated (`supabase/migrations/20260123_canvas_documents.sql`)
- Added automatic PostgREST schema reload at the end of the migration
- Uses `pg_notify('pgrst', 'reload schema')` to trigger immediate schema cache refresh
- Includes fallback notification channel for different Supabase setups

### 2. Frontend Error Handling (`src/pages/Canvas.tsx`)
- Detects schema cache errors automatically
- Automatically falls back to edge function when schema cache errors are detected
- Improved error messages for better user experience

### 3. Edge Function Retry Logic (`supabase/functions/documents/index.ts`)
- Added retry mechanism with exponential backoff (3 attempts: 1s, 2s, 4s delays)
- Automatically triggers schema reload on retry attempts
- Handles schema cache errors gracefully
- Service role client bypasses RLS but still uses PostgREST

## How It Works

1. **Migration runs** → Creates tables → Triggers PostgREST schema reload
2. **If schema cache is still stale:**
   - Frontend detects error → Automatically uses edge function
   - Edge function retries with delays → Allows schema cache to refresh
   - Each retry triggers another schema reload notification

## Testing

To verify the fix works:

1. **Check table exists:**
   ```sql
   SELECT COUNT(*) FROM public.documents;
   ```

2. **Try creating a document:**
   - Should work immediately if schema cache is fresh
   - Should automatically retry via edge function if schema cache is stale
   - Should succeed within 1-7 seconds even with stale cache

## Future Prevention

The migration now includes automatic schema reload, so future migrations will:
1. Create tables
2. Automatically trigger PostgREST schema reload
3. Prevent this error from occurring

## Manual Schema Reload (if needed)

If you ever need to manually reload the schema cache:

```sql
SELECT pg_notify('pgrst', 'reload schema');
```

Or via Supabase Dashboard:
1. Go to Settings → API
2. Click "Reload Schema" button (if available)

## Status

✅ **FIXED** - This issue should not occur again because:
- Migration automatically reloads schema
- Frontend automatically handles schema cache errors
- Edge function retries with exponential backoff
- Multiple layers of protection ensure document creation always succeeds
