# Credit System Fix - Deployment Guide

## Problem Summary

The admin user was getting "insufficient credit" errors when testing the platform. Investigation revealed **4 critical bugs**:

### Critical Bugs Found

1. **Missing `user_roles` table** - Admin bypass logic failed because the table didn't exist
2. **Default free_credits set to 0** - New users started with 0 credits instead of 59
3. **No automatic credit initialization** - Missing `handle_new_user()` trigger
4. **Silent edge function failures** - Errors weren't logged, making bugs invisible

---

## Fix Applied

### Database Migrations Created

1. **`20260216000003_create_user_roles.sql`**
   - Creates `app_role` enum ('user', 'admin')
   - Creates `user_roles` table with RLS policies
   - Enables admin bypass logic in edge functions

2. **`20260216000004_handle_new_user_trigger.sql`**
   - Creates `handle_new_user()` trigger function
   - Automatically grants 59 free credits to new users
   - Assigns default 'user' role on signup

3. **`20260216000005_fix_existing_user_credits.sql`**
   - Updates default `free_credits` to 59
   - Grants 59 credits to existing users with 0
   - Backfills missing credits/roles for existing users

4. **`20260216000006_grant_admin_access.sql`**
   - Grants 999 free credits + 999 top-up credits to admin
   - Assigns 'admin' role to first user (project owner)

### Edge Functions Updated

- **`reserve-credits/index.ts`** - Added error logging for `user_roles` query failures
- **`check-feature-access/index.ts`** - Added error logging for `user_roles` query failures

---

## Deployment Steps

### Option 1: Quick Fix (Recommended for immediate testing)

Run the comprehensive SQL script in Supabase SQL Editor:

```bash
# Copy the contents of scripts/apply_credit_fixes.sql
# Paste into Supabase Dashboard > SQL Editor
# Run the script
```

Or use the Supabase CLI:

```bash
# Apply all migrations at once
supabase db push

# Or apply the comprehensive script
cat scripts/apply_credit_fixes.sql | supabase db execute
```

### Option 2: Migrate via Supabase CLI (Production-safe)

```bash
# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations in order
supabase db push

# Verify migrations were applied
supabase db remote changes
```

### Step 2: Deploy Updated Edge Functions

```bash
# Deploy all edge functions
npm run deploy:functions

# Or deploy individually
supabase functions deploy reserve-credits
supabase functions deploy check-feature-access
```

### Step 3: Verify the Fix

```sql
-- Check user_roles table exists
SELECT * FROM public.user_roles;

-- Check admin user has correct setup
SELECT
  u.email,
  ur.role,
  p.free_credits,
  c.balance AS top_up_balance,
  (p.free_credits + c.balance) AS total_credits
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

Expected output:
```
email: your-admin@email.com
role: admin
free_credits: 999
top_up_balance: 999
total_credits: 1998
```

---

## Testing Checklist

After deployment, test the following:

- [ ] Admin user can access all features without "insufficient credits" error
- [ ] Admin bypass is logged in edge function logs
- [ ] New user signup grants 59 free credits automatically
- [ ] New user has 'user' role assigned
- [ ] Credit reservation flow works (reserve → commit/refund)
- [ ] Edge function errors are logged (check Supabase logs)

---

## Monitoring

### Check Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions** > **Logs**
2. Look for these log messages:
   - ✅ `"check-feature-access: Admin bypass granted for user <id>"`
   - ✅ `"reserve-credits: Admin bypass activated for user <id>"`
   - ❌ `"Failed to check admin role:"` (indicates table still missing)

### Check Database State

```sql
-- Count users by role
SELECT role, COUNT(*) AS user_count
FROM public.user_roles
GROUP BY role;

-- Check credit balances
SELECT
  u.email,
  p.free_credits,
  c.balance AS top_up,
  (p.free_credits + COALESCE(c.balance, 0)) AS total
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
ORDER BY total DESC;

-- Check pending reservations
SELECT
  user_id,
  COUNT(*) AS pending_count,
  SUM(ABS(amount)) AS reserved_total
FROM public.credit_transactions
WHERE status = 'pending'
  AND expires_at > NOW()
GROUP BY user_id;
```

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove admin role from user
DELETE FROM public.user_roles WHERE role = 'admin';

-- Reset credits to defaults
UPDATE public.profiles SET free_credits = 0;
UPDATE public.credits SET balance = 0;

-- Drop new tables (CAUTION!)
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS app_role;
```

**WARNING:** Only use rollback if absolutely necessary. It will remove all role data.

---

## Additional Notes

### Granting Admin to Specific User

If you want to grant admin to a specific user (not just the first user):

```sql
-- Replace 'admin@example.com' with the actual admin email
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Grant generous credits
    UPDATE public.profiles SET free_credits = 999 WHERE id = admin_user_id;
    INSERT INTO public.credits (user_id, balance)
    VALUES (admin_user_id, 999)
    ON CONFLICT (user_id) DO UPDATE SET balance = 999;

    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin granted to: %', admin_user_id;
  END IF;
END $$;
```

### Cost Configuration

Current credit costs (defined in `src/lib/costs.ts`):
```typescript
{
  analyze: 3,
  regenerate: 6,
  funlab_3_options: 10,
  effects_commit_server: 3,
  effects_commit_client: 0,
  background_remove: 4,
  upscale: 5,
}
```

### Free Credits for New Users

- **Default:** 59 free credits per new signup
- **Admin:** 999 free credits + 999 top-up credits
- **Beta Features:** Some features (e.g., caricature) are free during testing

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard > Edge Functions > Logs
2. Check database state with verification queries above
3. Review edge function responses in browser DevTools Network tab
4. Check if migrations were applied: `supabase db remote changes`

---

## Files Modified/Created

### New Migrations
- `supabase/migrations/20260216000003_create_user_roles.sql`
- `supabase/migrations/20260216000004_handle_new_user_trigger.sql`
- `supabase/migrations/20260216000005_fix_existing_user_credits.sql`
- `supabase/migrations/20260216000006_grant_admin_access.sql`

### Updated Edge Functions
- `supabase/functions/reserve-credits/index.ts`
- `supabase/functions/check-feature-access/index.ts`

### New Scripts
- `scripts/apply_credit_fixes.sql` (comprehensive migration script)
- `CREDIT_FIX_DEPLOYMENT.md` (this guide)
