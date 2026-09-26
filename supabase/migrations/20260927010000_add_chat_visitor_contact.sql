begin;

-- Optional visitor contact details captured by the pre-chat form.
--
-- Both columns are nullable on purpose. Existing conversations predate this
-- form and have no name, and email was always optional -- so these must never
-- be treated as required by any read path, or every pre-existing conversation
-- would be filtered out of the inbox.

alter table public.chat_conversations
  add column if not exists visitor_name text,
  add column if not exists visitor_email text;

-- Guard rails only. Shape validation lives in api/chat.ts so the user-facing
-- error message is the one the visitor actually sees.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_conversations_visitor_name_len'
      and conrelid = 'public.chat_conversations'::regclass
  ) then
    alter table public.chat_conversations
      add constraint chat_conversations_visitor_name_len
      check (visitor_name is null or char_length(visitor_name) <= 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_conversations_visitor_email_len'
      and conrelid = 'public.chat_conversations'::regclass
  ) then
    alter table public.chat_conversations
      add constraint chat_conversations_visitor_email_len
      check (visitor_email is null or char_length(visitor_email) <= 254);
  end if;
end $$;

create index if not exists chat_conversations_visitor_name_idx
  on public.chat_conversations (visitor_name)
  where visitor_name is not null;

commit;
