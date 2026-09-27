import { createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Profile facts are inlined rather than imported from `content/profile.ts`.
 *
 * A relative import out of `/api` compiles to a bare `require()` that Vercel's
 * `@vercel/node` builder resolves with `@vercel/nft`. The tracer ships the
 * `.ts` file but leaves the emitted specifier untouched, so the lambda dies on
 * `MODULE_NOT_FOUND` during module evaluation -- before the handler runs --
 * which surfaces as a top-level `FUNCTION_INVOCATION_FAILED`. Keeping this
 * file self-contained removes that whole failure mode.
 *
 * Keep in sync with `content/profile.ts` (used by the front-end).
 */
const PROFILE = {
  name: "Marianne Napaño",
  goesBy: "Ian",
  headline: "Computer Science student & aspiring web developer",
  location: "Calamba, Philippines",
  bio: [
    "Computer Science student at City College of Calamba (2025-2029), exploring web development and software engineering.",
    "Currently learning React, Node.js, and SQL, on top of a solid HTML/CSS/JavaScript/Git foundation.",
    "Enjoys building small, practical projects to learn by doing rather than just reading about it.",
    "Interests outside code: photography, reading, gaming, badminton, music.",
  ],
  stack: {
    core: ["HTML", "CSS", "JavaScript"],
    tools: ["Git", "GitHub", "Figma"],
    learning: ["React", "Node.js", "SQL", "Java", "Python"],
    skills: ["C++", "Java", "Python", "React", "HTML", "CSS", "JavaScript", "web development"],
  },
  projects: [
    "Coffee Shop Website -- a responsive landing page practicing HTML/CSS layout (not deployed yet).",
    "Calculator -- a JavaScript DOM manipulation exercise (not deployed yet).",
    "To-Do List -- practicing arrays and local storage (not deployed yet).",
    "Weather App -- fetching and displaying live data from a weather API (not deployed yet).",
  ],
  certifications: ["HackerRank: Python (Basic), Java (Basic), JavaScript (Intermediate), C# (Basic)"],
  links: {
    email: "iandevsu@gmail.com",
    github: "https://github.com/ifwian",
    linkedin: "https://www.linkedin.com/in/ifwiannn/",
  },
} as const;

function buildProfileContext(): string {
  return `
Name: ${PROFILE.name} (goes by "${PROFILE.goesBy}")
Headline: ${PROFILE.headline}
Location: ${PROFILE.location}

Bio:
${PROFILE.bio.map((line) => `- ${line}`).join("\n")}

Tech stack:
- Core: ${PROFILE.stack.core.join(", ")}
- Skills: ${PROFILE.stack.skills.join(", ")}
- Tools: ${PROFILE.stack.tools.join(", ")}
- Currently learning: ${PROFILE.stack.learning.join(", ")}

Projects:
${PROFILE.projects.map((p) => `- ${p}`).join("\n")}

Certifications:
${PROFILE.certifications.map((c) => `- ${c}`).join("\n")}

Contact: GitHub ${PROFILE.links.github} · LinkedIn ${PROFILE.links.linkedin}
`.trim();
}

const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
];
const MAX_TURNS = 12;
const MAX_MESSAGE_LENGTH = 600;
const NOTIFICATION_TIMEOUT_MS = 3500;
const NOTIFICATION_EMAIL = "iandevsu@gmail.com";
const SUPABASE_TIMEOUT_MS = 5000;
const GEMINI_HANDSHAKE_TIMEOUT_MS = 20000;
const MAX_ERROR_CAUSE_DEPTH = 4;
const MAX_ERROR_STACK_LENGTH = 1200;
const GEMINI_STREAM_IDLE_TIMEOUT_MS = 30000;
const MAX_UPSTREAM_DETAIL_LENGTH = 300;

/** Matches the `chat_conversation_notes_body_len` CHECK constraint. */
const MAX_NOTE_LENGTH = 2000;

/**
 * Route path -> the label the activity timeline shows. Duplicated from
 * `lib/chatFormat.ts` on purpose: this file must stay free of relative imports
 * out of `/api` (see the note at the top), so it cannot share the constant.
 * Unknown routes fall through to the raw path rather than being dropped, so a
 * new page shows up in the timeline the day it ships.
 */
function pageLabel(path: string): string {
  const normalized = path.split("?")[0]?.split("#")[0] || "/";
  const known: Record<string, string> = {
    "/": "Home",
    "/projects": "Projects",
    "/chat-inbox": "Chat Inbox",
  };
  return known[normalized] ?? normalized;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

type StoredRole = "visitor" | "assistant" | "admin" | "system";

/**
 * Triage state of a conversation. The column was originally ('open','closed'),
 * but 'closed' was never written by any code path, so the vocabulary was
 * renamed in 20260929010000_migrate_chat_status_to_active_resolved.sql and
 * extended to four states in 20260930010000_add_chat_inbox_features.sql.
 *
 *   active   -- open, nobody has engaged yet
 *   waiting  -- a human took over, then stepped back; the visitor is waiting
 *   assigned -- a human currently owns the conversation
 *   resolved -- closed
 */
type ConversationStatus = "active" | "waiting" | "assigned" | "resolved";

const CONVERSATION_STATUSES: readonly ConversationStatus[] = [
  "active",
  "waiting",
  "assigned",
  "resolved",
];

const CONVERSATION_DEFAULT_STATUS: ConversationStatus = "active";

/** Set by admin_takeover; `mode` records the same thing, this is the triage view. */
const CONVERSATION_ASSIGNED_STATUS: ConversationStatus = "assigned";

/** Set by admin_release: still needs a human, but nobody is on it. */
const CONVERSATION_WAITING_STATUS: ConversationStatus = "waiting";

function isConversationStatus(value: unknown): value is ConversationStatus {
  return (
    value === "active" || value === "waiting" || value === "assigned" || value === "resolved"
  );
}

/**
 * Message reactions. Must match `chat_message_reactions.kind`; the CHECK
 * constraint on the column is the real guard, this just avoids a pointless
 * round trip for a value the client could only get wrong deliberately.
 */
type ReactionKind = "thumbs_up" | "heart";

const REACTION_KINDS: readonly ReactionKind[] = ["thumbs_up", "heart"];

function isReactionKind(value: unknown): value is ReactionKind {
  return value === "thumbs_up" || value === "heart";
}

/** Actor key for a reaction made from the admin dashboard. */
const ADMIN_ACTOR = "admin";

type ActivityKind = "page" | "chat";

function isActivityKind(value: unknown): value is ActivityKind {
  return value === "page" || value === "chat";
}

interface ConversationRecord {
  id: string;
  visitor_id: string;
  visitor_auth_id: string | null;
  session_started_at: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  /** Optional contact details -- absent on conversations created before the pre-chat form. */
  visitor_name: string | null;
  /** Nullable: the email field is optional, and may be blank. */
  visitor_email: string | null;
  /**
   * 'ai' or 'takeover'. Read with a graceful fallback, because the column only
   * exists once supabase/migrations/2026092*_add_chat_takeover*.sql has been
   * applied -- a missing column makes PostgREST reject the whole query.
   */
  mode?: string;
  /**
   * Optional inbox columns from 20260930010000_add_chat_inbox_features.sql.
   *
   * `unread_count` is deliberately tri-state: `undefined` means the column is
   * not there (migration not applied) and 0 means it is there and the thread is
   * read. Collapsing the two would make an unmigrated database claim every
   * thread is read, which is the wrong failure direction for a badge.
   */
  unread_count?: number;
  /** First time this visitor was ever seen, across every session. */
  first_seen_at?: string;
  /** Coarse device label derived server-side from the user agent. */
  device?: string | null;
  /** Route the visitor was last on, reported by the widget. */
  current_page?: string | null;
}

interface StoredReaction {
  message_id: RowId;
  kind: ReactionKind;
  actor: string;
}

interface StoredNote {
  id: RowId;
  conversation_id: string;
  body: string;
  created_at: string;
}

interface StoredActivity {
  id: RowId;
  conversation_id: string;
  kind: ActivityKind;
  page: string;
  label: string;
  created_at: string;
}

/** Cross-session identity, derived from the Supabase anonymous auth user. */
interface VisitorSessionStats {
  sessionCount: number;
  firstSeenAt: string;
}

/**
 * chat_messages.id is a Postgres `bigint`. PostgREST renders bigint as a JSON
 * number in most configurations, but it renders it as a *string* when the value
 * exceeds JS safe-integer range or when the deployment opts into string
 * numerics. Requiring a number here silently dropped every message in the
 * transcript, so accept either and never filter on id shape.
 */
type RowId = string | number;

interface StoredMessage {
  id: RowId;
  conversation_id: string;
  role: StoredRole;
  body: string;
  created_at: string;
}

type ChatEvent =
  | "chat_started"
  | "message"
  | "admin_reply"
  | "admin_takeover"
  | "admin_release"
  | "admin_status"
  | "admin_delete"
  | "admin_read"
  | "admin_note"
  | "reaction"
  | "visitor_activity";

function isChatEvent(value: unknown): value is ChatEvent {
  return (
    value === "chat_started" ||
    value === "message" ||
    value === "admin_reply" ||
    value === "admin_takeover" ||
    value === "admin_release" ||
    value === "admin_status" ||
    value === "admin_delete" ||
    value === "admin_read" ||
    value === "admin_note" ||
    value === "reaction" ||
    value === "visitor_activity"
  );
}

interface ChatRequest {
  messages?: unknown;
  visitorId?: unknown;
  sessionStartedAt?: unknown;
  event?: unknown;
  conversationId?: unknown;
  visitorAuthId?: unknown;
  text?: unknown;
  password?: unknown;
  visitorName?: unknown;
  visitorEmail?: unknown;
  status?: unknown;
  /** reaction: the chat_messages row being reacted to. */
  messageId?: unknown;
  /** reaction: 'thumbs_up' | 'heart'. */
  kind?: unknown;
  /** reaction: true to add, false to remove. */
  active?: unknown;
  /** visitor_activity: the route the visitor is on. */
  page?: unknown;
  /** visitor_activity: 'page' for a route change, 'chat' for opening the chat. */
  activity?: unknown;
}

/**
 * Built on first chat request rather than at module scope, so no prompt
 * assembly can ever abort module evaluation.
 */
let cachedSystemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (cachedSystemPrompt !== null) return cachedSystemPrompt;
  try {
    cachedSystemPrompt = `
You are the AI assistant for Marianne Napaño's personal portfolio. You are chatting as Ian, Marianne's go-to name, on her portfolio website. Keep answers warm, direct, and conversational, usually in 2-4 short sentences unless the visitor asks for detail.

Marianne is a Computer Science student at City College of Calamba in Calamba, Philippines. She works with C++, Java, Python, React, HTML, CSS, JavaScript, Git, and web development. Her projects include responsive coffee shop websites, calculators, to-do lists, and weather apps. She enjoys learning by building practical projects and is exploring web development and software engineering.

Here are the verified portfolio facts to draw from. Do not invent credentials, jobs, dates, availability, rates, or unrelated personal details:

${buildProfileContext()}

Rules:
- Answer as Ian in first person unless the visitor directly asks whether this is a bot.
- If asked directly whether you are a bot or Marianne, be honest that you are an AI assistant using facts Marianne provided, not Marianne typing live.
- If a fact is not available, say so and suggest contacting Marianne at ${PROFILE.links.email}.
- Do not write code or perform unrelated tasks; redirect to questions about Marianne's background, projects, skills, or portfolio.
`.trim();
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "ian-chat-prompt",
        message: error instanceof Error ? error.message : String(error),
      })
    );
    cachedSystemPrompt =
      "You are Ian, the AI assistant for Marianne Napaño's portfolio. " +
      `Answer warmly and briefly. Direct portfolio questions to ${PROFILE.links.email}.`;
  }
  return cachedSystemPrompt;
}

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

