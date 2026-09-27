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
  visitor_name text,
  visitor_email text,
  session_started_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'waiting', 'assigned', 'resolved')),
  mode text not null default 'ai' check (mode in ('ai', 'takeover')),
  first_seen_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  unread_count integer not null default 0 check (unread_count >= 0),
  device text,
  current_page text,
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

create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status)
  where status = 'resolved';

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
