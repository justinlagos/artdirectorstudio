# PHASE 1 MIGRATION - MANUAL DEPLOYMENT GUIDE

## ✅ Migration Files Created

Two migration files have been created in `supabase/migrations/`:

1. **`20251203010000_extend_community_posts.sql`**
   - Extends `community_posts` table with metadata fields
   - Adds indexes for performance
   - Adds RLS policies
   - Adds trigger function for view counting

2. **`20251203020000_community_supplementary_tables.sql`**
   - Creates `community_follows` table
   - Creates `community_reports` table
   - Creates `community_views` table
   - Adds view tracking function

---

## 🚀 DEPLOYMENT OPTIONS

### Option A: Supabase Dashboard (Recommended)

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/vsbjxktlrbfxfhxiqzlr/sql

2. **Run Migration 1:**
   - Open: `supabase/migrations/20251203010000_extend_community_posts.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Verify: "Success. No rows returned"

3. **Run Migration 2:**
   - Open: `supabase/migrations/20251203020000_community_supplementary_tables.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Verify: "Success. No rows returned"

4. **Verify Migrations:**
   - Go to Table Editor
   - Open `community_posts` table
   - ✅ Verify new columns exist: `prompt`, `tool_used`, `is_featured`, etc.
   - Check Tables list
   - ✅ Verify new tables exist: `community_follows`, `community_reports`, `community_views`

---

### Option B: Supabase CLI (If Linked)

If you want to use the CLI, first link your project:

```bash
# Link to your Supabase project
npx supabase link --project-ref vsbjxktlrbfxfhxiqzlr

# Then push migrations
npx supabase db push
```

---

## 🔍 VERIFICATION STEPS

After running migrations, verify everything worked:

### 1. Check community_posts Table

Run this query in SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'community_posts'
ORDER BY ordinal_position;
```

**Expected new columns:**
- `prompt` (text)
- `context_prompt` (text)
- `tool_used` (text)
- `params` (jsonb)
- `aspect_ratio` (text)
- `model_version` (text)
- `remix_source_id` (uuid)
- `original_author_id` (uuid)
- `moderation_status` (text)
- `is_featured` (boolean)
- `is_staff_pick` (boolean)
- `rejected_reason` (text)
- `views_count` (integer)
- `shares_count` (integer)
- `thumbnail_url` (text)
- `tags` (text[])
- `style` (text)
- `mood` (text)
- `color_palette` (text)

### 2. Check New Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('community_follows', 'community_reports', 'community_views');
```

**Expected result:** 3 rows

### 3. Check Indexes

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'community_posts'
AND indexname LIKE 'idx_community%';
```

**Expected indexes:**
- `idx_community_posts_user_id`
- `idx_community_posts_tool_used`
- `idx_community_posts_moderation`
- `idx_community_posts_featured`
- `idx_community_posts_staff_pick`
- `idx_community_posts_views`
- `idx_community_posts_remix_source`

### 4. Check RLS Policies

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'community_posts';
```

**Expected policies:**
- "Public read community posts" (SELECT)
- "Authenticated create community posts" (INSERT)
- "Users can update own posts" (UPDATE)
- "Users can delete own posts" (DELETE)

---

## 📝 NEXT STEP: Regenerate TypeScript Types

After migrations are successfully applied, regenerate TypeScript types:

### Option A: Using Supabase CLI

```bash
npx supabase gen types typescript --project-id vsbjxktlrbfxfhxiqzlr > src/integrations/supabase/types.ts
```

### Option B: Manual (if CLI doesn't work)

1. Go to: https://supabase.com/dashboard/project/vsbjxktlrbfxfhxiqzlr/api
2. Scroll to "Generate Types"
3. Select "TypeScript"
4. Copy the generated types
5. Replace contents of `src/integrations/supabase/types.ts`

---

## ✅ SUCCESS CRITERIA

After completing these steps, you should have:

- ✅ `community_posts` table extended with 19 new columns
- ✅ `community_follows` table created
- ✅ `community_reports` table created
- ✅ `community_views` table created
- ✅ 7 new indexes on `community_posts`
- ✅ 4 RLS policies on `community_posts`
- ✅ View tracking function created
- ✅ TypeScript types regenerated

---

## 🐛 TROUBLESHOOTING

### Error: "column already exists"

**Cause:** Migration was partially applied before  
**Solution:** This is safe to ignore. The `IF NOT EXISTS` clauses prevent errors.

### Error: "permission denied"

**Cause:** Not logged in or wrong project  
**Solution:** Verify you're logged into the correct Supabase account

### Error: "relation does not exist"

**Cause:** `community_posts` table doesn't exist  
**Solution:** This table should already exist from the earlier migration (`20251123000000_community_tables.sql`). If not, run that migration first.

---

## 📞 READY FOR NEXT PHASE?

Once migrations are applied and types are regenerated, you're ready for:

**Phase 3: Update ShareToCommunityDialog** (next step)

Let me know when migrations are complete and I'll proceed with the code updates! 🚀
