-- =====================================================
-- CREDIT SYSTEM VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the credit system is working correctly

\echo '=========================================='
\echo 'CREDIT SYSTEM VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: user_roles table exists and has data
\echo 'Check 1: user_roles table'
SELECT
  'user_roles' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admin_count,
  COUNT(CASE WHEN role = 'user' THEN 1 END) AS user_count
FROM public.user_roles;

\echo ''

-- Check 2: All users with their credit balances
\echo 'Check 2: User credit balances'
SELECT
  u.email,
  COALESCE(STRING_AGG(DISTINCT ur.role::text, ', '), 'NO ROLE') AS roles,
  COALESCE(p.free_credits, 0) AS free_credits,
  COALESCE(c.balance, 0) AS top_up_balance,
  (COALESCE(p.free_credits, 0) + COALESCE(c.balance, 0)) AS total_available,
  p.subscription_tier,
  p.subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, p.free_credits, c.balance, p.subscription_tier, p.subscription_status
ORDER BY total_available DESC;

\echo ''

-- Check 3: Admin users
\echo 'Check 3: Admin users'
SELECT
  u.email,
  p.free_credits,
  c.balance AS top_up_balance,
  (p.free_credits + COALESCE(c.balance, 0)) AS total_credits,
  ur.created_at AS admin_since
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at ASC;

\echo ''

-- Check 4: Pending credit reservations
\echo 'Check 4: Pending reservations'
SELECT
  u.email,
  ct.action,
  ct.amount,
  ct.status,
  ct.expires_at,
  ct.created_at
FROM public.credit_transactions ct
JOIN auth.users u ON u.id = ct.user_id
WHERE ct.status = 'pending'
  AND ct.expires_at > NOW()
ORDER BY ct.created_at DESC
LIMIT 10;

\echo ''

-- Check 5: Recent credit transactions
\echo 'Check 5: Recent transactions (last 10)'
SELECT
  u.email,
  ct.action,
  ct.amount,
  ct.status,
  ct.description,
  ct.created_at
FROM public.credit_transactions ct
JOIN auth.users u ON u.id = ct.user_id
ORDER BY ct.created_at DESC
LIMIT 10;

\echo ''

-- Check 6: Users with insufficient credits
\echo 'Check 6: Users with low/zero credits'
SELECT
  u.email,
  COALESCE(p.free_credits, 0) AS free_credits,
  COALESCE(c.balance, 0) AS top_up_balance,
  (COALESCE(p.free_credits, 0) + COALESCE(c.balance, 0)) AS total
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.credits c ON c.user_id = u.id
WHERE (COALESCE(p.free_credits, 0) + COALESCE(c.balance, 0)) < 10
ORDER BY total ASC;

\echo ''

-- Check 7: Verify handle_new_user trigger exists
\echo 'Check 7: Trigger and function status'
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

\echo ''

-- Check 8: Default values
\echo 'Check 8: Column defaults'
SELECT
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'free_credits';

\echo ''
\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo 'Expected results:'
\echo '- At least 1 admin user with 999+ credits'
\echo '- All users have a role assigned'
\echo '- free_credits default is 59'
\echo '- handle_new_user trigger exists'
\echo '=========================================='
