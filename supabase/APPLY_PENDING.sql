begin;

alter table public.chat_messages
  drop constraint if exists chat_messages_role_check;

alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('visitor', 'assistant', 'admin', 'system'));

alter table public.chat_conversations
  add column if not exists mode text not null default 'ai';

alter table public.chat_conversations
  drop constraint if exists chat_conversations_mode_check;

alter table public.chat_conversations
  add constraint chat_conversations_mode_check
  check (mode in ('ai', 'takeover'));

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

alter table public.chat_conversations
  drop constraint if exists chat_conversations_status_check;

do $$
declare
  leftover text;
begin

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

update public.chat_conversations set status = 'active'   where status = 'open';
update public.chat_conversations set status = 'resolved' where status = 'closed';

alter table public.chat_conversations
  add constraint chat_conversations_status_check
  check (status in ('active', 'resolved'));

alter table public.chat_conversations
  alter column status set default 'active';

drop index if exists public.chat_conversations_status_idx;

create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status);

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

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

alter table public.chat_conversation_notes enable row level security;
alter table public.chat_visitor_activity enable row level security;
alter table public.chat_message_reactions enable row level security;

alter table public.chat_conversations
  add column if not exists archived_at timestamptz;

create index if not exists chat_conversations_archived_at_idx
  on public.chat_conversations (archived_at desc)
  where archived_at is not null;

commit;

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