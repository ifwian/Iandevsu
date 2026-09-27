-- Base schema for a FRESH database: the single starting point, with every
-- column, constraint and index the chat inbox needs already in place.
--
-- To bring an EXISTING database up to date, do not use this file -- it leads
-- with `create table if not exists`, so on a database that already has
-- chat_conversations the inline constraints below are silently skipped. Use
-- supabase/APPLY_PENDING.sql instead, which is the ordered union of the
-- migrations and is safe to paste into an existing database more than once.
--
-- Keep this file in step with the migrations: every index and named length
-- check in supabase/migrations/ must appear here, or a fresh install and a
-- migrated database end up with different constraints.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'visitor' check (role in ('visitor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  visitor_auth_id uuid,
  visitor_name text constraint chat_conversations_visitor_name_len
    check (visitor_name is null or char_length(visitor_name) <= 80),
  visitor_email text constraint chat_conversations_visitor_email_len
    check (visitor_email is null or char_length(visitor_email) <= 254),
  session_started_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'waiting', 'assigned', 'resolved')),
  mode text not null default 'ai' check (mode in ('ai', 'takeover')),
  first_seen_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  unread_count integer not null default 0 check (unread_count >= 0),
  device text constraint chat_conversations_device_len
    check (char_length(device) <= 120),
  current_page text constraint chat_conversations_current_page_len
    check (char_length(current_page) <= 200),
  created_at timestamptz not null default now()
);

alter table public.chat_conversations
  add column if not exists visitor_auth_id uuid;

alter table public.chat_conversations
  add column if not exists visitor_name text;

alter table public.chat_conversations
  add column if not exists visitor_email text;

alter table public.chat_conversations
  add column if not exists first_seen_at timestamptz not null default now();

alter table public.chat_conversations
  add column if not exists unread_count integer not null default 0;

alter table public.chat_conversations
  add column if not exists device text;

alter table public.chat_conversations
  add column if not exists current_page text;

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('visitor', 'assistant', 'admin', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Internal notes: admin-only, never exposed to a visitor. See
-- migrations/20260930010000_add_chat_inbox_features.sql for the column
-- lengths and indexes.
create table if not exists public.chat_conversation_notes (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_visitor_activity (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  kind text not null default 'page' check (kind in ('page', 'chat')),
  page text not null default '',
  label text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_message_reactions (
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  kind text not null check (kind in ('thumbs_up', 'heart')),
  actor text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, kind, actor)
);

create index if not exists chat_conversations_last_message_at_idx
  on public.chat_conversations (last_message_at desc);

create index if not exists chat_conversations_visitor_auth_id_idx
  on public.chat_conversations (visitor_auth_id);

-- Plain, not partial: the inbox's default triage filter is 'active'. See
-- migrations/20260929010000_migrate_chat_status_to_active_resolved.sql.
create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status);

create index if not exists chat_conversations_unread_idx
  on public.chat_conversations (unread_count desc)
  where unread_count > 0;

create index if not exists chat_conversation_notes_conversation_created_at_idx
  on public.chat_conversation_notes (conversation_id, created_at desc);

create index if not exists chat_visitor_activity_conversation_created_at_idx
  on public.chat_visitor_activity (conversation_id, created_at desc);

create index if not exists chat_message_reactions_conversation_idx
  on public.chat_message_reactions (conversation_id);

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

create index if not exists chat_conversations_visitor_name_idx
  on public.chat_conversations (visitor_name)
  where visitor_name is not null;

create index if not exists chat_messages_conversation_created_at_idx
  on public.chat_messages (conversation_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_conversation_notes enable row level security;
alter table public.chat_visitor_activity enable row level security;
alter table public.chat_message_reactions enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can read their conversations" on public.chat_conversations;
create policy "Users can read their conversations"
  on public.chat_conversations for select
  to authenticated
  using (
    visitor_auth_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Users can read their messages" on public.chat_messages;
create policy "Users can read their messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_conversations
      where chat_conversations.id = chat_messages.conversation_id
        and (
          chat_conversations.visitor_auth_id = auth.uid()
          or exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
          )
        )
    )
  );

-- ---------- Realtime ----------
--
-- The visitor widget subscribes to `postgres_changes` on these two tables so an
-- admin reply or a takeover notice appears without waiting for the 2.5s poll.
-- A table that is not a member of the publication never emits, and Supabase does
-- not add one automatically on create -- so without this the subscription
-- connects, looks healthy, and silently never fires.
--
-- Real-time delivery does not widen read access: Realtime applies these same RLS
-- policies for `authenticated` subscribers, so a visitor still only receives rows
-- from their own conversations.
--
-- Guarded and skipped entirely when the publication is absent, which is the case
-- on a plain local Postgres rather than Supabase. Idempotent: ADD TABLE errors if
-- the table is already a member, so each one is checked first.
--
-- Not wrapped in the transaction above, being cluster catalog state rather than
-- a single table -- a failure here must not roll back the schema.
do $$
declare
  target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach target in array array['chat_messages', 'chat_conversations']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end $$;
