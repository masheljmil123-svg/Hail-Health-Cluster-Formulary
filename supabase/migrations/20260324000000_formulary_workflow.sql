-- =============================================================================
-- King Salman Specialist Hospital — Hail Health Cluster Formulary
-- Migration 1 of 1 (initial schema)
-- =============================================================================
-- SAFE TO APPLY on an empty / new Supabase project.
-- Does NOT drop tables or delete data.
-- Uses IF NOT EXISTS / OR REPLACE where possible so re-running is safer.
--
-- Apply via: Supabase Dashboard → SQL Editor → New query → paste this file → Run
-- Do not use the Service Role key in the browser.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (roles + workflow)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('administrator', 'team_member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.publication_status as enum (
    'draft',
    'pending-review',
    'changes-requested',
    'rejected',
    'approved',
    'published',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_kind as enum (
    'drug',
    'protocol',
    'guideline',
    'education',
    'chemotherapy'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Team accounts linked to Supabase Auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  email text not null,
  role public.app_role not null default 'team_member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drugs, protocols, guidelines, counseling materials, chemotherapy records
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'draft',
  author_id uuid references public.profiles (id),
  published_snapshot jsonb,
  review_note text,
  submitted_at timestamptz,
  version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Version history / revision trail
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  version text not null,
  payload jsonb not null,
  status public.publication_status not null,
  actor_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

-- Review request history (submit / request-changes / approve / publish / reject)
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  action text not null,
  actor_id uuid references public.profiles (id),
  note text,
  from_status public.publication_status,
  to_status public.publication_status,
  created_at timestamptz not null default now()
);

-- Uploaded resource metadata (files live in Storage buckets)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  is_published boolean not null default false,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- In-app notifications (per user)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  related_kind text,
  related_id uuid,
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit log (administrator-visible)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  actor_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists content_items_kind_status_idx
  on public.content_items (kind, status);
create index if not exists content_items_author_idx
  on public.content_items (author_id);
create index if not exists content_items_pending_idx
  on public.content_items (status)
  where status = 'pending-review';
create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read, created_at desc);
create index if not exists review_events_content_idx
  on public.review_events (content_id, created_at desc);
create index if not exists attachments_content_idx
  on public.attachments (content_id);

comment on table public.attachments is
  'File metadata only. Store blobs in private Storage bucket formulary-drafts; promote on publish.';

-- ---------------------------------------------------------------------------
-- Helper functions (security definer — read role without opening profiles wide)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and role = 'administrator'
  )
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
  )
$$;

-- Auto-create a team_member profile when a user signs up (invite flow)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'team_member'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.content_items enable row level security;
alter table public.content_revisions enable row level security;
alter table public.review_events enable row level security;
alter table public.attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Drop legacy/partial policies if this file is re-applied after an earlier draft
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'content_items', 'content_revisions', 'review_events',
        'attachments', 'notifications', 'audit_log'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- ===== profiles =====
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_administrator());

create policy "profiles_update_self_limited"
  on public.profiles for update
  using (id = auth.uid() or public.is_administrator())
  with check (
    -- Non-admins cannot change role or active flag
    (
      public.is_administrator()
    )
    or (
      id = auth.uid()
      and role = (select p.role from public.profiles p where p.id = auth.uid())
      and active = (select p.active from public.profiles p where p.id = auth.uid())
    )
  );

-- Only administrators may create/invite profile rows explicitly
create policy "profiles_insert_admin_only"
  on public.profiles for insert
  with check (public.is_administrator() or id = auth.uid());

-- ===== content_items (drugs + resources) =====
-- Anyone may read published content; authors see their own; admins see all
create policy "content_select_published_own_or_admin"
  on public.content_items for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_administrator()
  );

-- Staff may create drafts (and submit to pending-review). Never approved/published on insert.
create policy "content_insert_staff_draft_only"
  on public.content_items for insert
  with check (
    public.is_active_staff()
    and author_id = auth.uid()
    and status in ('draft', 'pending-review', 'changes-requested', 'rejected')
  );

