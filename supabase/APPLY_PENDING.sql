-- ============================================================================
-- PENDING MIGRATIONS -- paste this whole block into the Supabase SQL Editor
-- and run it once. Sections 1-4 were confirmed unapplied against the live
-- database on 2026-09-26; sections 5-6 are the chat-inbox feature set.
--
-- This block is the union of the five chat migrations in order, so a database
-- that predates any of them can be brought fully up to date from one paste:
--   supabase/migrations/20260925010000_add_chat_takeover_mode.sql
--   supabase/migrations/20260927010000_add_chat_visitor_contact.sql
--   supabase/migrations/20260928010000_add_chat_takeover_support.sql
--   supabase/migrations/20260929010000_migrate_chat_status_to_active_resolved.sql
--   supabase/migrations/20260930010000_add_chat_inbox_features.sql
--
-- 20260926010000_add_profiles_admin_bootstrap.sql is deliberately NOT included.
-- It provisions a `profiles` table for a Supabase-session admin path that
-- commit a297fa90 replaced with the CHAT_ADMIN_PASSWORD scheme; nothing reads
-- it any more. A fresh database still gets `profiles` from schema.sql.
--
-- Idempotent: safe to run more than once. Every add is `if not exists` and
-- every constraint is dropped before it is re-added.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Allow role = 'system'
--
-- Verified unapplied: inserting role='system' fails with
--   23514 new row for relation "chat_messages" violates check constraint
--   "chat_messages_role_check"
-- Takeover and resolution announcements are stored with this role, so without
-- it every admin takeover/resolve returns a 500.
-- ---------------------------------------------------------------------------
alter table public.chat_messages
  drop constraint if exists chat_messages_role_check;

alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('visitor', 'assistant', 'admin', 'system'));

-- ---------------------------------------------------------------------------
-- 2. chat_conversations.mode
--
-- 'ai' or 'takeover'. Required for human handoff: without the column the
-- admin_takeover event returns
--   409 Takeover is unavailable: the chat_conversations.mode column is missing
-- and the inbox's takeover/release buttons do nothing.
--
-- This covers both 20260925010000 (which first created the column) and the
-- re-declaration in 202609280000, so the paste is self-sufficient even if
-- neither has been applied.
-- ---------------------------------------------------------------------------
alter table public.chat_conversations
  add column if not exists mode text not null default 'ai';

alter table public.chat_conversations
  drop constraint if exists chat_conversations_mode_check;

alter table public.chat_conversations
  add constraint chat_conversations_mode_check
  check (mode in ('ai', 'takeover'));

-- ---------------------------------------------------------------------------
-- 3. Optional visitor contact columns
--
-- Not optional in practice: section 5 creates chat_conversations_visitor_email_idx
-- on visitor_email, and this whole block is one transaction. If this section
-- is missing on an older database, that CREATE INDEX raises
--   42703 column "visitor_email" does not exist
-- and rolls back every other section too.
--
-- Both columns stay nullable on purpose. Existing conversations predate the
-- pre-chat form and have no name, and email was always optional -- so no read
-- path may treat either as required, or every pre-existing conversation would
-- be filtered out of the inbox.
-- ---------------------------------------------------------------------------
alter table public.chat_conversations
  add column if not exists visitor_name text,
  add column if not exists visitor_email text;

alter table public.chat_conversations
  drop constraint if exists chat_conversations_visitor_name_len;

alter table public.chat_conversations
  add constraint chat_conversations_visitor_name_len
  check (visitor_name is null or char_length(visitor_name) <= 80);

alter table public.chat_conversations
  drop constraint if exists chat_conversations_visitor_email_len;

alter table public.chat_conversations
  add constraint chat_conversations_visitor_email_len
  check (visitor_email is null or char_length(visitor_email) <= 254);

create index if not exists chat_conversations_visitor_name_idx
  on public.chat_conversations (visitor_name)
  where visitor_name is not null;

-- ---------------------------------------------------------------------------
-- 4. status: 'open'/'closed' -> 'active'/'resolved'
--
-- Verified unapplied: inserting status='active' fails with
--   23514 new row for relation "chat_conversations" violates check constraint
--   "chat_conversations_status_check"
-- The API already writes 'active', so until this runs EVERY visitor thread
-- insert is rejected and no conversation is ever stored.
--
-- Backfill first, while 'open'/'closed' are still the allowed values.
-- ---------------------------------------------------------------------------
update public.chat_conversations set status = 'active'   where status = 'open';
update public.chat_conversations set status = 'resolved' where status = 'closed';

alter table public.chat_conversations
  drop constraint if exists chat_conversations_status_check;

do $$
declare
  leftover text;
begin
  -- Catch a status CHECK left over under a different name, otherwise the ADD
  -- below would stack a second CHECK and the old vocabulary would stay live.
  -- \mstatus\M anchors on word boundaries so only a constraint that actually
  -- references the status column is a candidate -- the name-length checks on
  -- visitor_name/visitor_email/device/current_page mention none of them.
  select conname into leftover
  from pg_constraint
  where conrelid = 'public.chat_conversations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ~ '\mstatus\M'
    and conname <> 'chat_conversations_status_check'
  limit 1;

  if leftover is not null then
    execute format(
      'alter table public.chat_conversations drop constraint %I',
      leftover
    );
  end if;
end $$;

alter table public.chat_conversations
  add constraint chat_conversations_status_check
  check (status in ('active', 'resolved'));

alter table public.chat_conversations
  alter column status set default 'active';

