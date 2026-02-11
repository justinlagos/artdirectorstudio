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
