begin;

-- Conversation status: 'open'/'closed' -> 'active'/'resolved'.
--
-- The column shipped in schema.sql as open/closed, but nothing in the codebase
-- ever wrote 'closed' -- it was a write-only value with no way to act on it.
-- 'active'/'resolved' names the two states the inbox actually needs to filter
-- on, so the admin can triage a queue instead of reading every thread.
--
-- The backfill runs before the constraint swap, otherwise every existing row
-- would violate the new CHECK and the ALTER would fail.

update public.chat_conversations set status = 'active' where status = 'open';
update public.chat_conversations set status = 'resolved' where status = 'closed';

-- The original constraint is unnamed, so Postgres auto-named it
-- 'chat_conversations_status_check'. drop ... if exists covers both that and a
-- hand-renamed variant only for the default name -- hence the explicit scan
-- below for any remaining CHECK on the column.
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
  -- visitor_name/visitor_email mention neither and cannot be dropped.
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

-- The inbox filters and searches on these columns, so index them. Both are
-- partial on the common case: most rows are 'active', and most rows have an
-- email, so indexing only the resolved/named rows keeps the index small.
create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status)
  where status = 'resolved';

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

commit;
