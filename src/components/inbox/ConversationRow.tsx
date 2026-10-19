import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Monogram from "@/components/inbox/Monogram";
import { formatFull, formatRelative } from "@/lib/chatFormat";
import { isArchived, unreadOf, visitorLabel, type Conversation } from "@/components/inbox/types";

interface ConversationRowProps {
  conversation: Conversation;
  selected: boolean;
  /** The admin has unsent text for this conversation. */
  draft: boolean;
  /** An archive or delete for this row is in flight. */
  busy: boolean;
  onSelect: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
}

/**
 * One conversation: who, when, and the last thing they said.
 *
 * The row is a button and the menu is a second button beside it, not inside it
 * -- a `<button>` cannot contain another one, and the menu is the only place
 * archive and delete live in the list. So the hit area is a grid with the tail
 * column reserved, and the menu is absolutely positioned over it.
 */
export default function ConversationRow({
  conversation,
  selected,
  draft,
  busy,
  onSelect,
  onArchive,
  onDelete,
}: ConversationRowProps) {
  const unread = unreadOf(conversation);
  const archived = isArchived(conversation);
  const when = conversation.last_message_at;
  const since = formatRelative(when);
  const name = visitorLabel(conversation);

  return (
    <li
      className="inbox-row"
      data-selected={selected}
      data-unread={unread > 0 ? "true" : undefined}
    >
      <button
        type="button"
        className="inbox-row-hit"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
      >
        <Monogram name={name} />
        <span className="inbox-row-body">
          <span className="inbox-row-name">{name}</span>
          <span className="inbox-row-preview">{conversation.last_message_preview}</span>
        </span>
        <span className="inbox-row-tail">
          <span className="inbox-row-time" title={formatFull(when)}>
            {since}
          </span>
          {unread > 0 ? (
            <Badge>{unread > 99 ? "99+" : unread}</Badge>
          ) : archived ? (
            <Badge variant="outline">filed</Badge>
          ) : draft ? (
            <Badge variant="outline">draft</Badge>
          ) : null}
        </span>
      </button>

      <div className="inbox-row-menu">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${name}`}
              icon={<MoreHorizontal size={15} />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              icon={archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              onSelect={() => onArchive(!archived)}
              disabled={busy}
            >
              {archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="quiet"
              icon={<Trash2 size={14} />}
              onSelect={onDelete}
              disabled={busy}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
