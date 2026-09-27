begin;

-- Chat inbox features: unread counts, a four-state status vocabulary, admin
-- internal notes, a visitor activity timeline, and message reactions.
--
-- Every change here is additive and idempotent, and the API degrades
-- gracefully when it has not been applied: `api/chat.ts` selects the new
-- columns in a second attempt and falls back to the base column set, so an
-- unapplied migration costs the new features and nothing else.
--
-- All writes and reads go through the service-role key in the function, so the
-- new tables get RLS enabled with *no* policies on purpose. That is a
-- deliberate deny-all: the visitor's browser never talks to these tables
-- directly, and internal notes must never be reachable by a visitor even if
-- someone later hands the browser an anon key and wires up a client.

-- ---------------------------------------------------------------------------
-- 1. Status vocabulary
-- ---------------------------------------------------------------------------
-- The inbox needs four triage states rather than two:
--   active    -- open, nobody is engaged yet
--   waiting   -- a human was pulled in, then stepped away; visitor is waiting
--   assigned  -- a human has taken the conversation over
--   resolved  -- closed
-- 'active' and 'resolved' already exist; the two new values are additive.

alter table public.chat_conversations
  drop constraint if exists chat_conversations_status_check;

alter table public.chat_conversations
  add constraint chat_conversations_status_check
  check (status in ('active', 'waiting', 'assigned', 'resolved'));

-- ---------------------------------------------------------------------------
-- 2. Unread counter
-- ---------------------------------------------------------------------------
-- Incremented on every stored visitor message, reset when the admin opens the
-- thread. Kept as a counter rather than derived from `admin_last_read_at`
-- because the visitor list renders up to 50 rows at once: a per-row COUNT over
-- chat_messages on every 3s poll is not affordable, and read-modify-write
-- here happens on the write path where the race window is one visitor message.

alter table public.chat_conversations
  add column if not exists unread_count integer not null default 0;

alter table public.chat_conversations
  drop constraint if exists chat_conversations_unread_count_check;

alter table public.chat_conversations
  add constraint chat_conversations_unread_count_check check (unread_count >= 0);

create index if not exists chat_conversations_unread_idx
  on public.chat_conversations (unread_count desc)
  where unread_count > 0;

-- ---------------------------------------------------------------------------
-- 3. Visitor panel fields
-- ---------------------------------------------------------------------------
-- first_seen_at is a copy of created_at, not an alias: the inbox needs it in
-- the same select as everything else, and created_at is not guaranteed to exist
-- on older deployments. Backfilled so existing rows are never null.
-- device and current_page are written by the visitor_activity event.

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

-- ---------------------------------------------------------------------------
-- 4. Admin internal notes
-- ---------------------------------------------------------------------------
-- A conversation-scoped log rather than a single `notes` column on
-- chat_conversations: notes are appended over time and each one needs its own
-- timestamp to be useful, and an append-only table keeps them out of the
-- visitor's reach entirely.

create table if not exists public.chat_conversation_notes (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_conversation_notes_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists chat_conversation_notes_conversation_created_at_idx
  on public.chat_conversation_notes (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Visitor activity timeline
-- ---------------------------------------------------------------------------
-- Page-by-page history. `kind` distinguishes a route change from opening the
-- chat, which is an event rather than a page.

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

-- ---------------------------------------------------------------------------
-- 6. Message reactions
-- ---------------------------------------------------------------------------
-- The composite primary key makes a reaction idempotent: one row per
-- (message, kind, actor), so a double-click cannot double-count, and
-- toggling is a delete rather than an update. `actor` is 'admin' for the
-- dashboard and the visitor_id for a visitor, which keeps the two from ever
-- colliding and stops a visitor from inflating the admin's own count.

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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.chat_conversation_notes enable row level security;
alter table public.chat_visitor_activity enable row level security;
alter table public.chat_message_reactions enable row level security;

commit;
