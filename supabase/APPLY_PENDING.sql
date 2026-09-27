-- ============================================================================
-- PENDING MIGRATIONS -- paste this whole block into the Supabase SQL Editor
-- and run it once. Both statements were confirmed unapplied against the live
-- database on 2026-09-26.
--
-- Equivalent to running these two files in order:
--   supabase/migrations/20260928010000_add_chat_takeover_support.sql
--   supabase/migrations/20260929010000_migrate_chat_status_to_active_resolved.sql
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

commit;

-- ============================================================================
-- Verify (all four should return 0 rows / no error):
--
--   select status, count(*) from chat_conversations group by 1;
--   -- expect only 'active' | 'resolved'
--
--   select role, count(*) from chat_messages group by 1;
--   -- may include 'system'
--
--   insert into chat_conversations
--     (visitor_id, session_started_at, status, last_message_at, last_message_preview)
--   values ('__probe__', now(), 'active', now(), 'probe');
--   -- expect success; then:
--   delete from chat_conversations where visitor_id = '__probe__';
-- ============================================================================
