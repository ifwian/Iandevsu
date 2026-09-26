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
  session_started_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_conversations
  add column if not exists visitor_auth_id uuid;

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('visitor', 'assistant', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_conversations_last_message_at_idx
  on public.chat_conversations (last_message_at desc);

create index if not exists chat_conversations_visitor_auth_id_idx
  on public.chat_conversations (visitor_auth_id);

create index if not exists chat_conversations_status_idx
  on public.chat_conversations (status)
  where status = 'resolved';

create index if not exists chat_conversations_visitor_email_idx
  on public.chat_conversations (visitor_email)
  where visitor_email is not null;

create index if not exists chat_messages_conversation_created_at_idx
  on public.chat_messages (conversation_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

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