/**
 * Flattens a thrown value into something JSON.stringify keeps intact.
 *
 * Node's fetch (undici) puts the diagnosable part on `cause`: a SystemError
 * with `code` like ENOTFOUND / ECONNREFUSED / ETIMEDOUT / CERT_HAS_EXPIRED, and
 * a controller abort surfaces as a DOMException named AbortError. Reading only
 * `error.message` loses the code, which is the whole reason for catching.
 */
function describeError(error: unknown, depth = 0): Record<string, unknown> {
  const described: Record<string, unknown> = {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
  };

  if (error instanceof Error && typeof error.stack === "string") {
    described.stack = error.stack.slice(0, MAX_ERROR_STACK_LENGTH);
  }

  // A bare object (not an Error) can still carry a code, so read it off `this`.
  const systemish = error as { code?: unknown; errno?: unknown; syscall?: unknown };
  if (typeof systemish.code === "string" || systemish.errno !== undefined) {
    described.code = typeof systemish.code === "string" ? systemish.code : null;
    described.errno =
      typeof systemish.errno === "string" || typeof systemish.errno === "number"
        ? systemish.errno
        : null;
    described.syscall = typeof systemish.syscall === "string" ? systemish.syscall : null;
  }

  if (depth < MAX_ERROR_CAUSE_DEPTH) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause !== null && cause !== undefined) {
      described.cause = describeError(cause, depth + 1);
    }
  }

  return described;
}

/** True for the controller abort in requestGemini, i.e. the handshake timed out. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * The *shape* of GEMINI_API_KEY, never any part of its value. This is what
 * separates the failure modes that are otherwise indistinguishable from the
 * outside: unset, set-but-whitespace, pasted with surrounding quotes (which
 * authenticates as an invalid key), or truncated.
 */
function describeApiKey(): Record<string, unknown> {
  const raw = process.env.GEMINI_API_KEY;

  if (raw === undefined) return { present: false, reason: "unset" };

  const trimmed = raw.trim();
  if (trimmed === "") {
    return { present: false, reason: "empty or whitespace only", rawLength: raw.length };
  }

  return {
    present: true,
    length: trimmed.length,
    quoted: /^["'].*["']$/.test(trimmed),
    hasWhitespaceInside: /\s/.test(trimmed),
  };
}

/** Which env the key is supposed to come from, since that differs per runtime. */
function describeRuntime(): Record<string, unknown> {
  return {
    vercelEnv: process.env.VERCEL_ENV || null,
    nodeEnv: process.env.NODE_ENV || null,
  };
}

function getModelCandidates(): string[] {
  const configured = (process.env.GEMINI_MODEL || DEFAULT_MODEL).replace(/^models\//, "");
  return Array.from(new Set([configured, DEFAULT_MODEL, ...FALLBACK_MODELS]));
}

async function requestGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  // Bound the handshake only; the timer is cleared once headers arrive so it can
  // never cut a healthy stream short. Without it a stalled upstream connection
  // pins the invocation until the platform kills it, which Vercel reports as
  // FUNCTION_INVOCATION_FAILED.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_HANDSHAKE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: getSystemPrompt() }] },
        contents: messages.map((message) => ({
          role: message.role === "model" ? "model" : "user",
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function parseBody(req: VercelRequest): ChatRequest {
  if (typeof req.body === "string") {
    try {
      const parsed: unknown = JSON.parse(req.body);
      return parsed && typeof parsed === "object" ? (parsed as ChatRequest) : {};
    } catch {
      return {};
    }
  }

  return req.body && typeof req.body === "object" ? (req.body as ChatRequest) : {};
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; text?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "model") &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length > 0
  );
}

function getVisitorId(value: unknown): string {
  if (typeof value === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(value)) return value;
  return "legacy-visitor";
}

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
// Deliberately permissive: reject the obvious mistakes without rejecting valid
// addresses. Over-strict email regexes lock real people out of a chat.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Strips control characters and collapses runs of whitespace. */
function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getVisitorName(value: unknown): string | null {
  const name = cleanText(value, MAX_NAME_LENGTH);
  return name ? name : null;
}

function getVisitorEmail(value: unknown): string | null {
  const email = cleanText(value, MAX_EMAIL_LENGTH);
  if (!email) return null;
  if (!EMAIL_PATTERN.test(email)) {
    console.warn(JSON.stringify({ scope: "ian-chat-contact", note: "discarded malformed email" }));
    return null;
  }
  return email.toLowerCase();
}

function getSessionStartedAt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Date.now();
}

/**
 * Supabase configuration.
 *
 * Reads the canonical names first, then the aliases people actually set. The
 * most common misconfiguration is setting only the VITE_ vars (which the
 * browser bundle needs) and none of the server-side ones -- the function
 * cannot see the browser's env, so persistence silently degrades to off.
 */

const SUPABASE_URL_KEYS = [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
] as const;

const SUPABASE_SERVICE_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_KEY",
] as const;

const SUPABASE_AUTH_KEYS = [
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function readEnv(keys: readonly string[]): { name: string; value: string } | null {
  for (const name of keys) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function getSupabaseUrl(): { name: string; value: string } | null {
  const found = readEnv(SUPABASE_URL_KEYS);
  return found ? { name: found.name, value: normalizeSupabaseUrl(found.value) } : null;
}

function getServiceRoleKey(): string | undefined {
  return readEnv(SUPABASE_SERVICE_KEYS)?.value;
}

/** Identifies *visitors* (to bind a conversation to them). Not used for admin. */
function getSupabaseAuthKey(): string | undefined {
  return readEnv(SUPABASE_AUTH_KEYS)?.value;
}

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  if (!url || !serviceRoleKey) {
    reportMissingSupabaseEnv(url, serviceRoleKey);
    return null;
  }
  return { url: url.value, serviceRoleKey };
}

let missingEnvReported = false;

/**
 * Names the exact variables that are absent. Reported once per instance so the
 * Vercel function logs state the cause instead of a bare 503.
 */
function reportMissingSupabaseEnv(url: { name: string; value: string } | null, key: string | undefined): void {
  if (missingEnvReported) return;
  missingEnvReported = true;
  const missing: string[] = [];
  if (!url) missing.push(`one of: ${SUPABASE_URL_KEYS.join(", ")}`);
  if (!key) missing.push(`one of: ${SUPABASE_SERVICE_KEYS.join(", ")}`);
  console.error(
    JSON.stringify({
      scope: "ian-chat-supabase-config",
      error: "Supabase is not configured; persistence is disabled",
      missing,
      hint: "VITE_SUPABASE_URL alone is not enough -- the serverless function needs its own SUPABASE_URL and service-role key",
    })
  );
}

type SupabaseEnvStatus = {
  ok: boolean;
  url: { name: string; value: string } | null;
  serviceKeyName: string | null;
  authKeyName: string | null;
  missing: string[];
};

/** Presence-only report for diagnostics. Never returns any secret value. */
function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const url = getSupabaseUrl();
  const serviceRoleKey = readEnv(SUPABASE_SERVICE_KEYS);
  const authKey = readEnv(SUPABASE_AUTH_KEYS);
  const missing: string[] = [];
  if (!url) missing.push(`one of: ${SUPABASE_URL_KEYS.join(", ")}`);
  if (!serviceRoleKey) missing.push(`one of: ${SUPABASE_SERVICE_KEYS.join(", ")}`);
  return {
    ok: Boolean(url && serviceRoleKey),
    url,
    serviceKeyName: serviceRoleKey?.name ?? null,
    authKeyName: authKey?.name ?? null,
    missing,
  };
}

function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseConfig());
}

/** Host only, so the diagnostics response can confirm the project without
 *  echoing a full URL that may embed credentials. */
function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Names the missing variables in the 503 so the cause is visible in the UI. */
function supabaseNotConfiguredBody(): { error: string; missing: string[] } {
  const status = getSupabaseEnvStatus();
  return {
    error: "Supabase is not configured. Chat history is not being saved.",
    missing: status.missing,
  };
}

/**
 * PostgREST error bodies look like
 *   { code, details, hint, message }
 * and `details` is long (it echoes the whole failing row). Truncating the raw
 * body therefore cut off `message` -- the only field that says *why* -- which
 * is how a CHECK-constraint rejection managed to look like a silent no-op.
 * These fields are logged individually and never truncated.
 */
function describeSupabaseError(body: string, status: number, path: string, method: string): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // not JSON; fall through to the raw snippet
  }

  if (parsed && typeof parsed === "object") {
    const e = parsed as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const message = typeof e.message === "string" ? e.message : "";
    if (message) {
      console.error(
        JSON.stringify({
          scope: "ian-chat-supabase",
          status,
          method,
          path,
          code: typeof e.code === "string" ? e.code : null,
          message,
          details: typeof e.details === "string" ? e.details.slice(0, MAX_UPSTREAM_DETAIL_LENGTH) : null,
          hint: typeof e.hint === "string" ? e.hint : null,
        })
      );
      return message;
    }
  }

  console.error(
    JSON.stringify({
      scope: "ian-chat-supabase",
      status,
      method,
      path,
      message: "unparseable error body",
      detail: body.slice(0, MAX_UPSTREAM_DETAIL_LENGTH),
    })
  );
  return body.slice(0, MAX_UPSTREAM_DETAIL_LENGTH);
}

async function supabaseRequest(path: string, init: RequestInit = {}): Promise<unknown | null> {
  const config = getSupabaseConfig();
  if (!config) {
    console.error(
      JSON.stringify({
        scope: "ian-chat-supabase-config",
        message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set -- no chat data can be read or written",
        path,
      })
    );
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  const method = init.method || "GET";

  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      describeSupabaseError(body, response.status, path, method);
      return null;
    }

    if (response.status === 204) return null;
    return await response.json().catch(() => null);
  } catch (error) {
    // Previously a bare `catch { return null }`: a DNS failure, a timeout or a
    // bad URL all looked identical to "nothing to do".
    console.error(
      JSON.stringify({
        scope: "ian-chat-supabase",
        method,
        path,
        message: error instanceof Error ? error.message : String(error),
        note: "request threw before a response was received",
      })
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getRequestQuery(req: VercelRequest): URLSearchParams {
  const query = (req as unknown as { query?: Record<string, string | string[] | undefined> }).query;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        if (value[0]) params.set(key, value[0]);
      } else if (value) {
        params.set(key, value);
      }
    }
    return params;
  }

  return new URL(req.url || "/", "http://localhost").searchParams;
}

