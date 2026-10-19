import { RotateCcw, X } from "lucide-react";

interface ChatPanelHeaderProps {
  /** Who the visitor is talking to, e.g. PROFILE.goesBy. */
  name: string;
  subtitle?: string;
  avatarSrc?: string;
  onNewChat?: () => void;
  onClose: () => void;
}

/**
 * The top of the chat panel: the avatar, a clear name, an "Active now" line,
 * and two icon buttons -- styled as a shadcn header over the site's tokens
 * (`bg-card`, `text-muted-foreground`, `border-border`, `hover:bg-accent`),
 * so it retints with the light/dark toggle rather than hardcoding colours.
 *
 * The green dot is the one thing that is not monochrome: `--status-active` is
 * the palette's sanctioned chat-status exception (the same token the inbox
 * triage pills use), and the visitor-facing header is where "someone is here
 * right now" earns it. The ping is the strip's existing indicator pattern
 * from HeroStats, at the same 8px size.
 *
 * The aria-labels ("Start a new chat", "Close chat") are hooks that
 * chat-ux.css uses to enlarge these buttons on touch screens, so keep them.
 */
export default function ChatPanelHeader({ name, subtitle = "Active now", avatarSrc, onNewChat, onClose }: ChatPanelHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-muted font-semibold"
        aria-hidden="true"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="" width={40} height={40} className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight tracking-tight text-card-foreground">
          {name}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs leading-none text-muted-foreground">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: "var(--status-active)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--status-active)" }}
            />
          </span>
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start a new chat"
            title="Start a new chat"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RotateCcw size={16} strokeWidth={1.8} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
