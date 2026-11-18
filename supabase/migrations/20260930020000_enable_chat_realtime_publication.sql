-- Put the chat tables in the supabase_realtime publication.
--
-- The visitor widget and the admin inbox both subscribe to
-- `postgres_changes` on these tables, and Supabase does NOT add a table to the
-- publication when you create it. A table that is not a member simply never
-- emits, so the subscription connects successfully, looks healthy, and never
-- fires an event. That is why the takeover announcement ("Ian has joined the
-- chat") only ever reached visitors on the 2.5s poll, and why the inbox's own
-- postgres_changes handlers are inert: it subscribes as `anon`, which the
-- `to authenticated` SELECT policies do not admit, so the poll is what keeps
-- that page live.
--
-- Enabling this does not widen who can read what. Realtime applies the same RLS
-- policies for `authenticated` subscribers, so a visitor still only receives
-- rows from their own conversations. It does mean the table must be in the
-- publication for the visitor side to work at all.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is already a
-- member, so each one is guarded. The whole block is skipped when the
-- publication does not exist at all (a plain local Postgres rather than
-- Supabase), rather than failing the migration.

do $$
declare
  target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not present -- skipping, realtime is a Supabase-only feature.';
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
      raise notice 'added public.% to supabase_realtime', target;
    end if;
  end loop;
end $$;

-- Verify (expect two rows):
--
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime'
--      and schemaname = 'public'
--      and tablename in ('chat_messages', 'chat_conversations');