/**
 * Newer Supabase projects issue publishable keys instead of a legacy anon key,
 * so fall back through the variants rather than silently failing every signed-in
 * visitor lookup when only one of them is set. This identifies *visitors* (to
 * bind a conversation to them); it is no longer part of the admin decision.
 */
async function getSupabaseUserId(req: VercelRequest): Promise<string | null> {
  const config = getSupabaseConfig();
  const authKey = getSupabaseAuthKey();
  const authorization = readHeader(req, "authorization");
  if (!config || !authKey || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: authKey, Authorization: authorization },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json().catch(() => null);
    if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") return null;
    return data.id;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------------------------------------------------------------------
 * Admin auth: one password -> one short-lived signed session.
 *
 * The admin types CHAT_ADMIN_PASSWORD once. The browser never stores that
 * password; it stores the signed session returned by admin_login. The signing
 * key is derived from the password itself, so there is no second secret to
 * configure and rotating the password invalidates every existing session.
 * ------------------------------------------------------------------------ */

const DEV_ADMIN_PASSWORD = "dev-admin";
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 8;
/** See storeAdminLoginAttempt: bounds memory when keys are forged. */
const ADMIN_LOGIN_MAX_TRACKED_KEYS = 4096;

const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function isProduction(): boolean {
  // VERCEL_ENV is authoritative when present: it is "production", "preview" or
  // "development", so any value other than "production" -- preview in
  // particular -- is a deployment that is not local development.
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

/**
 * True on any Vercel deployment, including preview.
 *
 * This is deliberately separate from isProduction: a preview deployment is not
 * production, but it is very much *not* the developer's own machine. It has a
 * public URL, so treating it as a place where a committed fallback password may
 * be used would hand every visitor who has read this repository full access to
 * the inbox.
 */
function isDeployed(): boolean {
  return Boolean(process.env.VERCEL_ENV || process.env.VERCEL || process.env.CI);
}

/**
 * Returns the configured admin password, or the development-only default.
 * Deliberately returns null on any deployment when unset: a hardcoded fallback
 * that ships to prod would be a publicly known admin password sitting in the
 * git history and the deployed bundle -- and preview deployments have public
 * URLs, so "not production" is not a safe place to leave it enabled.
 */
function getAdminPassword(): string | null {
  const configured = process.env.CHAT_ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  return isDeployed() || isProduction() ? null : DEV_ADMIN_PASSWORD;
}

function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Case-insensitive header read. Node lowercases incoming header names, so
 * `req.headers.authorization` is normally enough -- but auth decisions should
 * not depend on that normalization holding across every adapter.
 */
function readHeader(req: VercelRequest, name: string): string | undefined {
  const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
  if (!headers) return undefined;
  const direct = headers[name];
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct)) return direct[0];
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : typeof value === "string" ? value : undefined;
    }
  }
  return undefined;
}

function getBearerToken(req: VercelRequest): string | null {
  const authorization = readHeader(req, "authorization");
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  const value = authorization.slice(7).trim();
  return value || null;
}

/**
 * Identifies the caller for the login throttle.
 *
 * The transport address is the only value the client cannot choose, so it is
 * the primary key. `x-forwarded-for` is deliberately NOT trusted: Vercel
 * appends the real client address to whatever the client already sent rather
 * than replacing it, so `x-forwarded-for[0]` is attacker-controlled. Keying on
 * it gave every guess attempt a fresh bucket, which made the throttle a no-op
 * against a single shared secret.
 *
 * The forwarded value is still used as a *secondary* key, because on Vercel the
 * transport address is the proxy's own and would otherwise collapse every
 * visitor into one bucket.
 */
function getClientKeys(req: VercelRequest): string[] {
  const socketAddress = req.socket?.remoteAddress ?? "";
  const forwarded = readHeader(req, "x-forwarded-for");
  const claimed = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";

  return socketAddress ? [`socket:${socketAddress}`, `forwarded:${claimed}`] : [`forwarded:${claimed}`];
}

function signAdminSession(expiresAt: number, password: string): string {
  const payload = String(expiresAt);
  const signature = createHmac("sha256", password).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Best-effort brute-force brake. In-memory only, so it resets when a cold
 * instance recycles -- it raises the cost of a naive sweep, it is not a hard
 * limit. A durable store would be needed for that.
 *
 * Every key in the set counts toward the limit, so forging a new
 * x-forwarded-for cannot buy a fresh budget: the socket key still carries the
 * previous failures.
 */
function isAdminLoginThrottled(keys: readonly string[]): boolean {
  const now = Date.now();
  pruneAdminLoginAttempts(now);
  return keys.some((key) => {
    const entry = adminLoginAttempts.get(key);
    return entry !== undefined && now <= entry.resetAt && entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS;
  });
}

function recordAdminLoginFailure(keys: readonly string[]): void {
  const now = Date.now();
  pruneAdminLoginAttempts(now);
  for (const key of keys) {
    const entry = adminLoginAttempts.get(key);
    if (!entry || now > entry.resetAt) {
      storeAdminLoginAttempt(key, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
      continue;
    }
    entry.count += 1;
  }
}

function clearAdminLoginFailures(keys: readonly string[]): void {
  for (const key of keys) adminLoginAttempts.delete(key);
}

/**
 * Drops windows that have already elapsed.
 *
 * Without this the map is a memory leak: an attacker cycling x-forwarded-for
 * values adds an entry per forged value and nothing ever removes one, because
 * the lookup path only ever revisits keys it already knows about.
 */
function pruneAdminLoginAttempts(now: number): void {
  for (const [key, entry] of adminLoginAttempts) {
    if (now > entry.resetAt) adminLoginAttempts.delete(key);
  }
}

/**
 * Hard ceiling on tracked keys.
 *
 * Pruning alone still lets a forger add one entry per distinct header value
 * inside a single 15-minute window, and the prune above is a full scan -- so
 * unbounded growth would be a memory and CPU lever aimed squarely at the login
 * endpoint. Past the ceiling the map is reset instead: that forfeits the
 * accumulated counts, but only for an attacker already spending thousands of
 * requests a minute to get there, and it bounds the cost of the next request.
 */
function storeAdminLoginAttempt(key: string, entry: { count: number; resetAt: number }): void {
  if (adminLoginAttempts.size >= ADMIN_LOGIN_MAX_TRACKED_KEYS) adminLoginAttempts.clear();
  adminLoginAttempts.set(key, entry);
}

function issueAdminSession(password: string): string {
  return signAdminSession(Date.now() + ADMIN_SESSION_TTL_MS, password);
}

/** Validates the signed session; the raw password is never accepted here. */
function isValidAdminSession(req: VercelRequest): boolean {
  const token = getBearerToken(req);
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = getAdminPassword();
  if (!expected) return false;

  const expectedSignature = createHmac("sha256", expected).update(payload).digest("base64url");
  return safeEquals(signature, expectedSignature);
}

async function hasAdminAccess(req: VercelRequest): Promise<boolean> {
  if (isValidAdminSession(req)) return true;
  console.warn(JSON.stringify({ scope: "ian-chat-admin", denied: "no-valid-session" }));
  return false;
}

function isConversationRecord(value: unknown): value is ConversationRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.visitor_id === "string" &&
    (typeof candidate.visitor_auth_id === "string" || candidate.visitor_auth_id === null) &&
    typeof candidate.session_started_at === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.last_message_at === "string" &&
    typeof candidate.last_message_preview === "string" &&
    // Contact details are optional, so accept a missing key, null, or a string.
    // Requiring a string here would drop every conversation created before the
    // pre-chat form existed. Same reasoning for the inbox columns, which only
    // exist once their migration has been applied.
    isOptionalText(candidate.visitor_name) &&
    isOptionalText(candidate.visitor_email) &&
    isOptionalText(candidate.device) &&
    isOptionalText(candidate.current_page) &&
    isOptionalText(candidate.first_seen_at) &&
    (candidate.unread_count === undefined ||
      candidate.unread_count === null ||
      typeof candidate.unread_count === "number" ||
      typeof candidate.unread_count === "string")
  );
}

/** Absent, null, or a string -- used for optional columns. */
function isOptionalText(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isRowId(value: unknown): value is RowId {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function isStoredRole(value: unknown): value is StoredRole {
  return value === "visitor" || value === "assistant" || value === "admin" || value === "system";
}

function isStoredMessage(value: unknown): value is StoredMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    isStoredRole(candidate.role) &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

function isStoredReaction(value: unknown): value is StoredReaction {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.message_id) &&
    isReactionKind(candidate.kind) &&
    typeof candidate.actor === "string" &&
    candidate.actor.length > 0
  );
}

function isStoredNote(value: unknown): value is StoredNote {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

function isStoredActivity(value: unknown): value is StoredActivity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    isActivityKind(candidate.kind) &&
    typeof candidate.page === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.created_at === "string"
  );
}

const CONVERSATION_COLUMNS =
  "id,visitor_id,visitor_auth_id,visitor_name,visitor_email,session_started_at,status,last_message_at,last_message_preview";

/**
 * Columns that only exist once a migration has been applied: `mode` from the
 * takeover migrations, the rest from 20260930010000_add_chat_inbox_features.
 *
 * They travel as one group so a conversation is read in at most two queries
 * (this set, then the base set) rather than one per missing column.
 */
const CONVERSATION_OPTIONAL_COLUMNS = "mode,unread_count,first_seen_at,device,current_page";

let missingOptionalColumnsReported = false;

/**
 * Reads rows, retrying without the optional column set when PostgREST rejects
 * it. Selecting a column that does not exist fails the *entire* query, so
 * without this an unapplied migration would take down every read rather than
 * just the features those columns belong to.
 *
 * When the retry is what succeeded, the missing columns are filled with neutral
 * defaults so callers never have to distinguish "absent" from "empty" -- except
 * for `unread_count`, which is left `undefined` on purpose (see ConversationRecord).
 */
async function selectRows(
  filter: string,
  tail: string
): Promise<{ rows: unknown[]; hasOptional: boolean }> {
  // `filter` is a PostgREST filter string with no leading "?" and possibly
  // empty, so the separator has to be conditional -- "?&select=" is legal but
  // sloppy, and every query here is already a hot path.
  const head = `chat_conversations?${filter ? `${filter}&` : ""}select=`;
  const withOptional = await supabaseRequest(
    `${head}${CONVERSATION_COLUMNS},${CONVERSATION_OPTIONAL_COLUMNS}${tail}`
  );
  if (Array.isArray(withOptional)) return { rows: withOptional, hasOptional: true };

  const withoutOptional = await supabaseRequest(`${head}${CONVERSATION_COLUMNS}${tail}`);
  if (Array.isArray(withoutOptional)) {
    if (!missingOptionalColumnsReported) {
      missingOptionalColumnsReported = true;
      console.warn(
        JSON.stringify({
          scope: "ian-chat-inbox",
          note: "optional conversation columns unavailable -- run supabase/migrations/20260930010000_add_chat_inbox_features.sql (unread badges, visitor panel and reactions will be inert)",
        })
      );
    }
    return { rows: withoutOptional, hasOptional: false };
  }

  return { rows: [], hasOptional: false };
}

