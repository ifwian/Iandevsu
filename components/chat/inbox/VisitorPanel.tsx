import { Globe, Mail, MonitorSmartphone, Navigation, Repeat, User } from "lucide-react";
import { formatFull, formatRelative, pageLabel } from "@/lib/chatFormat";
import { normalizeContact, type VisitorInfo } from "./types";

interface VisitorPanelProps {
  visitor: VisitorInfo;
  /** Set by the parent so "copy email" can share one confirmation timer. */
  copied: boolean;
  onCopyEmail: () => void;
  /**
   * False when a parent already owns the scroll region and the section label.
   *
   * See `ActivityTimeline`'s prop of the same name. Mounted in the inbox's
   * context panel, this component's own `overflow-y-auto` and its own "visitor"
   * heading both duplicate the tab strip above it, so `contained={false}` drops
   * the heading, the border under it, and the inner scroll, leaving just the
   * fields. It still renders its own heading when `contained`, so the component
   * remains usable standalone.
   */
  contained?: boolean;
}

interface FieldProps {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
  /** Renders in the monospace label register; used for the raw visitor id. */
  mono?: boolean;
}

function Field({ icon: Icon, label, children, mono = false }: FieldProps) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon size={13} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-[var(--gray-400)]" />
      <div className="min-w-0 flex-1">
        <p className="micro-label" style={{ color: "var(--gray-400)" }}>
          {label}
        </p>
        <div
          className={`mt-0.5 break-words text-xs leading-relaxed ${mono ? "break-all" : ""}`}
          style={{ color: "var(--ink)", fontFamily: mono ? "var(--font-mono)" : undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Right-hand visitor panel.
 *
 * Answers the questions a support inbox is actually asked -- who is this, when
 * did we first see them, where are they, what are they on -- without leaving
 * the thread. Every field is nullable in the API, and each one degrades to an
 * explicit "not recorded" rather than being hidden, so an empty panel is never
 * mistaken for a panel that failed to load.
 *
 * `first seen` and `sessions` are the two fields that need explaining: they are
 * derived from the visitor's Supabase identity across *all* their chats, not
 * just this thread, so a returning visitor is visibly a returning visitor.
 */
export default function VisitorPanel({ visitor, copied, onCopyEmail, contained = true }: VisitorPanelProps) {
  const email = normalizeContact(visitor.email);
  const page = normalizeContact(visitor.currentPage);

  return (
    <div className={contained ? "flex min-h-0 flex-col" : undefined}>
      {contained && (
        <div className="shrink-0 border-b border-[var(--gray-200)] pb-3">
          <h2 className="text-sm font-semibold text-[var(--ink)]">visitor</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--gray-400)]">
            Context for the thread on the left.
          </p>
        </div>
      )}

      <div
        className={contained ? "min-h-0 flex-1 overflow-y-auto py-1" : "py-1"}
        style={contained ? { borderTop: "1px solid var(--gray-200)" } : undefined}
      >
        <Field icon={User} label="name">
          {normalizeContact(visitor.name) ?? <span className="italic text-[var(--gray-400)]">not given</span>}
        </Field>

        <Field icon={Mail} label="email">
          {email ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <a
                href={`mailto:${email}`}
                className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--ink)]"
              >
                {email}
              </a>
              <button
                type="button"
                onClick={onCopyEmail}
                className="inline-flex items-center gap-1 rounded border border-[var(--gray-300)] px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] transition-colors hover:border-[var(--ink)]"
              >
                {copied ? "copied" : "copy"}
              </button>
            </span>
          ) : (
            <span className="italic text-[var(--gray-400)]">not given</span>
          )}
        </Field>

        <Field icon={Navigation} label="current page">
          {page ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span>{pageLabel(page)}</span>
              <span className="text-[var(--gray-400)]">·</span>
              <span className="text-[var(--gray-400)]">{page}</span>
            </span>
          ) : (
            <span className="italic text-[var(--gray-400)]">not tracked yet</span>
          )}
        </Field>

        <Field icon={MonitorSmartphone} label="device">
          {visitor.device ?? <span className="italic text-[var(--gray-400)]">not recorded</span>}
        </Field>

        <Field icon={Globe} label="first seen" >
          <span title={formatFull(visitor.firstSeenAt)}>
            {formatRelative(visitor.firstSeenAt)}
            <span className="text-[var(--gray-400)]"> · {formatFull(visitor.firstSeenAt)}</span>
          </span>
        </Field>

        <Field icon={Repeat} label="sessions">
          {visitor.sessionCount === 1
            ? "1 · this is their first chat"
            : `${visitor.sessionCount} · returning visitor`}
        </Field>

        <Field icon={User} label="visitor id" mono>
          {visitor.visitorId}
        </Field>
      </div>
    </div>
  );
}
