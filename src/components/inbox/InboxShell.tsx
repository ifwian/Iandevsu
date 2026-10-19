import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import "./inbox-ui.css";

export interface InboxStat {
  label: string;
  value: number;
  /** Highlights the card, e.g. when its filter is the one applied. */
  active?: boolean;
  /** Makes the card a button (e.g. apply that filter). */
  onClick?: () => void;
}

interface InboxShellProps {
  title: string;
  subtitle?: string;
  /** The back button, rendered before the title. */
  back?: ReactNode;
  /** Buttons on the right of the header (refresh, sign out...). */
  actions?: ReactNode;
  stats?: InboxStat[];
  list: ReactNode;
  thread: ReactNode;
  /** The visitor details; docked as a third pane on wide screens. */
  aside?: ReactNode;
  /** Below 900px only one pane shows at a time. */
  mobilePane?: "list" | "thread";
}

/**
 * The inbox page frame.
 *
 * It owns the spacing that the page was missing: a centred 72rem container with
 * generous top padding, so nothing touches the screen edge or sits under the site
 * header. Panels are cards in a two-pane grid (list, thread), with the visitor
 * details as an optional third pane. Content stays with the page: this only lays
 * it out.
 */
export default function InboxShell({ title, subtitle, back, actions, stats, list, thread, aside, mobilePane = "list" }: InboxShellProps) {
  return (
    <div className="inbox-page">
      <header className="inbox-head">
        <div className="inbox-head-main">
          {back}
          <div>
            <h1 className="inbox-title">{title}</h1>
            {subtitle ? <p className="inbox-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="inbox-head-actions">{actions}</div> : null}
      </header>

      {stats && stats.length > 0 ? (
        <ul className="inbox-stats" aria-label="Inbox summary">
          {stats.map((stat) => (
            <li key={stat.label}>
              {stat.onClick ? (
                <button
                  type="button"
                  className="inbox-stat"
                  data-active={stat.active ? "true" : undefined}
                  aria-pressed={Boolean(stat.active)}
                  onClick={stat.onClick}
                >
                  <span className="inbox-stat-value">{stat.value}</span>
                  <span className="inbox-stat-label">{stat.label}</span>
                </button>
              ) : (
                <div className="inbox-stat">
                  <span className="inbox-stat-value">{stat.value}</span>
                  <span className="inbox-stat-label">{stat.label}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="inbox-grid" data-pane={mobilePane} data-aside={aside ? "true" : undefined}>
        <Card className="inbox-pane inbox-pane--list">{list}</Card>
        <Card className="inbox-pane inbox-pane--thread">{thread}</Card>
        {aside ? <Card className="inbox-pane inbox-pane--aside">{aside}</Card> : null}
      </div>
    </div>
  );
}
