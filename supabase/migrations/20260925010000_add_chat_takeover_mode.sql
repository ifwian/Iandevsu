begin;

alter table public.chat_conversations
  add column if not exists mode text not null default 'ai';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_conversations_mode_check'
      and conrelid = 'public.chat_conversations'::regclass
  ) then
    alter table public.chat_conversations
      add constraint chat_conversations_mode_check check (mode in ('ai', 'takeover'));
  end if;
end $$;

commit;
