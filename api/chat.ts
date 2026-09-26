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
const GEMINI_STREAM_IDLE_TIMEOUT_MS = 30000;
const MAX_UPSTREAM_DETAIL_LENGTH = 300;

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

type StoredRole = "visitor" | "assistant" | "admin";

interface ConversationRecord {
  id: string;
  visitor_id: string;
  visitor_auth_id: string | null;
  session_started_at: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
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

type ChatEvent = "chat_started" | "message" | "admin_reply";

interface ChatRequest {
  messages?: unknown;
  visitorId?: unknown;
  sessionStartedAt?: unknown;
  event?: unknown;
  conversationId?: unknown;
  visitorAuthId?: unknown;
  text?: unknown;
  password?: unknown;
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

async function supabaseRequest(path: string, init: RequestInit = {}): Promise<unknown | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        JSON.stringify({
          scope: "ian-chat-supabase",
          status: response.status,
          path,
          detail: detail.slice(0, MAX_UPSTREAM_DETAIL_LENGTH),
        })
      );
      return null;
    }

    if (response.status === 204) return null;
    return await response.json().catch(() => null);
  } catch {
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

const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function isProduction(): boolean {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  return env === "production" || env === "prod";
}

/**
 * Returns the configured admin password, or the development-only default.
 * Deliberately returns null in production when unset: a hardcoded fallback that
 * ships to prod would be a publicly known admin password sitting in the git
 * history and the deployed bundle.
 */
function getAdminPassword(): string | null {
  const configured = process.env.CHAT_ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  return isProduction() ? null : DEV_ADMIN_PASSWORD;
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

function getClientKey(req: VercelRequest): string {
  const forwarded = readHeader(req, "x-forwarded-for");
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  return ip || req.socket?.remoteAddress || "unknown";
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
 */
function isAdminLoginThrottled(key: string): boolean {
  const now = Date.now();
  const entry = adminLoginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    adminLoginAttempts.set(key, { count: 0, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
    return false;
  }
  return entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS;
}

function recordAdminLoginFailure(key: string): void {
  const now = Date.now();
  const entry = adminLoginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    adminLoginAttempts.set(key, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearAdminLoginFailures(key: string): void {
  adminLoginAttempts.delete(key);
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
    typeof candidate.last_message_preview === "string"
  );
}

function isRowId(value: unknown): value is RowId {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function isStoredMessage(value: unknown): value is StoredMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    (candidate.role === "visitor" || candidate.role === "assistant" || candidate.role === "admin") &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

async function findConversationByVisitor(visitorId: string): Promise<ConversationRecord | null> {
  const result = await supabaseRequest(
    `chat_conversations?visitor_id=eq.${encodeURIComponent(visitorId)}&select=id,visitor_id,visitor_auth_id,session_started_at,status,last_message_at,last_message_preview&limit=1`
  );
  if (!Array.isArray(result)) return null;
  return result.find(isConversationRecord) || null;
}

async function findConversationById(conversationId: string): Promise<ConversationRecord | null> {
  const result = await supabaseRequest(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}&select=id,visitor_id,visitor_auth_id,session_started_at,status,last_message_at,last_message_preview&limit=1`
  );
  if (!Array.isArray(result)) return null;
  return result.find(isConversationRecord) || null;
}

async function ensureConversation(
  visitorId: string,
  visitorAuthId: string | null,
  sessionStartedAt: number
): Promise<ConversationRecord | null> {
  const existing = await findConversationByVisitor(visitorId);
  if (existing) return existing;
  if (!hasSupabaseConfig()) return null;

  const result = await supabaseRequest("chat_conversations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      visitor_id: visitorId,
      visitor_auth_id: visitorAuthId,
      session_started_at: new Date(sessionStartedAt).toISOString(),
      status: "open",
      last_message_at: new Date().toISOString(),
      last_message_preview: "Visitor opened chat",
    }),
  });

  if (!Array.isArray(result)) return null;
  return result.find(isConversationRecord) || null;
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

async function touchConversation(conversationId: string, body: string, status = "open"): Promise<void> {
  await supabaseRequest(`chat_conversations?id=eq.${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      last_message_at: new Date().toISOString(),
      last_message_preview: truncate(body, 180),
      status,
    }),
  });
}

async function persistVisitorMessage(
  visitorId: string,
  visitorAuthId: string | null,
  sessionStartedAt: number,
  body: string
): Promise<string | null> {
  if (!hasSupabaseConfig()) return null;
  const conversation = await ensureConversation(visitorId, visitorAuthId, sessionStartedAt);
  if (!conversation) return null;
  await insertStoredMessage(conversation.id, "visitor", body);
  await touchConversation(conversation.id, body);
  return conversation.id;
}

async function persistAssistantMessage(conversationId: string | null, body: string): Promise<void> {
  if (!conversationId) return;
  await insertStoredMessage(conversationId, "assistant", body);
  await touchConversation(conversationId, body);
}

async function listConversations(): Promise<ConversationRecord[]> {
  const result = await supabaseRequest(
    "chat_conversations?select=id,visitor_id,visitor_auth_id,session_started_at,status,last_message_at,last_message_preview&order=last_message_at.desc&limit=50"
  );
  return Array.isArray(result) ? result.filter(isConversationRecord) : [];
}

async function listStoredMessages(conversationId: string, role?: StoredRole): Promise<StoredMessage[]> {
  const roleFilter = role ? `&role=eq.${encodeURIComponent(role)}` : "";
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
        };
      }

      return res.status(200).json({
        configured: true,
        urlSource: status.url?.name ?? null,
        projectHost: status.url ? safeHost(status.url.value) : null,
        serviceKeySource: status.serviceKeyName,
        authKeySource: status.authKeyName,
        tablesReachable: convoProbe !== undefined,
        conversationCount: Array.isArray(convoCount) ? convoCount.length : null,
        messageCount: Array.isArray(msgCount) ? msgCount.length : null,
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
        return res.status(200).json({ messages: await listStoredMessages(conversationId) });
      }

      return res.status(200).json({ conversations: await listConversations() });
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
      const messages = conversation ? await listStoredMessages(conversation.id, "admin") : [];
      return res.status(200).json({ messages });
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

    const clientKey = getClientKey(req);
    if (isAdminLoginThrottled(clientKey)) {
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    }

    const submitted = typeof body.password === "string" ? body.password : "";
    if (!submitted || !safeEquals(submitted, expected)) {
      recordAdminLoginFailure(clientKey);
      console.warn(JSON.stringify({ scope: "ian-chat-admin", login: "failed" }));
      return res.status(401).json({ error: "Incorrect password" });
    }

    clearAdminLoginFailures(clientKey);
    console.info(JSON.stringify({ scope: "ian-chat-admin", login: "ok" }));
    return res.status(200).json({ ok: true, session: issueAdminSession(expected) });
  }

  const event: ChatEvent =
    body.event === "chat_started" || body.event === "admin_reply" ? body.event : "message";
  const visitorId = getVisitorId(body.visitorId);
  const sessionStartedAt = getSessionStartedAt(body.sessionStartedAt);

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

  if (event === "chat_started") {
    await ensureConversation(visitorId, visitorAuthId, sessionStartedAt);
    logConversation(event, visitorId, sessionStartedAt, []);
    await notifyChatEvent(event, visitorId, sessionStartedAt, []);
    return res.status(200).json({ ok: true, event });
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
  const conversationId = await persistVisitorMessage(
    visitorId,
    visitorAuthId,
    sessionStartedAt,
    getLastUserMessage(modelMessages)
  );
  // Never left dangling: an unhandled rejection here would take the whole
  // invocation down instead of just skipping the notification.
  const notificationPromise = notifyChatEvent(
    event,
    visitorId,
    sessionStartedAt,
    modelMessages
  ).catch((error: unknown) => {
    console.error(
      JSON.stringify({
        scope: "ian-chat-notification-error",
        message: error instanceof Error ? error.message : String(error),
      })
    );
  });

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    await notificationPromise;
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  let geminiResponse: Response | null = null;
  let lastStatus = 0;
  let lastDetail = "";

  for (const model of getModelCandidates()) {
    try {
      const response = await requestGemini(apiKey, model, modelMessages);
      if (response.ok) {
        geminiResponse = response;
        break;
      }

      lastStatus = response.status;
      lastDetail = await response.text().catch(() => "");
      if (response.status !== 404 && response.status !== 429 && response.status !== 503) break;
    } catch {
      lastStatus = 502;
      lastDetail = "Could not reach Gemini";
    }
  }

  if (!geminiResponse) {
    await notificationPromise;
    console.info(
      JSON.stringify({
        scope: "ian-chat-gemini-error",
        status: lastStatus,
        detail: lastDetail.slice(0, MAX_UPSTREAM_DETAIL_LENGTH),
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
    await persistAssistantMessage(conversationId, reply);
    logConversation(event, visitorId, sessionStartedAt, [...modelMessages, { role: "model", text: reply }]);
    await notificationPromise;
    writeServerEvent(res, { type: "done", reply });
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