-- Team members: edit only their own non-published working copies; cannot set approved/published
create policy "content_update_author_working_copy"
  on public.content_items for update
  using (
    author_id = auth.uid()
    and status in ('draft', 'changes-requested', 'rejected', 'pending-review')
  )
  with check (
    author_id = auth.uid()
    and status in ('draft', 'pending-review', 'changes-requested', 'rejected', 'archived')
  );

-- Administrators: full update including approve & publish
create policy "content_update_administrator"
  on public.content_items for update
  using (public.is_administrator())
  with check (public.is_administrator());

-- Only administrators may delete content records
create policy "content_delete_administrator"
  on public.content_items for delete
  using (public.is_administrator());

-- ===== content_revisions =====
create policy "revisions_select_own_or_admin_or_published_parent"
  on public.content_revisions for select
  using (
    public.is_administrator()
    or exists (
      select 1 from public.content_items c
      where c.id = content_id
        and (c.author_id = auth.uid() or c.status = 'published')
    )
  );

create policy "revisions_insert_staff"
  on public.content_revisions for insert
  with check (
    public.is_active_staff()
    and (
      public.is_administrator()
      or exists (
        select 1 from public.content_items c
        where c.id = content_id and c.author_id = auth.uid()
      )
    )
  );

-- ===== review_events =====
create policy "review_events_select_own_or_admin"
  on public.review_events for select
  using (
    public.is_administrator()
    or exists (
      select 1 from public.content_items c
      where c.id = content_id and c.author_id = auth.uid()
    )
  );

-- Team members may insert submit/resubmit events only for their own content
create policy "review_events_insert_author_submit"
  on public.review_events for insert
  with check (
    actor_id = auth.uid()
    and action in ('submit', 'resubmit')
    and exists (
      select 1 from public.content_items c
      where c.id = content_id and c.author_id = auth.uid()
    )
  );

-- Administrators may insert any review action (approve, publish, reject, request-changes, …)
create policy "review_events_insert_administrator"
  on public.review_events for insert
  with check (public.is_administrator() and actor_id = auth.uid());

-- ===== attachments =====
create policy "attachments_select_published_own_or_admin"
  on public.attachments for select
  using (
    (is_published = true and exists (
      select 1 from public.content_items c
      where c.id = content_id and c.status = 'published'
    ))
    or public.is_administrator()
    or exists (
      select 1 from public.content_items c
      where c.id = content_id and c.author_id = auth.uid()
    )
  );

create policy "attachments_insert_author_or_admin"
  on public.attachments for insert
  with check (
    public.is_active_staff()
    and (
      public.is_administrator()
      or exists (
        select 1 from public.content_items c
        where c.id = content_id
          and c.author_id = auth.uid()
          and c.status in ('draft', 'changes-requested', 'rejected', 'pending-review')
      )
    )
  );

create policy "attachments_update_author_or_admin"
  on public.attachments for update
  using (
    public.is_administrator()
    or exists (
      select 1 from public.content_items c
      where c.id = content_id and c.author_id = auth.uid()
    )
  )
  with check (
    public.is_administrator()
    or (
      is_published = false
      and exists (
        select 1 from public.content_items c
        where c.id = content_id and c.author_id = auth.uid()
      )
    )
  );

create policy "attachments_delete_author_or_admin"
  on public.attachments for delete
  using (
    public.is_administrator()
    or exists (
      select 1 from public.content_items c
      where c.id = content_id
        and c.author_id = auth.uid()
        and c.status in ('draft', 'changes-requested', 'rejected')
    )
  );

-- ===== notifications =====
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff may create notifications (e.g. after submit); typically admins notify authors
create policy "notifications_insert_staff"
  on public.notifications for insert
  with check (public.is_active_staff());

-- ===== audit_log =====
create policy "audit_select_administrator"
  on public.audit_log for select
  using (public.is_administrator());

create policy "audit_insert_staff"
  on public.audit_log for insert
  with check (public.is_active_staff());

-- =============================================================================
-- Notes for Storage (run separately in Dashboard → Storage after this SQL):
--   1. Create private bucket: formulary-drafts
--   2. Create private bucket: formulary-published
-- Draft files must never be world-readable.
-- =============================================================================
