begin;

-- Archive marker for the admin inbox.
--
-- Archive is deliberately NOT a `status` value. Every status change is
-- announced to the visitor as a stored 'system' message ("Ian marked this
-- conversation as resolved"), and archiving is housekeeping the visitor has no
-- business seeing: it is the admin saying "I am done looking at this", not
-- something that changes the conversation. Keeping it in its own column also
-- means the two are independent -- a thread can be archived while still active,
-- and unarchiving never has to guess what the status used to be.
--
-- `archived_at` rather than `archived boolean`: the same work for the server,
-- but it records when, which the inbox can sort on later without a schema
-- change.
--
-- Additive and idempotent, like every migration here. The API degrades
-- gracefully while it is unapplied: `archived_at` is in the optional column
-- group in api/chat.ts, so reads fall back to the base column set and every
-- conversation simply reads as unarchived. Only the two writes (archive /
-- unarchive) answer 502, and they say which migration is missing.

alter table public.chat_conversations
  add column if not exists archived_at timestamptz;

comment on column public.chat_conversations.archived_at is
  'Admin-side archive marker. NULL = in the inbox, a timestamp = archived. Never shown to the visitor.';

-- Partial on the non-null side: almost every row is NULL, and an index over
-- that is just a bigger empty index.
create index if not exists chat_conversations_archived_at_idx
  on public.chat_conversations (archived_at desc)
  where archived_at is not null;

commit;
