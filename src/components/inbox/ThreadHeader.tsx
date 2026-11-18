import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
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
import { formatDayMonth, formatFull, pageLabel } from "@/lib/chatFormat";
import { isArchived, normalizeContact, visitorLabel, type Conversation, type VisitorInfo } from "@/components/inbox/types";

interface ThreadHeaderProps {
  conversation: Conversation;
  visitor: VisitorInfo | null;
  takeoverActive: boolean;
  takeoverBusy: boolean;
  /** An archive or delete for this conversation is in flight. */
  busy: boolean;
  copied: boolean;
  onBack: () => void;
  onToggleTakeover: () => void;
  onCopyEmail: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
}

/**
 * Who the conversation is with, and the four things that can be done to it.
 *
 * Everything about the visitor that the page still shows is here -- name, email,
 * when they were first seen, the last page they were on -- because the third
 * column that used to hold it was mostly empty space for two lines of text.
 * Takeover is a real button rather than an icon: it is the one action that
 * changes how the conversation behaves for the visitor, and it has a state
 * worth reading at a glance.
 */
export default function ThreadHeader({
  conversation,
  visitor,
  takeoverActive,
  takeoverBusy,
  busy,
  copied,
  onBack,
  onToggleTakeover,
  onCopyEmail,
  onArchive,
  onDelete,
}: ThreadHeaderProps) {
  const name = visitorLabel(conversation);
  const email = normalizeContact(visitor?.email ?? conversation.visitor_email);
  const archived = isArchived(conversation);
  const firstSeen = visitor?.firstSeenAt || conversation.first_seen_at || conversation.session_started_at;
  const firstSeenShort = formatDayMonth(firstSeen);
  const firstSeenTitle = formatFull(firstSeen);
  const page = visitor?.currentPage ?? conversation.current_page ?? null;

  return (
    <div className="inbox-thread-head">
      <div className="inbox-thread-identity">
        <Button
          className="inbox-thread-back"
          variant="ghost"
          size="icon-sm"
          aria-label="Back to conversations"
          onClick={onBack}
          icon={<ArrowLeft size={15} />}
        />

        <Monogram name={name} size="lg" />

        <div className="inbox-thread-name">
          <h2>{name}</h2>
          {email ? (
            <span className="inbox-email">
              <span className="inbox-email-address">{email}</span>
              <button
                type="button"
                className="inbox-copy"
                onClick={onCopyEmail}
                aria-label={copied ? "Email copied" : `Copy ${email}`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
          ) : null}
        </div>

        <div className="inbox-thread-actions">
          <Button
            variant={takeoverActive ? "default" : "outline"}
            size="sm"
            disabled={takeoverBusy}
            aria-pressed={takeoverActive}
            onClick={onToggleTakeover}
            icon={
              takeoverActive ? (
                <span className="inbox-live-dot" aria-hidden="true" />
              ) : (
                <MessageSquare size={14} />
              )
            }
          >
            {takeoverActive ? "answering" : "take over"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Conversation actions"
                icon={<MoreHorizontal size={16} />}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                icon={archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                onSelect={() => onArchive(!archived)}
                disabled={busy}
              >
                {archived ? "Restore to inbox" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                tone="quiet"
                icon={<Trash2 size={14} />}
                onSelect={onDelete}
                disabled={busy}
              >
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="inbox-thread-meta">
        <span title={firstSeenTitle || undefined}>first seen {firstSeenShort || "unknown"}</span>
        {page ? <span>last page {pageLabel(page)}</span> : null}
        {archived ? <Badge variant="secondary">archived</Badge> : null}
        {takeoverActive ? <span>you are answering as a human</span> : null}
      </p>
    </div>
  );
}
