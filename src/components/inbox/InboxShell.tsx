import type { ReactNode } from "react";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonClass, Button } from "@/components/ui/button";

export type InboxPane = "list" | "thread";

interface InboxShellProps {
  unread: number;
  loading: boolean;
  pane: InboxPane;
  onRefresh: () => void;
  onSignOut: () => void;
  /** Full-width notice above the panes, e.g. a failed archive. */
  banner?: ReactNode;
  list: ReactNode;
  thread: ReactNode;
}

/**
 * The page frame: a top bar and the two panes.
 *
 * There used to be a third column for visitor details and notes, a stats row
 * above all three, and a floating header -- three ways to say "here is some
 * chrome", arranged around two things the page is actually for. This is the top
 * bar and the two panes; everything else moved into the thread header or out.
 *
 * `pane` only matters below 900px, where the two panes cannot coexist and one of
 * them is hidden by CSS. Above that both are always drawn, so the attribute is
 * ignored rather than driving the layout.
 */
export default function InboxShell({
  unread,
  loading,
  pane,
  onRefresh,
  onSignOut,
  banner,
  list,
  thread,
}: InboxShellProps) {
  return (
    <>
      <header className="inbox-topbar">
        <Link to="/" aria-label="Back to portfolio" className={buttonClass("ghost", "icon-sm")}>
          <ArrowLeft size={15} />
        </Link>

        <div className="inbox-topbar-identity">
          <h1 className="inbox-topbar-heading">Inbox</h1>
          <span className="inbox-topbar-sub">
            {unread > 0 ? `${unread} unread` : "portfolio visitors"}
          </span>
        </div>

        <div className="inbox-topbar-actions">
          {/* Manual refresh is kept because the poll can be up to 3s behind and
              the admin sometimes knows a message is coming. */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh conversations"
            onClick={onRefresh}
            icon={<RefreshCw size={15} className={loading ? "inbox-spin" : undefined} />}
          />
          <Button variant="outline" size="sm" onClick={onSignOut} icon={<LogOut size={14} />}>
            Sign out
          </Button>
        </div>
      </header>

      {banner}

      <div className="inbox-shell" data-pane={pane}>
        {list}
        {thread}
      </div>
    </>
  );
}
