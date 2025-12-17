# PHASE 1 - STEP 0: CREATE BASE COMMUNITY TABLES

## ⚠️ IMPORTANT: Run This First!

Before running migrations 1 and 2, you need to create the base `community_posts` table.

---

## 🔍 WHICH MIGRATION TO USE?

You have two options. Let's determine which one matches your database:

### Option A: Check if `public.profiles` table exists

Run this query in Supabase SQL Editor:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
);
```

**If result is `true`:** Use Migration Option 1  
**If result is `false`:** Use Migration Option 2

---

## 📝 MIGRATION OPTION 1: Using public.profiles

**Use this if you have a `public.profiles` table**

Run this in Supabase SQL Editor:

```sql
-- Community feature tables
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  image_url text not null,
  caption text,
  created_at timestamptz default now(),
  likes_count integer not null default 0,
  comments_count integer not null default 0
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  comment_text text not null,
  created_at timestamptz default now()
);

create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  constraint community_likes_unique unique (post_id, user_id)
);

-- Indexes for feed performance
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);
create index if not exists community_posts_popularity_idx on public.community_posts (likes_count desc, comments_count desc);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at desc);
create index if not exists community_likes_post_idx on public.community_likes (post_id);

-- Row Level Security
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;

-- Policies: public read
create policy "Public read community posts" on public.community_posts for select using (true);
create policy "Public read community comments" on public.community_comments for select using (true);
create policy "Public read community likes" on public.community_likes for select using (true);

-- Policies: authenticated writes
create policy "Authenticated create community posts" on public.community_posts
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Authenticated comment" on public.community_comments
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Authenticated like" on public.community_likes
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Authenticated unlike own" on public.community_likes
  for delete using (auth.role() = 'authenticated' and user_id = auth.uid());

-- Trigger functions to keep counters in sync
create or replace function public.increment_community_like_count()
returns trigger as $$
begin
  update public.community_posts
    set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists community_like_insert on public.community_likes;
create trigger community_like_insert
  after insert on public.community_likes
  for each row execute function public.increment_community_like_count();

create or replace function public.decrement_community_like_count()
returns trigger as $$
begin
  update public.community_posts
    set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists community_like_delete on public.community_likes;
create trigger community_like_delete
  after delete on public.community_likes
  for each row execute function public.decrement_community_like_count();

create or replace function public.increment_community_comment_count()
returns trigger as $$
begin
  update public.community_posts
    set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists community_comment_insert on public.community_comments;
create trigger community_comment_insert
  after insert on public.community_comments
  for each row execute function public.increment_community_comment_count();

create or replace function public.decrement_community_comment_count()
returns trigger as $$
begin
  update public.community_posts
    set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists community_comment_delete on public.community_comments;
create trigger community_comment_delete
  after delete on public.community_comments
  for each row execute function public.decrement_community_comment_count();
```

**Then update migrations 1 & 2 to use `public.profiles(id)`**

---

## 📝 MIGRATION OPTION 2: Using auth.users (RECOMMENDED)

**Use this if you DON'T have a `public.profiles` table**

This is the version that matches the newer migration file.

Run this in Supabase SQL Editor:

```sql
-- Create community_posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_likes table
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view posts"
  ON public.community_posts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for community_comments
CREATE POLICY "Anyone can view comments"
  ON public.community_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.community_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.community_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for community_likes
CREATE POLICY "Anyone can view likes"
  ON public.community_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON public.community_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.community_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update likes count
CREATE OR REPLACE FUNCTION public.update_community_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create function to update comments count
CREATE OR REPLACE FUNCTION public.update_community_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER on_community_like_change
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_community_likes_count();

CREATE TRIGGER on_community_comment_change
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_community_comments_count();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON public.community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_post ON public.community_likes(user_id, post_id);
```

**Migrations 1 & 2 are already configured for this option (auth.users)**

---

## ✅ VERIFICATION

After running the base migration, verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('community_posts', 'community_comments', 'community_likes');
```

**Expected:** 3 rows

---

## 🚀 NEXT STEPS

Once base tables are created:

1. ✅ Run Migration 1: `20251203010000_extend_community_posts.sql`
2. ✅ Run Migration 2: `20251203020000_community_supplementary_tables.sql`

---

**Which option should you use? Run the check query first to determine!**
