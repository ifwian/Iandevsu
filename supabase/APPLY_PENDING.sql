-- ============================================================================
-- PENDING MIGRATIONS -- paste this whole block into the Supabase SQL Editor
-- and run it once. Sections 1-3 were confirmed unapplied against the live
-- database on 2026-09-26; section 4 is the chat-inbox feature set.
--
-- Equivalent to running these three files in order:
--   supabase/migrations/20260928010000_add_chat_takeover_support.sql
--   supabase/migrations/20260929010000_migrate_chat_status_to_active_resolved.sql
--   supabase/migrations/20260930010000_add_chat_inbox_features.sql
--
-- Idempotent: safe to run more than once.
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
-- 2. status: 'open'/'closed' -> 'active'/'resolved'
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

alter table public.chat_conversations
  add constraint chat_conversations_status_check
  check (status in ('active', 'resolved'));

alter table public.chat_conversations
  alter column status set default 'active';

-- ---------------------------------------------------------------------------
-- 3. Indexes for the inbox's status filter and email search.
-- ---------------------------------------------------------------------------
create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status)
  where status = 'resolved';

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

-- ============================================================================
-- 4. Chat inbox features (unread counts, four-state status, admin notes,
--    visitor activity, message reactions).
--
-- Verbatim copy of supabase/migrations/20260930010000_add_chat_inbox_features.sql
-- so this file stays a single paste.
--
-- The API degrades gracefully without section 4: reads and conversation
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
--   select role, count(*) from chat_messages group by 1;
--   -- may include 'system'
--
--   insert into chat_conversations
--     (visitor_id, session_started_at, status, last_message_at, last_message_preview)
--   values ('__probe__', now(), 'assigned', now(), 'probe');
--   -- expect success; then:
--   delete from chat_conversations where visitor_id = '__probe__';
--
--   select count(*) from chat_conversation_notes;    -- table exists
--   select count(*) from chat_visitor_activity;      -- table exists
--   select count(*) from chat_message_reactions;     -- table exists
-- ============================================================================
