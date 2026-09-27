import { REACTION_GLYPH, REACTION_KINDS, reactionLabel, type Reaction, type ReactionKind } from "@/lib/chatFormat";

interface ReactionBarProps {
  messageId: string | number;
  /** Every reaction in the thread; this bar picks out its own message. */
  reactions: Reaction[];
  /** Identifies the current user, so the bar can show what *they* picked. */
  actor: string;
  onToggle: (kind: ReactionKind, active: boolean) => void;
  /** True while the toggle is in flight, to stop a double-submit. */
  busy?: boolean;
  /** Which edge of the bubble the row hangs off. */
  align?: "start" | "end";
}

/**
 * The 👍 / ❤️ row that appears under a message on hover.
 *
 * Rendered for every message the viewer is allowed to react to, and revealed by
 * `.chat-reaction-bar` on hover or focus -- with one exception: a row the
 * viewer has already used is forced visible via `data-active`, so a chosen
 * reaction never disappears the moment the pointer moves away.
 *
 * The count is shown next to the glyph rather than as a filled pill, so the
 * un-hovered state stays quiet until it has something to say.
 */
export default function ReactionBar({
  messageId,
  reactions,
  actor,
  onToggle,
  busy = false,
  align = "start",
}: ReactionBarProps) {
  const mine = new Set(
    reactions
      .filter((reaction) => String(reaction.message_id) === String(messageId) && reaction.actor === actor)
      .map((reaction) => reaction.kind)
  );
  const counts = new Map<ReactionKind, number>();
  for (const reaction of reactions) {
    if (String(reaction.message_id) !== String(messageId)) continue;
    counts.set(reaction.kind, (counts.get(reaction.kind) ?? 0) + 1);
  }

  const hasAny = counts.size > 0;

  return (
    <div
      className="chat-reaction-bar"
      data-active={hasAny ? "true" : undefined}
      style={{ justifyContent: align === "end" ? "flex-end" : "flex-start" }}
    >
      {REACTION_KINDS.map((kind) => {
        const active = mine.has(kind);
        const count = counts.get(kind) ?? 0;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onToggle(kind, !active)}
            disabled={busy}
            aria-pressed={active}
            aria-label={`${active ? "Remove" : "Add"} ${reactionLabel(kind)} reaction`}
            title={reactionLabel(kind)}
            className="chat-reaction-chip disabled:opacity-50"
          >
            <span aria-hidden="true">{REACTION_GLYPH[kind]}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