/** Applies the fallback values for a row read without the optional columns. */
function withOptionalDefaults(row: ConversationRecord, hasOptional: boolean): ConversationRecord {
  if (hasOptional) {
    return {
      ...row,
      // PostgREST can hand back a bigint-ish number as a string; the badge
      // needs a real number or it renders as "3" either way but compares
      // wrongly against 0.
      unread_count: typeof row.unread_count === "number" ? row.unread_count : Number(row.unread_count ?? 0) || 0,
    };
  }
  return { ...row, mode: "ai", device: null, current_page: null };
}

/**
 * Reads a conversation, retrying without the optional columns when PostgREST
 * rejects them. `filter` is the filter string (no leading "?"), `tail` the part
 * after `select=` that the caller owns.
 */
async function selectConversation(
  filter: string,
  tail: string
): Promise<ConversationRecord | null> {
  const { rows, hasOptional } = await selectRows(filter, tail);
  const found = rows.find(isConversationRecord);
  return found ? withOptionalDefaults(found, hasOptional) : null;
}

function isTakeover(conversation: ConversationRecord | null): boolean {
  return conversation?.mode === "takeover";
}

async function findConversationByVisitor(visitorId: string): Promise<ConversationRecord | null> {
  return selectConversation(`visitor_id=eq.${encodeURIComponent(visitorId)}`, "&limit=1");
}

async function findConversationById(conversationId: string): Promise<ConversationRecord | null> {
  return selectConversation(`id=eq.${encodeURIComponent(conversationId)}`, "&limit=1");
}

interface VisitorContact {
  name: string | null;
  email: string | null;
}

/**
 * Creates the conversation row.
 *
 * The inbox columns (`first_seen_at`, `unread_count`) are sent on the first
 * attempt and dropped on the second. Postgres rejects a whole INSERT over one
 * unknown column, so without the retry an unapplied
 * 20260930010000_add_chat_inbox_features migration would break the chat
 * outright -- a 503 on the visitor's first message, which is a far worse
 * failure than the two columns being unavailable. This is the same
 * optional-column contract the reads already follow, applied to writes.
 */
