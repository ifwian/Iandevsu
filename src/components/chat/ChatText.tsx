import { Fragment, useMemo, type ReactNode } from "react";

/**
 * Formatting for chat replies.
 *
 * The assistant writes the way chat assistants do: **bold**, `code`, bullet
 * lists, links. Rendered as plain text those arrive as raw asterisks and
 * unclickable URLs. This turns them into real elements.
 *
 * Nothing here ever produces HTML. Every piece becomes a React element, so a
 * reply containing `<script>` is shown as text. Links are limited to http(s) and
 * mailto, so `[click](javascript:...)` renders as plain text.
 *
 * Streaming-safe: a half-typed `**bol` is shown literally until its closing
 * `**` arrives, then it becomes bold. An unclosed ``` fence is treated as a code
 * block that is still being written.
 */

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; text: string };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const FENCE = /^\s*```/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (FENCE.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // the closing fence; absent while the reply is still streaming
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const isBullet = BULLET.test(line);
    if (isBullet || ORDERED.test(line)) {
      const pattern = isBullet ? BULLET : ORDERED;
      const items: string[] = [];
      while (i < lines.length) {
        const match = pattern.exec(lines[i]);
        if (!match) break;
        items.push(match[1]);
        i += 1;
      }
      blocks.push({ type: isBullet ? "ul" : "ol", items });
      continue;
    }

    // A paragraph runs until a blank line, a list or a code fence.
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i])
    ) {
      // A heading in a 360px panel would shout; keep it as bold text.
      const heading = HEADING.exec(lines[i]);
      paragraph.push(heading ? `**${heading[1]}**` : lines[i]);
      i += 1;
    }
    blocks.push({ type: "p", lines: paragraph });
  }

  return blocks;
}

/** http, https and mailto only. Anything else (javascript:, data:, relative) is not a link. */
function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? url.href : null;
  } catch {
    return null;
  }
}

function ChatLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="chat-link" href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
}

// Order matters: code, bold, markdown link, bare URL, italic.
const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>]+)|(\*[^*\s][^*\n]*\*)/g;

function renderInline(text: string, depth = 0): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    const full = match[0];
    const key = `${depth}-${n++}`;
    if (start > last) out.push(text.slice(last, start));

    if (match[1]) {
      out.push(
        <code key={key} className="chat-code">
          {full.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      const inner = full.slice(2, -2);
      out.push(<strong key={key}>{depth < 2 ? renderInline(inner, depth + 1) : inner}</strong>);
    } else if (match[3]) {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(full);
      const href = parts ? safeHref(parts[2]) : null;
      out.push(
        href && parts ? (
          <ChatLink key={key} href={href}>
            {parts[1]}
          </ChatLink>
        ) : (
          (parts?.[1] ?? full)
        ),
      );
    } else if (match[4]) {
      // Sentence punctuation after a URL belongs to the sentence, not the link.
      const trail = /[.,;:!?)\]'"]+$/.exec(full)?.[0] ?? "";
      const url = trail ? full.slice(0, -trail.length) : full;
      const href = safeHref(url);
      out.push(
        href ? (
          <ChatLink key={key} href={href}>
            {url}
          </ChatLink>
        ) : (
          url
        ),
      );
      if (trail) out.push(trail);
    } else if (match[5]) {
      const inner = full.slice(1, -1);
      out.push(<em key={key}>{depth < 2 ? renderInline(inner, depth + 1) : inner}</em>);
    }

    last = start + full.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderBlock(block: Block, index: number, caret: ReactNode): ReactNode {
  switch (block.type) {
    case "p":
      return (
        <p key={index}>
          {block.lines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {renderInline(line)}
            </Fragment>
          ))}
          {caret}
        </p>
      );
    case "ul":
    case "ol": {
      const Tag = block.type;
      return (
        <Tag key={index}>
          {block.items.map((item, i) => (
            <li key={i}>
              {renderInline(item)}
              {i === block.items.length - 1 ? caret : null}
            </li>
          ))}
        </Tag>
      );
    }
    case "code":
      return (
        <pre key={index}>
          <code>{block.text}</code>
          {caret}
        </pre>
      );
  }
}

interface ChatTextProps {
  text: string;
  /** Show the blinking caret at the end, while the reply is still streaming. */
  caret?: boolean;
  className?: string;
}

export default function ChatText({ text, caret = false, className = "" }: ChatTextProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  const mark = caret ? (
    <span className="chat-caret" aria-hidden="true">
      ▍
    </span>
  ) : null;

  return (
    <div className={`chat-text ${className}`.trim()}>
      {blocks.map((block, index) => renderBlock(block, index, index === blocks.length - 1 ? mark : null))}
    </div>
  );
}
