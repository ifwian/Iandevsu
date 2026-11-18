import { useEffect } from "react";

/**
 * Puts the unread count in the browser tab title: "(3) Chat inbox".
 *
 * The inbox is the kind of page that sits in a background tab all day. Without
 * this, a visitor writing in is invisible until someone happens to look. The
 * title is restored to what it was when the page unmounts, so the count never
 * leaks onto the portfolio's own tab title.
 */
export function useUnreadTitle(unread: number, baseTitle = "Chat inbox") {
  useEffect(() => {
    const original = document.title;
    return () => {
      document.title = original;
    };
  }, []);

  useEffect(() => {
    const badge = unread > 99 ? "99+" : String(unread);
    document.title = unread > 0 ? `(${badge}) ${baseTitle}` : baseTitle;
  }, [unread, baseTitle]);
}