async function insertConversation(
  visitorId: string,
  visitorAuthId: string | null,
  sessionStartedAt: number,
  contact: VisitorContact
): Promise<unknown[] | null> {
  const base = {
    visitor_id: visitorId,
    visitor_auth_id: visitorAuthId,
    visitor_name: contact.name,
    visitor_email: contact.email,
    session_started_at: new Date(sessionStartedAt).toISOString(),
    status: CONVERSATION_DEFAULT_STATUS,
    last_message_at: new Date().toISOString(),
    last_message_preview: "Visitor opened chat",
  };

  const send = (body: Record<string, unknown>) =>
    supabaseRequest("chat_conversations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });

  // Spelled out rather than relying on the column defaults, so the value is
  // there even on a database where the default was never altered.
  const withInboxColumns = await send({
    ...base,
    first_seen_at: new Date(sessionStartedAt).toISOString(),
    unread_count: 0,
  });
  if (Array.isArray(withInboxColumns)) return withInboxColumns;

  console.warn(
    JSON.stringify({
      scope: "ian-chat-inbox",
      note: "conversation insert rejected the inbox columns -- run supabase/migrations/20260930010000_add_chat_inbox_features.sql (unread badges and the visitor panel will be inert)",
    })
  );
  const legacy = await send(base);
  return Array.isArray(legacy) ? legacy : null;
}

async function ensureConversation(
  visitorId: string,
  visitorAuthId: string | null,
  sessionStartedAt: number,
  contact: VisitorContact = { name: null, email: null }
): Promise<ConversationRecord | null> {
  const existing = await findConversationByVisitor(visitorId);
  if (existing) {
    return applyVisitorContact(existing, contact);
  }
  if (!hasSupabaseConfig()) return null;

  const result = await insertConversation(visitorId, visitorAuthId, sessionStartedAt, contact);
  if (!result) return null;

  // The row was written (2xx) but does not match the expected shape. This used
  // to return null with no log at all, so a successful insert looked
  // identical to a failed one.
  const created = result.find(isConversationRecord);
  if (!created) {
    console.error(
      JSON.stringify({
        scope: "ian-chat-supabase",
        message: "conversation insert returned 2xx but the row failed shape validation",
        visitorId,
        keysReturned: result.length ? Object.keys(result[0] as object) : null,
      })
    );
  }
  return created ? withOptionalDefaults(created, true) : null;
}

/**
 * Backfills contact details onto a conversation that already exists -- a
 * returning visitor who completes the pre-chat form after their first visit.
 * Only ever fills a blank, so it cannot overwrite anything already captured.
 */
async function applyVisitorContact(
  conversation: ConversationRecord,
  contact: VisitorContact
): Promise<ConversationRecord> {
  if (!hasSupabaseConfig()) return conversation;

  const patch: Record<string, string> = {};
  if (contact.name && !conversation.visitor_name) patch.visitor_name = contact.name;
  if (contact.email && !conversation.visitor_email) patch.visitor_email = contact.email;
  if (!Object.keys(patch).length) return conversation;

  const updated = await supabaseRequest(
    `chat_conversations?id=eq.${encodeURIComponent(conversation.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }
  );
  if (!Array.isArray(updated)) return conversation;

  const next = updated.find(isConversationRecord);
  if (!next) return conversation;
  return {
    ...conversation,
    visitor_name: next.visitor_name ?? conversation.visitor_name,
    visitor_email: next.visitor_email ?? conversation.visitor_email,
  };
}

async function insertStoredMessage(
  conversationId: string,
  role: StoredRole,
  body: string
): Promise<StoredMessage | null> {
  const result = await supabaseRequest("chat_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ conversation_id: conversationId, role, body }),
  });
  if (!Array.isArray(result)) return null;
  return result.find(isStoredMessage) || null;
}

/**
 * Bumps the conversation's activity timestamp and preview.
 *
 * `status` is opt-in on purpose. It used to be hardcoded to "open" on every
 * touch, which meant an admin replying to an already-resolved thread silently
 * reopened it. Only a *visitor* message should resurrect a resolved thread --
 * see persistVisitorMessage -- so every other caller leaves status untouched.
 */
async function touchConversation(
  conversationId: string,
  body: string,
  status?: ConversationStatus
): Promise<void> {
  const patch: Record<string, string> = {
    last_message_at: new Date().toISOString(),
    last_message_preview: truncate(body, 180),
  };
  if (status) patch.status = status;

  await supabaseRequest(`chat_conversations?id=eq.${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

/**
 * Increments the unread badge.
 *
 * Read-modify-write rather than a database-side increment: PostgREST has no
 * arithmetic, and the alternative (deriving unread from a `last_admin_read_at`
 * column with a per-row COUNT) turns every 3-second inbox poll into 50
 * aggregate queries. The lost-update window is one visitor message and only
 * matters if the same thread is open in two admin tabs, where the next message
 * corrects the count anyway.
 *
 * No-op when the column is absent -- detected from `unread_count` being
 * `undefined` on the record rather than guessed at.
 */
async function bumpUnreadCount(conversation: ConversationRecord): Promise<void> {
  if (conversation.unread_count === undefined) return;
  await supabaseRequest(`chat_conversations?id=eq.${encodeURIComponent(conversation.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ unread_count: conversation.unread_count + 1 }),
  });
}

/** Clears the unread badge. No-op when the column is absent or already zero. */
async function markConversationRead(conversation: ConversationRecord): Promise<void> {
  if (!conversation.unread_count) return;
  await supabaseRequest(`chat_conversations?id=eq.${encodeURIComponent(conversation.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ unread_count: 0 }),
  });
}

/**
 * A visitor coming back to a resolved thread is a new question, so it reopens
 * as `active`. `waiting` and `assigned` are deliberately left alone: a new
 * message from someone already waiting on a human is still waiting, and
 * clobbering `assigned` would drop the thread out from under an admin who is
 * mid-reply.
 *
 * Returns undefined when nothing should change, so the caller does not re-assert
 * a status it did not mean to touch.
 */
function nextStatusForVisitorMessage(status: string): ConversationStatus | undefined {
  if (status === "resolved") return CONVERSATION_DEFAULT_STATUS;
  if (isConversationStatus(status) && status !== CONVERSATION_DEFAULT_STATUS) return status;
  return undefined;
}

async function persistVisitorMessage(
  visitorId: string,
  visitorAuthId: string | null,
  sessionStartedAt: number,
  body: string,
  contact: VisitorContact
): Promise<{ conversationId: string; messageId: RowId | null } | null> {
  if (!hasSupabaseConfig()) return null;
  const conversation = await ensureConversation(visitorId, visitorAuthId, sessionStartedAt, contact);
  if (!conversation) return null;
  const stored = await insertStoredMessage(conversation.id, "visitor", body);
  await bumpUnreadCount(conversation);
  await touchConversation(conversation.id, body, nextStatusForVisitorMessage(conversation.status));
  return { conversationId: conversation.id, messageId: stored?.id ?? null };
}

async function persistAssistantMessage(
  conversationId: string | null,
  body: string
): Promise<RowId | null> {
  if (!conversationId) return null;
  const stored = await insertStoredMessage(conversationId, "assistant", body);
  await touchConversation(conversationId, body);
  return stored?.id ?? null;
}

/** How many rows an unfiltered inbox page pulls. */
const CONVERSATION_PAGE_SIZE = 50;

/**
 * Searching filters in the database, so a narrow query is allowed to reach
 * further back than the default page. Bounded so a single-character search
 * cannot ask PostgREST for the whole table.
 */
const CONVERSATION_SEARCH_PAGE_SIZE = 200;

interface ConversationListFilters {
  /** Case-insensitive substring match against visitor name and email. */
  search?: string;
  status?: ConversationStatus;
}

function truncateForSearch(value: string): string {
  return value.slice(0, 100);
}

/**
 * Neutralises the characters that are structural in a PostgREST
 * `or=(col.op.value,...)` filter:
 *
 * - `,` separates the alternatives, so leaving it in would let a search
 *   append its own `or=` clause.
 * - `(` / `)` would close the filter group early.
 * - `%` and `_` are `ilike` wildcards, so leaving them in would turn "100%"
 *   into a prefix search that matches far more than intended.
 *
 * `.` is deliberately preserved: only the first two dots in an alternative are
 * structural (`column` / `operator`), everything after is the value, and email
 * domains cannot be searched without it. Verified against PostgREST: both
 * `visitor_email.ilike.*gmail.com*` and `visitor_email.eq.iandevsu@gmail.com`
 * match as expected.
 */
function escapePostgrestPattern(value: string): string {
  return value.replace(/[%_,()\\]/g, "");
}

/**
 * Builds the shared `select`/`order`/`limit` tail. `filter` is appended by the
 * caller so the same query shape can be retried without `mode`.
 */
function conversationListTail(filters: ConversationListFilters): string {
  const parts: string[] = [];

  const search = filters.search?.trim();
  if (search) {
    // `%` and `_` are ilike wildcards, so they are stripped from user input --
    // otherwise "100%" degrades into a prefix search.
    const pattern = `*${escapePostgrestPattern(truncateForSearch(search))}*`;
    parts.push(
      `or=(visitor_name.ilike.${pattern},visitor_email.ilike.${pattern},visitor_id.ilike.${pattern})`
    );
  }

  if (filters.status) {
    parts.push(`status=eq.${encodeURIComponent(filters.status)}`);
  }

  parts.push("order=last_message_at.desc");
  parts.push(`limit=${filters.search ? CONVERSATION_SEARCH_PAGE_SIZE : CONVERSATION_PAGE_SIZE}`);
  return `&${parts.join("&")}`;
}

async function listConversations(filters: ConversationListFilters = {}): Promise<ConversationRecord[]> {
  const { rows, hasOptional } = await selectRows("", conversationListTail(filters));
  return rows.filter(isConversationRecord).map((row) => withOptionalDefaults(row, hasOptional));
}

/**
 * Deletes a conversation outright. `chat_messages.conversation_id` is declared
 * `on delete cascade`, so the transcript goes with it -- no second query and
 * no orphaned rows.
 */
async function deleteConversation(conversationId: string): Promise<boolean> {
  const result = await supabaseRequest(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}`,
    {
      method: "DELETE",
      // return=representation rather than return=minimal: a 204 comes back as
      // null through supabaseRequest, which is indistinguishable from failure.
      // Echoing the deleted row lets us confirm what actually went.
      headers: { Prefer: "return=representation" },
    }
  );
  return Array.isArray(result) && result.length > 0;
}

/** Sets active/resolved. Returns the new status, or null if the write failed. */
async function setConversationStatus(
  conversationId: string,
  status: ConversationStatus
): Promise<ConversationStatus | null> {
  const result = await supabaseRequest(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    }
  );
  if (!Array.isArray(result) || result.length === 0) return null;
  const row = result[0] as Record<string, unknown> | undefined;
  return isConversationStatus(row?.status) ? row.status : null;
}

/** Sets ai/takeover. Returns the updated mode, or null if the column is absent. */
async function setConversationMode(
  conversationId: string,
  mode: "ai" | "takeover"
): Promise<"ai" | "takeover" | null> {
  const result = await supabaseRequest(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ mode }),
    }
  );
  if (!Array.isArray(result)) return null;
  const row = result[0] as Record<string, unknown> | undefined;
  return row?.mode === "takeover" ? "takeover" : mode;
}

async function listStoredMessages(
  conversationId: string,
  role?: StoredRole | StoredRole[]
): Promise<StoredMessage[]> {
  const roleFilter = Array.isArray(role)
    ? `&role=in.(${role.join(",")})`
    : role
      ? `&role=eq.${encodeURIComponent(role)}`
      : "";
  const result = await supabaseRequest(
    `chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,role,body,created_at&order=created_at.asc${roleFilter}&limit=100`
  );
  if (!Array.isArray(result)) {
    console.warn(
      JSON.stringify({
        scope: "ian-chat-messages",
        conversationId,
        note: "chat_messages query did not return an array",
      })
    );
    return [];
  }

  const valid = result.filter(isStoredMessage);
  // A row that exists but fails validation is a schema/shape mismatch, not an
  // empty thread. Surfacing the count keeps that from looking like "no messages".
  if (valid.length !== result.length) {
    console.warn(
      JSON.stringify({
        scope: "ian-chat-messages",
        conversationId,
        returned: result.length,
        kept: valid.length,
        note: "rows dropped by shape validation -- check chat_messages columns",
      })
    );
  }
  return valid;
}

/* ---------------------------------------------------------------------------
 * Inbox feature stores.
 *
 * Notes, activity and reactions all live in their own tables, all cascade from
 * chat_conversations, and none of them is readable by a visitor's browser: RLS
 * is enabled with no policies on each, so the service-role key in this file is
 * the only path in or out.
 * ------------------------------------------------------------------------ */

/** Newest first, matching the order the inbox renders them. */
async function listNotes(conversationId: string): Promise<StoredNote[]> {
  const result = await supabaseRequest(
    `chat_conversation_notes?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,body,created_at&order=created_at.desc&limit=50`
  );
  return Array.isArray(result) ? result.filter(isStoredNote) : [];
}

async function insertNote(conversationId: string, body: string): Promise<StoredNote | null> {
  const result = await supabaseRequest("chat_conversation_notes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ conversation_id: conversationId, body }),
  });
  if (!Array.isArray(result)) return null;
  return result.find(isStoredNote) || null;
}

async function listActivity(conversationId: string): Promise<StoredActivity[]> {
  const result = await supabaseRequest(
    `chat_visitor_activity?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,kind,page,label,created_at&order=created_at.desc&limit=40`
  );
  return Array.isArray(result) ? result.filter(isStoredActivity) : [];
}

async function insertActivity(
  conversationId: string,
  kind: ActivityKind,
  page: string,
  label: string
): Promise<StoredActivity | null> {
  const result = await supabaseRequest("chat_visitor_activity", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ conversation_id: conversationId, kind, page, label }),
  });
  if (!Array.isArray(result)) return null;
  return result.find(isStoredActivity) || null;
}

/**
 * Patches the conversation's "where are they now" fields.
 *
 * Only sent when something actually changed. The widget reports every route
 * change, and PATCHing an unchanged value on each one would turn a read-only
 * visit into a stream of writes for no benefit.
 */
async function updateVisitorPresence(
  conversation: ConversationRecord,
  page: string | null,
  device: string | null
): Promise<void> {
  const patch: Record<string, string> = {};
  if (page && page !== conversation.current_page) patch.current_page = page;
  if (device && !conversation.device) patch.device = device;
  if (!Object.keys(patch).length) return;

  await supabaseRequest(`chat_conversations?id=eq.${encodeURIComponent(conversation.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

async function listReactions(conversationId: string): Promise<StoredReaction[]> {
  const result = await supabaseRequest(
    `chat_message_reactions?conversation_id=eq.${encodeURIComponent(conversationId)}&select=message_id,kind,actor&limit=500`
  );
  if (!Array.isArray(result)) return [];
  // The conversation_id filter in the query is the security boundary -- it is
  // the only reason a visitor can never see another conversation's reactions --
  // so the rows are not re-checked here, only shape-validated.
  return result.filter(isStoredReaction);
}

/**
 * Adds or removes one reaction.
 *
 * Idempotent by construction: the primary key is (message_id, kind, actor), so
 * adding twice is a conflict that the upsert resolves to the same single row,
 * and removing a reaction that is not there matches no row. Returns whether the
 * table is actually usable, so the caller can tell the visitor apart from a
 * silent failure.
 */
async function setReaction(
  conversationId: string,
  messageId: RowId,
  kind: ReactionKind,
  actor: string,
  active: boolean
): Promise<boolean> {
  if (active) {
    const result = await supabaseRequest("chat_message_reactions", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ conversation_id: conversationId, message_id: messageId, kind, actor }),
    });
    return Array.isArray(result);
  }

  const result = await supabaseRequest(
    `chat_message_reactions?message_id=eq.${encodeURIComponent(String(messageId))}&kind=eq.${encodeURIComponent(kind)}&actor=eq.${encodeURIComponent(actor)}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } }
  );
  // A delete that matched nothing returns an empty array, which is still a
  // successful request against a working table.
  return Array.isArray(result);
}

/**
 * True when the message exists, belongs to this conversation, and is something
 * a person actually said.
 *
 * The role check matters: a 'system' announcement is server-authored, and
 * letting visitors react to it would let them fabricate sentiment on a notice
 * the owner wrote.
 */
async function isReactableMessage(conversationId: string, messageId: RowId): Promise<boolean> {
  const result = await supabaseRequest(
    `chat_messages?id=eq.${encodeURIComponent(String(messageId))}&conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,role&limit=1`
  );
  if (!Array.isArray(result) || result.length === 0) return false;
  const role = (result[0] as Record<string, unknown>).role;
  return role === "visitor" || role === "assistant" || role === "admin";
}

/**
 * How many chat sessions this person has had, and when they were first seen.
 *
 * `visitor_id` is unique per chat thread, so a returning visitor is a *new*
 * thread with a new id and cannot be counted from the conversation row alone.
 * The Supabase anonymous auth id is what survives across sessions, so that is
 * what the count groups on. Falls back to the current conversation alone when
 * there is no auth id (anonymous auth disabled), which is the honest answer
 * rather than a fabricated total.
 */
async function visitorSessionStats(
  conversation: ConversationRecord
): Promise<VisitorSessionStats> {
  const fallback: VisitorSessionStats = {
    sessionCount: 1,
    firstSeenAt: conversation.first_seen_at ?? conversation.session_started_at,
  };
  if (!conversation.visitor_auth_id) return fallback;

  const result = await supabaseRequest(
    `chat_conversations?visitor_auth_id=eq.${encodeURIComponent(conversation.visitor_auth_id)}&select=session_started_at&limit=200`
  );
  if (!Array.isArray(result) || result.length === 0) return fallback;

  let earliest: number | null = null;
  for (const row of result) {
    const value = (row as Record<string, unknown>).session_started_at;
    if (typeof value !== "string") continue;
    const at = Date.parse(value);
    if (Number.isNaN(at)) continue;
    if (earliest === null || at < earliest) earliest = at;
  }

  return {
    sessionCount: result.length,
    // The stored first_seen_at is authoritative for the current thread; the
    // cross-session minimum only fills in when it is somehow older.
    firstSeenAt:
      earliest === null
        ? fallback.firstSeenAt
        : new Date(Math.min(earliest, Date.parse(fallback.firstSeenAt) || earliest)).toISOString(),
  };
}

/**
 * Coarse device label, derived here rather than trusted from the client.
 *
 * The visitor's browser is not a source of truth about its own environment --
 * a user agent header is trivially forged and this string is displayed in the
 * admin panel. Reading it server-side costs nothing and needs no client
 * cooperation.
 */
function describeDevice(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.slice(0, 300);

  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Chrome\//i.test(ua)
          ? "Chrome"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "browser";

  const platform = /Windows/i.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : /Android/i.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "unknown OS";

  // iPadOS reports a Macintosh UA, so the tablet check has to come first.
  const form = /iPad|Tablet|PlayBook|Silk/i.test(ua)
    ? "tablet"
    : /Mobi|iPhone|Android|IEMobile/i.test(ua)
      ? "mobile"
      : "desktop";

  return `${form} · ${browser} on ${platform}`;
}

/**
 * Resolves the conversation an incoming request is about, from either side.
 *
 * The admin knows the id; a visitor only knows their own `visitorId`. Returns
 * null when neither resolves, so an unauthorised caller cannot reach a thread
 * it does not own.
 */
async function resolveConversation(
  visitorId: string,
  conversationId: string
): Promise<ConversationRecord | null> {
  if (conversationId) return findConversationById(conversationId);
  return findConversationByVisitor(visitorId);
}

function getLastUserMessage(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index].text;
  }
  return "";
}

function logConversation(
  event: ChatEvent,
  visitorId: string,
  sessionStartedAt: number,
  messages: ChatMessage[]
): void {
  console.info(
    JSON.stringify({
      scope: "ian-chat",
      event,
      visitorId,
      sessionStartedAt,
      messageCount: messages.length,
      messages,
      loggedAt: new Date().toISOString(),
    })
  );
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = NOTIFICATION_TIMEOUT_MS
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyChatEvent(
  event: ChatEvent,
  visitorId: string,
  sessionStartedAt: number,
  messages: ChatMessage[]
): Promise<void> {
  const recipient = process.env.CHAT_NOTIFICATION_EMAIL || NOTIFICATION_EMAIL;
  const preview = truncate(getLastUserMessage(messages), 240) || "No message text";
  const eventLabel = event === "chat_started" ? "started a chat" : "sent a message";
  const payload = {
    type: "portfolio_chat_event",
    event,
    recipient,
    visitorId,
    sessionStartedAt,
    messagePreview: preview,
    messageCount: messages.length,
    createdAt: new Date().toISOString(),
  };
  let delivered = false;

  const webhook = process.env.CHAT_NOTIFICATION_WEBHOOK?.trim();
  if (webhook) {
    const webhookResponse = await fetchWithTimeout(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    delivered = Boolean(webhookResponse?.ok);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const subject = event === "chat_started" ? "New portfolio chat visitor" : "New portfolio chat message";
    const text = `${eventLabel} from visitor ${visitorId}.\n\n${preview}\n\nSession: ${sessionStartedAt}`;
    const html = `<p><strong>${escapeHtml(eventLabel)}</strong></p><p>Visitor: ${escapeHtml(visitorId)}</p><p>${escapeHtml(preview)}</p><p>Session: ${escapeHtml(String(sessionStartedAt))}</p>`;
    const resendResponse = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CHAT_NOTIFICATION_FROM || "Portfolio <onboarding@resend.dev>",
        to: [recipient],
        subject,
        text,
        html,
      }),
    });
    delivered = delivered || Boolean(resendResponse?.ok);
  }

  if (!delivered) {
    console.info(
      JSON.stringify({
        scope: "ian-chat-notification",
        recipient,
        event,
        visitorId,
        sessionStartedAt,
        messagePreview: preview,
        delivery: "configure CHAT_NOTIFICATION_WEBHOOK or RESEND_API_KEY for external delivery",
      })
    );
  }
}

function writeServerEvent(res: VercelResponse, payload: Record<string, unknown>): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function getGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }).candidates;
  if (!Array.isArray(candidates)) return "";

  return candidates
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("");
}

/**
 * Gemini answers a blocked prompt with HTTP 200 and an empty candidate list, so
 * a safety block is otherwise indistinguishable from an empty completion. Read
 * the reason out so the visitor gets an honest message and the logs keep the
 * detail. The persona rules are enforced upstream by the model; this only
 * reports what the API decided.
 */
function getBlockReason(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const feedback = (payload as { promptFeedback?: { blockReason?: unknown } }).promptFeedback;
  if (feedback && typeof feedback.blockReason === "string" && feedback.blockReason) {
    return feedback.blockReason;
  }

  const candidates = (payload as {
    candidates?: Array<{ finishReason?: unknown; finishMessage?: unknown }>;
  }).candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const reason = candidate?.finishReason;
      if (typeof reason === "string" && reason && reason !== "STOP") {
        const detail = candidate?.finishMessage;
        return typeof detail === "string" && detail ? `${reason}: ${detail}` : reason;
      }
    }
  }

  return null;
}

const BLOCKED_REPLIES: Record<string, string> = {
  SAFETY: "I can't help with that one. Ask me about background, projects, or stack instead?",
  PROHIBITED_CONTENT: "I can't help with that one. Ask me about background, projects, or stack instead?",
  BLOCKLIST: "I can't help with that one. Ask me about background, projects, or stack instead?",
  RECITATION: "I can't reproduce that. Ask me about background, projects, or stack instead?",
};

function blockedReply(reason: string): string {
  return BLOCKED_REPLIES[reason] ?? "I can't respond to that one -- ask me about background, projects, or stack instead?";
}

function getSseData(block: string): string | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  return data || null;
}

async function proxyGeminiStream(
  geminiResponse: Response,
  res: VercelResponse
): Promise<string> {
  if (!geminiResponse.body) throw new Error("Gemini returned an empty stream");

  const reader = geminiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  let blockReason: string | null = null;

  const processBlock = (block: string): void => {
    const data = getSseData(block);
    if (!data || data === "[DONE]") return;

    try {
      const payload: unknown = JSON.parse(data);
      if (blockReason === null) {
        const reason = getBlockReason(payload);
        if (reason) blockReason = reason;
      }
      const text = getGeminiText(payload);
      if (!text) return;
      reply += text;
      writeServerEvent(res, { type: "chunk", text });
    } catch {
      return;
    }
  };

  // An upstream that stops sending without closing would otherwise hang the
  // invocation until the platform reaps it, so bound each individual read.
  const readChunk = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Gemini stream stalled")),
        GEMINI_STREAM_IDLE_TIMEOUT_MS
      );
    });
    try {
      return await Promise.race([reader.read(), guard]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  while (true) {
    const { done, value } = await readChunk();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";
    blocks.forEach(processBlock);

    if (done) {
      if (buffer.trim()) processBlock(buffer);
      break;
    }
  }

  if (!reply.trim()) {
    if (blockReason) {
      console.warn(
        JSON.stringify({ scope: "ian-chat-gemini-blocked", reason: blockReason })
      );
      // Emitted as a normal completion so the bubble keeps the persona's voice
      // instead of surfacing a raw upstream error string to the visitor.
      const fallbackReply = blockedReply(blockReason);
      writeServerEvent(res, { type: "chunk", text: fallbackReply });
      writeServerEvent(res, { type: "done", reply: fallbackReply });
      return fallbackReply;
    }
    throw new Error("Gemini returned no reply");
  }
  return reply;
}

async function handleChat(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method === "GET") {
    const query = getRequestQuery(req);

    // Self-serve diagnostics for the inbox. Admin session required, and it only
    // ever reports which variable *names* are present -- never their values.
    if (query.get("diagnose") === "1") {
      if (!(await hasAdminAccess(req))) {
        return res.status(401).json({ error: "Admin authorization required" });
      }
      const status = getSupabaseEnvStatus();
      if (!status.ok) {
        return res.status(200).json({ configured: false, missing: status.missing });
      }

      // Configured, so verify the tables actually exist and are queryable, and
      // report row counts. `?conversationId=<id>` drills into one thread so an
      // empty inbox can be attributed to storage vs. filtering.
      const convoProbe = await supabaseRequest("chat_conversations?select=id&limit=1");
      const convoCount = await supabaseRequest("chat_conversations?select=id&limit=1000");
      const msgCount = await supabaseRequest("chat_messages?select=id&limit=1000");

      const drill = query.get("conversationId");
      let thread: Record<string, unknown> | undefined;
      if (drill) {
        const raw = await supabaseRequest(
          `chat_messages?conversation_id=eq.${encodeURIComponent(drill)}&select=id,conversation_id,role,body,created_at&limit=100`
        );
        const rows = Array.isArray(raw) ? raw : [];
        const kept = rows.filter(isStoredMessage);
        thread = {
          conversationId: drill,
          rowsReturned: rows.length,
          rowsAccepted: kept.length,
          roles: kept.map((row) => row.role),
          idTypes: [...new Set(kept.map((row) => typeof row.id))],
          /**
           * Whether this specific thread can show a takeover notice. Both halves
           * have to hold: the role CHECK has to admit 'system' (or the insert
           * fails), and the conversation has to carry the visitor_auth_id the
           * widget's poll is authorised with. A thread failing this looks
           * exactly like a thread with no takeover -- the visitor just never
           * sees the badge.
           */
          hasSystemRole: kept.some((row) => row.role === "system"),
        };
      }

      /**
       * Reports whether any 'system' rows exist, which is the only read-only
       * way to tell that the role CHECK admits 'system'.
       *
       * A CHECK constraint's definition is not readable through PostgREST --
       * pg_constraint is not an exposed relation -- and a SELECT cannot detect
       * it either, because CHECKs are not evaluated on read. So this is
       * deliberately reported as undetermined rather than guessed: `true` once a
       * system row proves the constraint allows it, `null` when there simply
       * are none yet. The definitive signal is the takeover endpoint itself,
       * which now answers 502 when the insert is rejected rather than
       * reporting a success it did not achieve.
       */
      const systemRows = await supabaseRequest("chat_messages?select=id&role=eq.system&limit=1000");
      const systemCount = Array.isArray(systemRows) ? systemRows.length : null;

      return res.status(200).json({
        configured: true,
        urlSource: status.url?.name ?? null,
        projectHost: status.url ? safeHost(status.url.value) : null,
        serviceKeySource: status.serviceKeyName,
        authKeySource: status.authKeyName,
        tablesReachable: convoProbe !== undefined,
        conversationCount: Array.isArray(convoCount) ? convoCount.length : null,
        messageCount: Array.isArray(msgCount) ? msgCount.length : null,
        /**
         * true  -- a system row exists, so the role CHECK admits 'system'.
         * null  -- undetermined: no system rows yet, so nothing proves it either
         *         way. Click "Take Over Chat" once; a 502 response means section
         *         1 of APPLY_PENDING.sql has not been applied.
         */
        allowsSystemRole: systemCount === null ? null : systemCount > 0,
        systemMessageCount: systemCount,
        thread,
        note:
          convoProbe === undefined
            ? "chat_conversations is not queryable -- run supabase/schema.sql in the Supabase SQL editor"
            : Array.isArray(convoCount) && convoCount.length > 0 && Array.isArray(msgCount) && msgCount.length === 0
              ? "conversations exist but chat_messages is empty -- visitor messages are not being written"
              : undefined,
      });
    }

    if (query.get("admin") === "1") {
      if (!(await hasAdminAccess(req))) {
        return res.status(401).json({ error: "Admin authorization required" });
      }
      if (!hasSupabaseConfig()) {
        return res.status(503).json(supabaseNotConfiguredBody());
      }

      const conversationId = query.get("conversationId");
      if (conversationId) {
        const conversation = await findConversationById(conversationId);
        if (!conversation) return res.status(404).json({ error: "Conversation not found" });

        // Everything the right-hand panel needs, in one round trip. Five reads
        // issued in parallel rather than in sequence: the inbox polls this
        // every 2 seconds, so serialising them would make each refresh take the
        // sum of five round trips.
        const [messages, notes, activity, reactions, stats] = await Promise.all([
          listStoredMessages(conversationId),
          listNotes(conversationId),
          listActivity(conversationId),
          listReactions(conversationId),
          visitorSessionStats(conversation),
        ]);

        return res.status(200).json({
          messages,
          notes,
          activity,
          reactions,
          // `firstSeenAt` comes back separately from the row so the panel has
          // one authoritative value: the row's own copy, or an older one
          // recovered from this visitor's earlier sessions.
          visitor: {
            name: conversation.visitor_name,
            email: conversation.visitor_email,
            firstSeenAt: stats.firstSeenAt,
            sessionStartedAt: conversation.session_started_at,
            currentPage: conversation.current_page ?? null,
            device: conversation.device ?? null,
            sessionCount: stats.sessionCount,
            visitorId: conversation.visitor_id,
          },
        });
      }

      // Triage filters. `q` matches visitor name, email, or id; `status` is one
      // of active / waiting / assigned / resolved. An unrecognised status is
      // ignored rather than rejected, so a stale client degrades to the full
      // list instead of an error page.
      const requestedStatus = query.get("status");
      return res.status(200).json({
        conversations: await listConversations({
          search: query.get("q") || undefined,
          status: isConversationStatus(requestedStatus) ? requestedStatus : undefined,
        }),
      });
    }

    const visitorId = query.get("visitorId");
    if (visitorId) {
      if (!hasSupabaseConfig()) return res.status(200).json({ messages: [] });
      const authenticatedVisitorId = await getSupabaseUserId(req);
      const adminAccess = !authenticatedVisitorId && (await hasAdminAccess(req));
      if (!authenticatedVisitorId && !adminAccess) {
        return res.status(403).json({ error: "Visitor authorization required" });
      }
      const conversation = await findConversationByVisitor(visitorId);
      if (conversation && !adminAccess && conversation.visitor_auth_id !== authenticatedVisitorId) {
        return res.status(403).json({ error: "Visitor session does not match" });
      }
      if (!conversation) return res.status(200).json({ messages: [] });

      // Reactions cover the *whole* conversation, not just the admin/system
      // messages returned above, so a visitor can 👍 their own message. The
      // rows carry only (message_id, kind, actor) -- no message bodies -- so
      // this does not leak the transcript back to the client.
      const reactions = await listReactions(conversation.id);
      const messages = await listStoredMessages(conversation.id, ["admin", "system"]);
      return res.status(200).json({ messages, reactions });
    }

    // Public probe the widget already calls. `persistence` lets the UI say
    // "history is off" instead of silently dropping transcripts.
    return res.status(200).json({
      configured: Boolean(getGeminiApiKey()),
      persistence: hasSupabaseConfig() ? "on" : "off",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);

  // Password exchange: validates CHAT_ADMIN_PASSWORD once and hands back a
  // signed, expiring session. Deliberately the only place the raw password is
  // ever accepted, and the only place it is read.
  if (body.event === "admin_login") {
    const expected = getAdminPassword();
    if (!expected) {
      console.error(JSON.stringify({ scope: "ian-chat-admin", login: "not-configured" }));
      return res.status(503).json({
        error: "Admin access is not configured. Set CHAT_ADMIN_PASSWORD on the server.",
      });
    }

    const clientKeys = getClientKeys(req);
    if (isAdminLoginThrottled(clientKeys)) {
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    }

    const submitted = typeof body.password === "string" ? body.password : "";
    if (!submitted || !safeEquals(submitted, expected)) {
      recordAdminLoginFailure(clientKeys);
      console.warn(JSON.stringify({ scope: "ian-chat-admin", login: "failed" }));
      return res.status(401).json({ error: "Incorrect password" });
    }

    clearAdminLoginFailures(clientKeys);
    console.info(JSON.stringify({ scope: "ian-chat-admin", login: "ok" }));
    return res.status(200).json({ ok: true, session: issueAdminSession(expected) });
  }

  const event: ChatEvent = isChatEvent(body.event) ? body.event : "message";
  const visitorId = getVisitorId(body.visitorId);
  const sessionStartedAt = getSessionStartedAt(body.sessionStartedAt);

  if (event === "admin_takeover" || event === "admin_release") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const takingOver = event === "admin_takeover";
    const mode = await setConversationMode(conversationId, takingOver ? "takeover" : "ai");
    if (!mode) {
      return res.status(409).json({
        error: "Takeover is unavailable: the chat_conversations.mode column is missing. Run the add_chat_takeover_support migration.",
      });
    }

    // Announce the handover in the thread so the visitor knows a person is
    // responding. Stored as its own 'system' entry rather than a chat bubble.
    const announcement = takingOver
      ? `${PROFILE.goesBy} has joined the chat -- you're now talking to the real ${PROFILE.goesBy}!`
      : `${PROFILE.goesBy} stepped away, so I'm back to answering questions.`;

    /**
     * The return value used to be discarded, and supabaseRequest resolves to
     * null on any failure. So a database whose `chat_messages_role_check` still
     * omits 'system' -- exactly what APPLY_PENDING.sql section 1 exists to fix
     * -- rejected this insert, the endpoint still answered 200, the inbox showed
     * no error, and the visitor simply never learned a human had taken over.
     * A silent write failure with a success response is the worst version of
     * this bug, so the result is now checked and surfaced.
     */
    const stored = await insertStoredMessage(conversationId, "system", announcement);
    if (!stored) {
      console.error(
        JSON.stringify({
          scope: "ian-chat-takeover",
          conversationId,
          takingOver,
          error: "could not persist the system announcement",
          note: "if this is a check-constraint failure, chat_messages_role_check does not allow role='system' -- run supabase/APPLY_PENDING.sql",
        })
      );
      // The mode flip already happened and is not rolled back: the admin did
      // take over, so the AI is correctly muted. What failed is telling the
      // visitor, which is worth reporting rather than hiding.
      return res.status(502).json({
        ok: false,
        conversationId,
        mode,
        error:
          "Takeover applied, but the visitor was not notified: the announcement could not be saved. Check the chat_messages_role_check constraint allows role='system' (supabase/APPLY_PENDING.sql).",
      });
    }

    // No status argument: the PATCH below is the single authoritative write,
    // and re-asserting status through touchConversation would be a second
    // write that could race the admin's next click.
    await touchConversation(conversationId, announcement);

    // Taking over is what "assigned" means in the triage list, and releasing
    // is what "waiting" means: still needs a human, nobody is on it. Best
    // effort -- the announcement is already written, so a status write failing
    // here (e.g. the four-value CHECK not yet applied) must not fail the whole
    // takeover.
    const triageStatus = takingOver
      ? CONVERSATION_ASSIGNED_STATUS
      : CONVERSATION_WAITING_STATUS;
    const statusApplied = await setConversationStatus(conversationId, triageStatus);

    console.info(
      JSON.stringify({ scope: "ian-chat-takeover", conversationId, mode, takingOver, statusApplied })
    );
    return res.status(200).json({ ok: true, conversationId, mode, announcement, notified: true });
  }

  if (event === "admin_read") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    await markConversationRead(conversation);
    return res.status(200).json({ ok: true, conversationId, unreadCount: 0 });
  }

  if (event === "admin_note") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!conversationId || !text) {
      return res.status(400).json({ error: "conversationId and text are required" });
    }
    if (text.length > MAX_NOTE_LENGTH) {
      return res.status(400).json({ error: `Notes are capped at ${MAX_NOTE_LENGTH} characters` });
    }

    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const note = await insertNote(conversationId, text);
    if (!note) {
      return res.status(502).json({
        error: "Could not save the note. If this persists, run the add_chat_inbox_features migration.",
      });
    }

    // Deliberately does NOT call touchConversation: an internal note is not
    // part of the conversation, and bumping the preview would overwrite the
    // visitor's last message in the list and make the thread look active.
    return res.status(200).json({ ok: true, note });
  }

  if (event === "admin_status") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const status = body.status;
    if (!isConversationStatus(status)) {
      return res.status(400).json({
        error: `status must be one of: ${CONVERSATION_STATUSES.join(", ")}`,
      });
    }

    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const updated = await setConversationStatus(conversationId, status);
    if (!updated) {
      // Almost always the CHECK constraint: 'waiting' and 'assigned' were added
      // to it in 20260930010000, and Postgres rejects the write until that
      // migration is applied.
      return res.status(502).json({
        error:
          status === "active" || status === "resolved"
            ? "Could not update the conversation status"
            : `Could not set the status to "${status}". Run supabase/migrations/20260930010000_add_chat_inbox_features.sql to add it.`,
      });
    }

    // Log the state change in the thread so it has a visible trail. It is also
    // what the visitor sees, since the widget renders the 'admin' and 'system'
    // roles. touchConversation is called without a status: the PATCH above is
    // already authoritative, and re-asserting it here would be a second write
    // that could race the admin's next action.
    const statusAnnouncement: Record<ConversationStatus, string> = {
      resolved: `${PROFILE.goesBy} marked this conversation as resolved -- reply here if you need anything else.`,
      active: `${PROFILE.goesBy} reopened this conversation.`,
      waiting: `${PROFILE.goesBy} marked this as waiting -- I'll keep an eye on it.`,
      assigned: `${PROFILE.goesBy} is on this conversation now.`,
    };
    const announcement = statusAnnouncement[status];
    await insertStoredMessage(conversationId, "system", announcement);
    // Keeps the list preview showing the announcement instead of a stale
    // message, matching what the takeover handler does.
    await touchConversation(conversationId, announcement);

    console.info(
      JSON.stringify({ scope: "ian-chat-status", conversationId, status })
    );
    return res.status(200).json({ ok: true, conversationId, status, announcement });
  }

  if (event === "admin_delete") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    // Confirm it exists first so a bad id is a clean 404 rather than a
    // confusing "could not delete".
    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const deleted = await deleteConversation(conversationId);
    if (!deleted) {
      return res.status(502).json({ error: "Could not delete the conversation" });
    }

    console.info(
      JSON.stringify({
        scope: "ian-chat-delete",
        conversationId,
        visitorId: conversation.visitor_id,
      })
    );
    return res.status(200).json({ ok: true, conversationId });
  }

  if (event === "admin_reply") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json(supabaseNotConfiguredBody());
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!conversationId || !text) {
      return res.status(400).json({ error: "conversationId and text are required" });
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are capped at ${MAX_MESSAGE_LENGTH} characters` });
    }

    const conversation = await findConversationById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    await insertStoredMessage(conversationId, "admin", text);
    await touchConversation(conversationId, text);
    return res.status(200).json({ ok: true, conversationId });
  }

  const visitorAuthId = await getSupabaseUserId(req);
  const contact: VisitorContact = {
    name: getVisitorName(body.visitorName),
    email: getVisitorEmail(body.visitorEmail),
  };

  /* Reactions arrive from both sides, so this is the one visitor-facing event
   * with its own authorization: the admin proves it with a session, a visitor
   * proves it by matching the conversation's own visitor_auth_id. */
  if (event === "reaction") {
    if (!hasSupabaseConfig()) return res.status(503).json(supabaseNotConfiguredBody());

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const kind = body.kind;
    const messageId = body.messageId;

    if (!isRowId(messageId)) {
      return res.status(400).json({ error: "messageId is required" });
    }
    if (!isReactionKind(kind)) {
      return res.status(400).json({ error: `kind must be one of: ${REACTION_KINDS.join(", ")}` });
    }

    const conversation = await resolveConversation(visitorId, conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    // isValidAdminSession rather than hasAdminAccess: the latter logs a
    // "denied: no-valid-session" warning, which is right for a dashboard load
    // and pure noise for every single reaction a visitor sends.
    const adminAccess = isValidAdminSession(req);
    if (!adminAccess) {
      if (!visitorAuthId || conversation.visitor_auth_id !== visitorAuthId) {
        return res.status(403).json({ error: "Visitor session does not match" });
      }
      // A visitor can only ever act as themselves; the client sends no actor,
      // and the server derives it. Otherwise one visitor could clear or forge
      // another's reactions.
    }

    const actor = adminAccess ? ADMIN_ACTOR : conversation.visitor_id;
    if (!await isReactableMessage(conversation.id, messageId)) {
      return res.status(400).json({ error: "That message cannot be reacted to" });
    }

    const active = body.active !== false;
    const stored = await setReaction(conversation.id, messageId, kind, actor, active);
    if (!stored) {
      return res.status(502).json({
        error: "Could not save the reaction. If this persists, run the add_chat_inbox_features migration.",
      });
    }

    return res.status(200).json({ ok: true, conversationId: conversation.id, kind, actor, active });
  }

  if (event === "visitor_activity") {
    if (!hasSupabaseConfig()) return res.status(200).json({ ok: true, recorded: false });

    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const conversation = await resolveConversation(visitorId, conversationId);
    // Silently fine if there is no thread yet: a visitor can browse the site
    // before ever opening the chat, and there is nothing to attach it to.
    if (!conversation) return res.status(200).json({ ok: true, recorded: false });

    if (!visitorAuthId || conversation.visitor_auth_id !== visitorAuthId) {
      return res.status(403).json({ error: "Visitor session does not match" });
    }

    const kind: ActivityKind = isActivityKind(body.activity) ? body.activity : "page";
    const page = cleanText(body.page, 200) || "/";
    // The label is derived from the page rather than trusted, so a crafted
    // label cannot inject arbitrary text into the admin's activity timeline.
    const label = kind === "chat" ? "Opened Chat" : pageLabel(page);
    const device = describeDevice(readHeader(req, "user-agent"));

    await updateVisitorPresence(conversation, page, device);
    const entry = await insertActivity(conversation.id, kind, page, label);

    return res.status(200).json({ ok: true, recorded: Boolean(entry) });
  }

  if (event === "chat_started") {
    // ensureConversation returns null when the insert fails for any reason.
    // Reporting ok:true regardless is what let a CHECK-constraint mismatch on
    // chat_conversations.status look like a healthy chat for as long as it
    // took to notice no threads were being created at all.
    const created = await ensureConversation(visitorId, visitorAuthId, sessionStartedAt, contact);
    if (!created) {
      console.error(
        JSON.stringify({
          scope: "ian-chat-supabase",
          event,
          visitorId,
          note: "conversation was NOT created -- check chat_conversations columns and migrations",
        })
      );
      return res.status(503).json({
        error: "Chat is temporarily unavailable. Please try again in a moment.",
      });
    }
    logConversation(event, visitorId, sessionStartedAt, []);
    await notifyChatEvent(event, visitorId, sessionStartedAt, []);
    return res.status(200).json({ ok: true, event: "chat_started" });
  }


  const messages = Array.isArray(body.messages) ? body.messages.filter(isChatMessage) : [];
  if (!messages.length) {
    return res.status(400).json({ error: "messages[] is required" });
  }

  for (const message of messages) {
    if (message.text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are capped at ${MAX_MESSAGE_LENGTH} characters` });
    }
  }

  const trimmed = messages.slice(-MAX_TURNS);
  const firstUserIndex = trimmed.findIndex((message) => message.role === "user");
  if (firstUserIndex < 0) {
    return res.status(400).json({ error: "At least one user message is required" });
  }
  const modelMessages = trimmed.slice(firstUserIndex);

  logConversation(event, visitorId, sessionStartedAt, modelMessages);
  const persisted = await persistVisitorMessage(
    visitorId,
    visitorAuthId,
    sessionStartedAt,
    getLastUserMessage(modelMessages),
    contact
  );
  const conversationId = persisted?.conversationId ?? null;

  // persistVisitorMessage returns null on any write failure -- a schema
  // mismatch, a CHECK violation, or RLS. That used to be swallowed, so the
  // widget got a normal-looking reply while the visitor's message was never
  // stored and never reached the inbox. Storage being down is not the
  // visitor's fault, so the AI still answers, but the failure is logged
  // loudly and flagged in a response header instead of being invisible.
  if (!conversationId) {
    console.error(
      JSON.stringify({
        scope: "ian-chat-supabase",
        event,
        visitorId,
        note: "visitor message was NOT persisted -- check chat_conversations columns and migrations",
      })
    );
    res.setHeader("X-Chat-Persisted", "false");
  }

  // Never left dangling: an unhandled rejection here would take the whole
  // invocation down instead of just skipping the notification.
  const notificationPromise = notifyChatEvent(
    event,
    visitorId,
    sessionStartedAt,
    modelMessages
  ).catch((error: unknown) => {    console.error(
      JSON.stringify({
        scope: "ian-chat-notification-error",
        message: error instanceof Error ? error.message : String(error),
      })
    );
  });

  // While an admin has taken the conversation over, the assistant must stay
  // quiet -- otherwise the visitor gets two conflicting answers. The visitor
  // message is already stored above, so the human sees it in the inbox. Its id
  // is echoed back so the widget can put a reaction bar under the visitor's own
  // message, which is the only one it cannot otherwise identify.
  if (isTakeover(await findConversationByVisitor(visitorId))) {
    await notificationPromise;
    return res.status(200).json({
      takeover: true,
      conversationId,
      visitorMessageId: persisted?.messageId ?? null,
    });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    await notificationPromise;
    // Previously silent: the visitor got a 500 and the logs said nothing at all,
    // so "the env var was never set on this deployment" was indistinguishable
    // from every other cause of the same 500.
    console.error(
      JSON.stringify({
        scope: "ian-chat-gemini-config",
        error: "GEMINI_API_KEY missing or empty",
        key: describeApiKey(),
        runtime: describeRuntime(),
        // The local dev server injects this from .env.local via
        // loadServerEnvironment in vite.config.ts; on Vercel it comes from the
        // project environment variables, so this is almost always a deploy that
        // never had the variable set.
        source: process.env.VERCEL_ENV ? "vercel-project-env" : "local-dotenv-or-process",
      })
    );
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }
  let geminiResponse: Response | null = null;
  let lastStatus = 0;
  let lastDetail = "";
  // A transport failure and a real HTTP 502 from Gemini both used to land in
  // lastStatus as 502, so the logs could not distinguish "no response ever
  // arrived" from "Gemini answered 502". lastStatus is now left at 0 for a
  // transport failure, and the exception is kept here in full.
  let lastTransportFailure: Record<string, unknown> | null = null;
  // Per-model outcome, so a chain that dies on candidate three says which two
  // worked -- the single most useful fact when GEMINI_MODEL is stale.
  const attempts: Array<Record<string, unknown>> = [];

  for (const model of getModelCandidates()) {
    try {
      const response = await requestGemini(apiKey, model, modelMessages);
      if (response.ok) {
        geminiResponse = response;
        attempts.push({ model, outcome: "ok", status: response.status });
        break;
      }

      lastStatus = response.status;
      lastDetail = await response.text().catch(() => "");
      attempts.push({ model, outcome: "http_error", status: response.status });
      if (response.status !== 404 && response.status !== 429 && response.status !== 503) break;
    } catch (error) {
      lastStatus = 0;
      lastDetail = "";
      lastTransportFailure = describeError(error);
      attempts.push({
        model,
        outcome: "transport_error",
        // true here means GEMINI_HANDSHAKE_TIMEOUT_MS elapsed before headers.
        aborted: isAbortError(error),
        ...lastTransportFailure,
      });
      console.error(
        JSON.stringify({
          scope: "ian-chat-gemini-transport",
          model,
          aborted: isAbortError(error),
          handshakeTimeoutMs: GEMINI_HANDSHAKE_TIMEOUT_MS,
          error: lastTransportFailure,
          runtime: describeRuntime(),
        })
      );
    }
  }

  if (!geminiResponse) {
    await notificationPromise;
    console.error(
      JSON.stringify({
        scope: "ian-chat-gemini-error",
        // 0 means no HTTP response was ever received -- a transport failure,
        // not an upstream status.
        status: lastStatus,
        transportFailure: lastTransportFailure,
        modelCandidates: getModelCandidates(),
        attempts,
        detail: lastDetail.slice(0, MAX_UPSTREAM_DETAIL_LENGTH),
        key: describeApiKey(),
        runtime: describeRuntime(),
      })
    );
    if (lastStatus === 429) {
      return res.status(429).json({ error: "Gemini is rate limited right now -- please try again shortly." });
    }
    if (lastStatus === 503) {
      return res.status(503).json({ error: "Gemini is temporarily busy -- please try again in a moment." });
    }
    if (lastStatus === 404) {
      return res.status(502).json({ error: "The configured Gemini model is unavailable." });
    }
    return res.status(502).json({ error: "Could not reach Gemini" });
  }

  if (res.headersSent) {
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  try {
    const reply = await proxyGeminiStream(geminiResponse, res);
    const assistantMessageId = await persistAssistantMessage(conversationId, reply);
    logConversation(event, visitorId, sessionStartedAt, [...modelMessages, { role: "model", text: reply }]);
    await notificationPromise;
    // The ids ride along on `done` rather than in a separate response: this is
    // a single SSE stream, and the widget needs both ids to render reaction
    // bars under the exchange it just sent.
    writeServerEvent(res, {
      type: "done",
      reply,
      visitorMessageId: persisted?.messageId ?? null,
      assistantMessageId: assistantMessageId ?? null,
    });
    return res.end();
  } catch (error) {
    await notificationPromise;
    const message = error instanceof Error ? error.message : "Gemini stream failed";
    console.error(
      JSON.stringify({
        scope: "ian-chat-stream-error",
        message,
        stack: error instanceof Error ? error.stack : undefined,
      })
    );
    writeServerEvent(res, { type: "error", error: message });
    return res.end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleChat(req, res);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      JSON.stringify({
        scope: "ian-chat-handler",
        message: err.message,
        stack: err.stack,
      })
    );

    if (res.headersSent || res.writableEnded) {
      res.end();
      return;
    }

    // Stack traces stay server-side; they leak paths and internals to clients.
    return res.status(500).json({ error: "Internal server error" });
  }
}