-- ---------------------------------------------------------------------------
-- 5. Indexes for the inbox's status filter and email search.
--
-- The status index is dropped first rather than left to `create index if not
-- exists`: the shipped version was partial on `status = 'resolved'`, written
-- against the old two-state vocabulary. The inbox's default triage filter is
-- now `active`, which that predicate excluded from the index entirely. A plain
-- index is small here (low-cardinality column, one entry per distinct value per
-- row) and serves all four states.
-- ---------------------------------------------------------------------------
drop index if exists public.chat_conversations_status_idx;

create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status);

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

-- ============================================================================
-- 6. Chat inbox features (unread counts, four-state status, admin notes,
--    visitor activity, message reactions).
--
-- Verbatim copy of supabase/migrations/20260930010000_add_chat_inbox_features.sql
-- so this file stays a single paste.
--
-- The API degrades gracefully without section 6: reads and conversation
-- inserts both retry without the new columns, so the chat itself keeps
-- working. What goes inert is the unread badge, the waiting/assigned statuses,
-- the visitor panel, internal notes, the activity timeline and reactions.
-- ============================================================================

alter table public.chat_conversations
  drop constraint if exists chat_conversations_status_check;

alter table public.chat_conversations
  add constraint chat_conversations_status_check
  check (status in ('active', 'waiting', 'assigned', 'resolved'));

alter table public.chat_conversations
  add column if not exists unread_count integer not null default 0;

alter table public.chat_conversations
  drop constraint if exists chat_conversations_unread_count_check;

alter table public.chat_conversations
  add constraint chat_conversations_unread_count_check check (unread_count >= 0);

create index if not exists chat_conversations_unread_idx
  on public.chat_conversations (unread_count desc)
  where unread_count > 0;

alter table public.chat_conversations
  add column if not exists first_seen_at timestamptz;

update public.chat_conversations
  set first_seen_at = coalesce(created_at, session_started_at)
  where first_seen_at is null;

alter table public.chat_conversations
  alter column first_seen_at set default now();

alter table public.chat_conversations
  alter column first_seen_at set not null;

alter table public.chat_conversations
  add column if not exists device text;

alter table public.chat_conversations
  add column if not exists current_page text;

alter table public.chat_conversations
  drop constraint if exists chat_conversations_device_len;

alter table public.chat_conversations
  add constraint chat_conversations_device_len check (char_length(device) <= 120);

alter table public.chat_conversations
  drop constraint if exists chat_conversations_current_page_len;

alter table public.chat_conversations
  add constraint chat_conversations_current_page_len check (char_length(current_page) <= 200);

create table if not exists public.chat_conversation_notes (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_conversation_notes_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists chat_conversation_notes_conversation_created_at_idx
  on public.chat_conversation_notes (conversation_id, created_at desc);

create table if not exists public.chat_visitor_activity (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  kind text not null default 'page',
  page text not null default '',
  label text not null default '',
  created_at timestamptz not null default now(),
  constraint chat_visitor_activity_kind_check check (kind in ('page', 'chat'))
);

create index if not exists chat_visitor_activity_conversation_created_at_idx
  on public.chat_visitor_activity (conversation_id, created_at desc);

create table if not exists public.chat_message_reactions (
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  kind text not null,
  actor text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, kind, actor),
  constraint chat_message_reactions_kind_check check (kind in ('thumbs_up', 'heart')),
  constraint chat_message_reactions_actor_len check (char_length(actor) between 1 and 128)
);

create index if not exists chat_message_reactions_conversation_idx
  on public.chat_message_reactions (conversation_id);

-- Deny-all: these tables get RLS with no policies on purpose. The visitor's
-- browser never talks to them, and internal notes must stay unreachable from
-- a visitor even if the anon key is ever wired to a client.
alter table public.chat_conversation_notes enable row level security;
alter table public.chat_visitor_activity enable row level security;
alter table public.chat_message_reactions enable row level security;

commit;

-- ============================================================================
-- Verify (all should return 0 rows / no error):
--
--   select status, count(*) from chat_conversations group by 1;
--   -- expect only 'active' | 'waiting' | 'assigned' | 'resolved'
--
--   select mode, count(*) from chat_conversations group by 1;
--   -- expect only 'ai' | 'takeover'
--
--   select role, count(*) from chat_messages group by 1;
--   -- may include 'system'
--
--   insert into chat_conversations
--     (visitor_id, session_started_at, status, last_message_at, last_message_preview)
--   values ('__probe__', now(), 'assigned', now(), 'probe');
--   -- expect success; then:
--   delete from chat_conversations where visitor_id = '__probe__';
--
--   -- the columns section 5 indexes must exist, or section 5 rolled back:
--   select count(*) from information_schema.columns
--     where table_name = 'chat_conversations'
--       and column_name in ('visitor_email', 'mode', 'unread_count',
--                            'first_seen_at', 'device', 'current_page');
--   -- expect 6
--
--   select count(*) from pg_constraint
--     where conrelid = 'public.chat_conversations'::regclass
--       and conname in ('chat_conversations_mode_check',
--                       'chat_conversations_device_len',
--                       'chat_conversations_current_page_len',
--                       'chat_conversations_visitor_name_len',
--                       'chat_conversations_visitor_email_len',
--                       'chat_conversations_unread_count_check',
--                       'chat_conversations_status_check');
--   -- expect 7
--
--   select indexdef from pg_indexes
--     where indexname = 'chat_conversations_status_idx';
--   -- expect a plain index, i.e. no "WHERE status = ..." predicate
--
--   select count(*) from chat_conversation_notes;    -- table exists
--   select count(*) from chat_visitor_activity;      -- table exists
--   select count(*) from chat_message_reactions;     -- table exists
-- ============================================================================
