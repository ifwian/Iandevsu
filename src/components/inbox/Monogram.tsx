import { cn } from "@/lib/cn";

interface MonogramProps {
  name: string;
  size?: "md" | "lg";
}

/**
 * A visitor's initial, as a CSS-drawn block.
 *
 * A conversation list is a list of people, and a list of people is scanned far
 * faster when each row has a fixed anchor than when it is text alone. There are
 * no avatars in `chat_conversations` -- only a name, sometimes null -- so this
 * derives one from the same string the row shows rather than inventing a second
 * identity.
 *
 * `aria-hidden` because the name is right beside it: announcing "A" before
 * "Ada Lovelace" is a stutter, not a label.
 */
export default function Monogram({ name, size = "md" }: MonogramProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={cn("inbox-monogram", size === "lg" && "inbox-monogram--lg")} aria-hidden="true">
      {initial}
    </span>
  );
}
