begin;

-- Human takeover support.
--
-- 1. chat_messages.role needs a 'system' value so the "a human has joined"
--    announcement can live in the thread as its own entry, distinct from both
--    the AI's replies and the admin's own messages.
-- 2. chat_conversations.mode already exists from
--    20260925010000_add_chat_takeover_mode.sql. It is re-declared idempotently
--    here so this migration is self-sufficient if that one was skipped, and so
--    a fresh database built from schema.sql alone still works.

alter table public.chat_messages
  drop constraint if exists chat_messages_role_check;

alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('visitor', 'assistant', 'admin', 'system'));

alter table public.chat_conversations
  add column if not exists mode text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_conversations_mode_check'
      and conrelid = 'public.chat_conversations'::regclass
  ) then
    alter table public.chat_conversations
      add constraint chat_conversations_mode_check check (mode in ('ai', 'takeover'));
  end if;
end $$;

commit;
