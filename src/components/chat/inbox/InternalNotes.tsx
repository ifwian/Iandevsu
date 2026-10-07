import { useState, type KeyboardEvent } from "react";
import { NotebookPen, Send } from "lucide-react";
import { formatRelative } from "@/lib/chatFormat";
import { MAX_NOTE_LENGTH, type Note } from "./types";

interface InternalNotesProps {
  notes: Note[];
  onAdd: (text: string) => Promise<void>;
  busy: boolean;
  error: string | null;
  disabled: boolean;
}

/**
 * Admin-only notes.
 *
 * Stored in their own table and never rendered anywhere a visitor can reach it
 * -- `chat_conversation_notes` has RLS enabled with no policies, so the only
 * path to these rows is the service-role key inside the serverless function.
 *
 * Appending rather than editing: a note is a log entry ("called back, left
 * voicemail"), and letting one be silently rewritten would destroy the reason
 * the history exists.
 */
export default function InternalNotes({ notes, onAdd, busy, error, disabled }: InternalNotesProps) {
  const [draft, setDraft] = useState("");

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setDraft("");
    await onAdd(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line. A note is one or two lines and
    // a stray newline in a single-line field is invisible in the saved value.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--gray-200)] pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <NotebookPen size={14} strokeWidth={1.8} aria-hidden="true" />
          internal notes
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--gray-400)]">
          Only you can see these. They are never sent to the visitor.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2" style={{ borderTop: "1px solid var(--gray-200)" }}>
        {notes.length === 0 ? (
          <p className="py-3 text-[11px] italic leading-relaxed text-[var(--gray-400)]">
            No notes yet. Jot down callbacks, context, or what you want to follow up on.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-2.5"
              >
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--ink)]">
                  {note.body}
                </p>
                <p
                  className="mt-1.5 text-[10px] uppercase tracking-[0.08em]"
                  style={{ color: "var(--gray-400)", fontFamily: "var(--font-mono)" }}
                >
                  {formatRelative(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 pt-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_NOTE_LENGTH}
          disabled={disabled || busy}
          rows={2}
          placeholder="Add a note..."
          aria-label="Add an internal note"
          className="min-h-16 w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-xs leading-relaxed outline-none placeholder:italic focus:border-[var(--ink)] disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[var(--gray-400)]">{draft.length} / {MAX_NOTE_LENGTH}</span>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!draft.trim() || busy || disabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gray-300)] px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-40"
          >
            <Send size={11} strokeWidth={1.8} />
            {busy ? "saving" : "save note"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[11px] leading-relaxed text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
