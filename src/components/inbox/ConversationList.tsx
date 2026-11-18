import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ConversationRow from "@/components/inbox/ConversationRow";
import EmptyState from "@/components/inbox/EmptyState";
import { type Conversation } from "@/components/inbox/types";

/** The two positions the list has. Archive is not a status, so it is not mixed in with them. */
export type InboxTab = "open" | "archived";

const TABS: readonly { value: InboxTab; label: string }[] = [
  { value: "open", label: "open" },
  { value: "archived", label: "archived" },
];

interface ConversationListProps {
  /** Already filtered to the visible tab. */
  conversations: Conversation[];
  /** Everything the server sent, so "nothing yet" and "nothing matches" differ. */
  loadedCount: number;
  /** Visible count in the other tab, for the segment labels. */
  counts: Record<InboxTab, number>;
  unread: number;
  selectedId: string;
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  tab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  hasDraft: (conversationId: string) => boolean;
  onSelect: (conversationId: string) => void;
  onArchive: (conversation: Conversation, archived: boolean) => void;
  onDelete: (conversation: Conversation) => void;
  /** Row with an archive or delete in flight. */
  busyId: string | null;
}

/**
 * The list pane: search, the two filter positions, and the conversations.
 *
 * Search stays pinned at the top because filtering is the one control the admin
 * reaches for while the list is long, and the rows are the only thing that
 * scrolls.
 */
export default function ConversationList({
  conversations,
  loadedCount,
  counts,
  unread,
  selectedId,
  loading,
  query,
  onQueryChange,
  tab,
  onTabChange,
  hasDraft,
  onSelect,
  onArchive,
  onDelete,
  busyId,
}: ConversationListProps) {
  const term = query.trim();
  const showSkeletons = loading && loadedCount === 0;
  const showEmpty = !showSkeletons && conversations.length === 0;

  return (
    <Card className="inbox-list">
      <div className="inbox-list-head">
        <div className="inbox-list-headline">
          <span className="inbox-list-label">conversations</span>
          {unread > 0 ? (
            <Badge title={`${unread} unread visitor message${unread === 1 ? "" : "s"}`}>
              {unread > 99 ? "99+" : `${unread} unread`}
            </Badge>
          ) : null}
        </div>

        <div className="inbox-search">
          <Search size={14} aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="search name or email"
            aria-label="Search conversations by visitor name or email"
          />
          {term ? (
            <button
              type="button"
              className="inbox-search-clear"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        <div className="inbox-seg" role="group" aria-label="Filter conversations">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="inbox-seg-item"
              aria-pressed={tab === value}
              onClick={() => onTabChange(value)}
            >
              {label}
              <span className="inbox-seg-count">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="inbox-list-body">
        {showSkeletons ? (
          <div aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="inbox-skeleton-row">
                <Skeleton className="inbox-monogram" />
                <div className="inbox-row-body">
                  <Skeleton className="inbox-skeleton-name" />
                  <Skeleton className="inbox-skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {showEmpty ? (
          <EmptyState
            icon={<Search size={22} strokeWidth={1.5} />}
            title={term ? "No matches" : tab === "archived" ? "Nothing archived" : "No conversations yet"}
            hint={
              term
                ? `Nothing in ${tab} matches "${term}".`
                : tab === "archived"
                  ? "Conversations you archive land here. Visitors never see it."
                  : "Visitor chats appear here as soon as someone writes to Ian."
            }
          />
        ) : null}

        {conversations.length > 0 ? (
          <ul className="inbox-rows">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                selected={selectedId === conversation.id}
                draft={hasDraft(conversation.id)}
                busy={busyId === conversation.id}
                onSelect={() => onSelect(conversation.id)}
                onArchive={(archived) => onArchive(conversation, archived)}
                onDelete={() => onDelete(conversation)}
              />
            ))}
          </ul>
        ) : null}
      </ScrollArea>
    </Card>
  );
}
