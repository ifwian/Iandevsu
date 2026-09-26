import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildProfileContext, PROFILE } from "../content/profile.js";

const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];
const MAX_TURNS = 12;
const MAX_MESSAGE_LENGTH = 600;
const NOTIFICATION_TIMEOUT_MS = 3500;
const NOTIFICATION_EMAIL = "iandevsu@gmail.com";
const SUPABASE_TIMEOUT_MS = 5000;

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

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: messages.map((message) => ({
        role: message.role === "model" ? "model" : "user",
        parts: [{ text: message.text }],
      })),
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    }),
  });
}

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

interface StoredMessage {
  id: number;
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
}

const SYSTEM_PROMPT = `
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

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseConfig());
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
          detail: detail.slice(0, 300),
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

function hasAdminToken(req: VercelRequest): boolean {
  const expected = process.env.CHAT_ADMIN_TOKEN;
  const authorization = req.headers?.authorization;
  if (!expected || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice(7));
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}

async function getSupabaseUserId(req: VercelRequest): Promise<string | null> {
  const config = getSupabaseConfig();
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const authorization = req.headers?.authorization;
  if (!config || !anonKey || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
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

async function hasAdminAccess(req: VercelRequest): Promise<boolean> {
  if (hasAdminToken(req)) return true;
  const userId = await getSupabaseUserId(req);
  if (!userId) return false;
  const result = await supabaseRequest(
    `profiles?id=eq.${encodeURIComponent(userId)}&role=eq.admin&select=id&limit=1`
  );
  return Array.isArray(result) && result.length > 0;
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

function isStoredMessage(value: unknown): value is StoredMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
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
  return Array.isArray(result) ? result.filter(isStoredMessage) : [];
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

  const processBlock = (block: string): void => {
    const data = getSseData(block);
    if (!data || data === "[DONE]") return;

    try {
      const text = getGeminiText(JSON.parse(data));
      if (!text) return;
      reply += text;
      writeServerEvent(res, { type: "chunk", text });
    } catch {
      return;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";
    blocks.forEach(processBlock);

    if (done) {
      if (buffer.trim()) processBlock(buffer);
      break;
    }
  }

  if (!reply.trim()) throw new Error("Gemini returned no reply");
  return reply;
}

export const config = { maxDuration: 60 };

async function handleChat(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const query = getRequestQuery(req);

    if (query.get("admin") === "1") {
      if (!(await hasAdminAccess(req))) {
        return res.status(401).json({ error: "Admin authorization required" });
      }
      if (!hasSupabaseConfig()) {
        return res.status(503).json({ error: "Supabase is not configured" });
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

    return res.status(200).json({ configured: Boolean(getGeminiApiKey()) });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);
  const event: ChatEvent =
    body.event === "chat_started" || body.event === "admin_reply" ? body.event : "message";
  const visitorId = getVisitorId(body.visitorId);
  const sessionStartedAt = getSessionStartedAt(body.sessionStartedAt);

  if (event === "admin_reply") {
    if (!(await hasAdminAccess(req))) {
      return res.status(401).json({ error: "Admin authorization required" });
    }
    if (!hasSupabaseConfig()) {
      return res.status(503).json({ error: "Supabase is not configured" });
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
  const notificationPromise = notifyChatEvent(event, visitorId, sessionStartedAt, modelMessages);

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
        detail: lastDetail.slice(0, 300),
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

    if (res.headersSent) {
      res.end();
      return;
    }

    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
