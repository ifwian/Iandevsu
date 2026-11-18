import { useCallback, useState } from "react";

/**
 * One unsent reply per conversation.
 *
 * With a single `reply` string, switching conversations either carried the half
 * typed text over to the next visitor (and it could be sent to the wrong person)
 * or threw it away. Here the draft belongs to the conversation it was typed in:
 * switch away and back and it is still there; switch to someone else and their
 * box starts with their own draft (or empty).
 *
 * `conversationId` decides which draft is shown, so there is nothing to "save" or
 * "load" on selection. Do NOT also clear the reply when selecting a conversation.
 */
export function useReplyDrafts(conversationId: string) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reply = conversationId ? (drafts[conversationId] ?? "") : "";

  const setReply = useCallback(
    (value: string) => {
      if (!conversationId) return;
      setDrafts((current) => (current[conversationId] === value ? current : { ...current, [conversationId]: value }));
    },
    [conversationId],
  );

  const clearReply = useCallback(
    (id: string = conversationId) => {
      if (!id) return;
      setDrafts((current) => {
        if (!(id in current)) return current;
        const { [id]: _removed, ...rest } = current;
        return rest;
      });
    },
    [conversationId],
  );

  /** True when this conversation has unsent text, for a "draft" marker in the list. */
  const hasDraft = useCallback((id: string) => Boolean(drafts[id]?.trim()), [drafts]);

  return { reply, setReply, clearReply, hasDraft };
}
