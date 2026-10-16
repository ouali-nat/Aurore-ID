-- Aurore ID: profile metadata and private R2 object index.
-- R2 files remain private. Only the Cloudflare Worker uses service_role to manage object metadata.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.r2_objects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('memories', 'profiles')),
  object_key text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  content_type text not null check (char_length(content_type) between 1 and 150),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  created_at timestamptz not null default now(),
  constraint r2_objects_owner_prefix_check check (
    (service = 'memories' and object_key like ('memories/' || owner_id::text || '/%'))
    or
    (service = 'profiles' and object_key like ('profiles/' || owner_id::text || '/%'))
  )
);

alter table public.r2_objects enable row level security;
revoke all on table public.r2_objects from anon, authenticated;
grant all on table public.r2_objects to service_role;

drop policy if exists "R2 metadata managed by trusted backend" on public.r2_objects;
create policy "R2 metadata managed by trusted backend"
  on public.r2_objects for all to service_role
  using (true) with check (true);

create index if not exists r2_objects_owner_service_created_idx
  on public.r2_objects (owner_id, service, created_at desc);

create table if not exists public.aurore_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  headline text not null default '' check (char_length(headline) <= 180),
  bio text not null default '' check (char_length(bio) <= 3000),
  education text not null default '' check (char_length(education) <= 500),
  skills text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  avatar_object_key text references public.r2_objects(object_key) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aurore_profiles enable row level security;
revoke all on table public.aurore_profiles from anon, authenticated;
grant select on table public.aurore_profiles to anon, authenticated;
grant insert, update, delete on table public.aurore_profiles to authenticated;
grant all on table public.aurore_profiles to service_role;

drop policy if exists "Profiles are public when visible or owned" on public.aurore_profiles;
create policy "Profiles are public when visible or owned"
  on public.aurore_profiles for select to anon, authenticated
  using (visibility = 'public' or user_id = (select auth.uid()));

drop policy if exists "Users create their own profile" on public.aurore_profiles;
create policy "Users create their own profile"
  on public.aurore_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own profile" on public.aurore_profiles;
create policy "Users update their own profile"
  on public.aurore_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete their own profile" on public.aurore_profiles;
create policy "Users delete their own profile"
  on public.aurore_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create index if not exists aurore_profiles_public_updated_idx
  on public.aurore_profiles (updated_at desc)
  where visibility = 'public';
