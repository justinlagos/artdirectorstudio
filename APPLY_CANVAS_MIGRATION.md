# Apply Canvas Documents Migration

The error "Could not find the table 'public.documents'" means the migration hasn't been applied yet.

## Quick Fix - Apply Migration via Supabase Dashboard

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/vsbjxktlrbfxfhxiqzlr/sql
2. Or navigate: Dashboard → SQL Editor

### Step 2: Run the Migration

1. Open the file: `supabase/migrations/20260123_canvas_documents.sql`
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Click **"Run"** button (or press Cmd+Enter)
5. Wait for "Success" message

### Step 3: Verify Tables Were Created

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'assets', 'actions', 'user_preferences');
```

**Expected result:** Should return 4 rows (or 3 if user_preferences already exists)

### Step 4: Test Document Creation

After migration is applied, try clicking "+ New Document" again. It should work!

---

## Alternative: Use Supabase CLI

If you have Supabase CLI installed and linked:

```bash
# Link to project (if not already linked)
npx supabase link --project-ref vsbjxktlrbfxfhxiqzlr

# Apply migrations
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

---

## What This Migration Creates

1. **documents** table - Stores canvas documents
2. **assets** table - Stores image/mask/vector assets
3. **actions** table - Stores action history for undo/redo
4. **user_preferences** table - Extended with canvas preferences (or updates existing)

All tables include:
- Proper indexes for performance
- RLS (Row Level Security) policies
- Triggers for updated_at timestamps

---

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist
- The migration uses `CREATE TABLE IF NOT EXISTS` so this is safe
- Continue with the migration

### Error: "permission denied"
- Make sure you're logged into the correct Supabase account
- Verify you have admin access to the project

### Error: "type already exists" (for asset_type enum)
- The enum might already exist
- This is safe to ignore - the migration will continue

---

## After Migration

Once the migration is applied:
1. Refresh your browser
2. Click "+ New Document" again
3. It should create a document successfully!
