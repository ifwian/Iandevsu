#!/usr/bin/env node
/**
 * Supabase health check for the chat.
 *
 *   node --env-file=.env.local scripts/check-supabase.mjs
 *
 * Run it yourself, in your own terminal: it reads your keys from the environment
 * (Node loads the file; nothing here opens it) so the keys never have to be
 * pasted anywhere. It prints PASS / FAIL / WARN lines and what to do about each.
 * It never prints a key, a token or a password.
 *
 * It answers the two questions that stop the chat from working:
 *   1. Can a visitor's browser start an anonymous session?
 *   2. Does the database have everything the code queries?
 *
 * The anonymous sign-in test creates one throwaway anonymous user; when the
 * service key is set, it deletes that user again.
 */

const env = process.env;
const first = (...names) => names.map((name) => env[name]).find((value) => value && value.trim()) ?? "";

const URL_BASE = first("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_URL", "SUPABASE_URL").trim().replace(/\/+$/, "");
const ANON_KEY = first("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY").trim();
const SERVICE_KEY = first("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY").trim();

const results = { pass: 0, fail: 0, warn: 0 };
const say = (tag, label, detail = "") => {
  results[tag.toLowerCase()] += 1;
  console.log(`${tag.padEnd(4)}  ${label}${detail ? `  (${detail})` : ""}`);
};
const hint = (text) => console.log(`        -> ${text}`);
const section = (title) => console.log(`\n${title}`);

/** The role / project ref inside a JWT-style key. Not secret: it is the public part of the token. */
function describeKey(key) {
  if (!key) return { kind: "missing" };
  if (key.startsWith("sb_publishable_")) return { kind: "publishable", role: "anon" };
  if (key.startsWith("sb_secret_")) return { kind: "secret", role: "service_role" };
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return { kind: "jwt", role: payload.role, ref: payload.ref };
    } catch {
      /* not decodable: fall through */
    }
  }
  return { kind: "unknown" };
}

async function call(path, { method = "GET", key, body, bearer } = {}) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const response = await fetch(`${URL_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

/** Pull a human message out of a Supabase error body. Never includes tokens. */
const messageOf = (data) =>
  String(data?.msg ?? data?.message ?? data?.error_description ?? data?.error ?? "").slice(0, 200);

async function checkEnvironment() {
  section("1. Settings");
  if (!URL_BASE) {
    say("FAIL", "Supabase URL is set", "none of VITE_SUPABASE_URL / SUPABASE_URL found");
    return false;
  }
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(URL_BASE);
  if (!/^https:\/\//.test(URL_BASE) && !isLocal) say("FAIL", "Supabase URL uses https", "browsers block anonymous sign-in over http");
  else say("PASS", "Supabase URL is set");

  const anon = describeKey(ANON_KEY);
  const service = describeKey(SERVICE_KEY);
  let ok = true;

  if (!ANON_KEY) {
    say("FAIL", "browser (anon) key is set", "VITE_SUPABASE_ANON_KEY missing");
    ok = false;
  } else if (anon.role === "service_role" || anon.kind === "secret") {
    say("FAIL", "browser key is the anon/publishable key", "this is a SERVICE key: it must never be in a VITE_ variable");
    hint("rotate that key in Supabase now, then put the anon/publishable key in VITE_SUPABASE_ANON_KEY");
    ok = false;
  } else {
    say("PASS", "browser (anon) key is set", anon.kind === "unknown" ? "format not recognised" : `${anon.kind}, role ${anon.role ?? "?"}`);
  }

  if (!SERVICE_KEY) {
    say("WARN", "service key is set", "SUPABASE_SERVICE_ROLE_KEY missing: the schema check below is skipped");
  } else if (SERVICE_KEY === ANON_KEY) {
    say("FAIL", "service key differs from the browser key", "they are identical");
    ok = false;
  } else if (service.role && service.role !== "service_role") {
    say("FAIL", "service key has the service_role role", `its role is "${service.role}"`);
    ok = false;
  } else {
    say("PASS", "service key is set", service.kind);
  }

  const host = (() => {
    try {
      return new URL(URL_BASE).hostname;
    } catch {
      return "";
    }
  })();
  const urlRef = host.endsWith(".supabase.co") ? host.split(".")[0] : "";
  for (const [name, desc] of [["browser", anon], ["service", service]]) {
    if (urlRef && desc.ref && desc.ref !== urlRef) {
      say("FAIL", `${name} key belongs to the same project as the URL`, "its project reference differs");
      hint("copy the URL and the keys from the same project: Settings > API in the Supabase dashboard");
      ok = false;
    }
  }
  return ok;
}

async function checkAnonymousSignIn() {
  section("2. Visitor sessions (anonymous sign-in)");
  if (!URL_BASE || !ANON_KEY) {
    say("WARN", "anonymous sign-in test", "skipped: settings above are incomplete");
    return;
  }
  let result;
  try {
    result = await call("/auth/v1/signup", { method: "POST", key: ANON_KEY, body: {} });
  } catch (error) {
    say("FAIL", "reach the Supabase auth server", error instanceof Error ? error.message : "network error");
    hint("check the URL, your connection, and that the project is not paused (Supabase dashboard)");
    return;
  }

  const { status, data } = result;
  const message = messageOf(data);

  if (status === 200 && data?.access_token) {
    say("PASS", "a visitor's browser can start an anonymous session");
    const userId = data?.user?.id;
    if (userId && SERVICE_KEY) {
      try {
        const removed = await call(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
          key: SERVICE_KEY,
          bearer: SERVICE_KEY,
        });
        if (removed.status >= 200 && removed.status < 300) say("PASS", "removed the throwaway test user");
        else say("WARN", "remove the throwaway test user", `HTTP ${removed.status}: delete one anonymous user by hand in Authentication > Users`);
      } catch {
        say("WARN", "remove the throwaway test user", "request failed: delete one anonymous user by hand");
      }
    } else if (userId) {
      say("WARN", "throwaway test user left behind", "no service key to delete it: Authentication > Users");
    }
    return;
  }

  const lower = message.toLowerCase();
  if (lower.includes("anonymous") && (lower.includes("disabled") || lower.includes("not enabled"))) {
    say("FAIL", "anonymous sign-ins are enabled", `HTTP ${status}: ${message}`);
    hint("Supabase dashboard > Authentication > Sign In / Providers > turn on \"Allow anonymous sign-ins\"");
  } else if (status === 401 || status === 403 || lower.includes("api key") || lower.includes("jwt")) {
    say("FAIL", "Supabase accepts the browser key", `HTTP ${status}: ${message || "rejected"}`);
    hint("VITE_SUPABASE_ANON_KEY is wrong, expired, or from another project. Copy it from Settings > API.");
    hint("On Vercel set it for Production AND Preview, then REDEPLOY: VITE_ variables are baked in at build time.");
  } else if (lower.includes("captcha")) {
    say("FAIL", "anonymous sign-in without a CAPTCHA", `HTTP ${status}: ${message}`);
    hint("CAPTCHA protection is on in Supabase but the widget does not send a token: switch it off or add the token");
  } else if (status === 429) {
    say("WARN", "anonymous sign-in rate limit", "rate limited right now: wait a few minutes and run it again");
  } else {
    say("FAIL", "start an anonymous session", `HTTP ${status}: ${message || "unexpected response"}`);
  }
}

async function checkSchema() {
  section("3. Database (what the code queries)");
  if (!URL_BASE || !SERVICE_KEY) {
    say("WARN", "database check", "skipped: needs SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const get = async (path) => {
    try {
      return await call(path, { key: SERVICE_KEY, bearer: SERVICE_KEY });
    } catch (error) {
      return { status: 0, data: { message: error instanceof Error ? error.message : "network error" } };
    }
  };

  let missing = false;
  const tables = ["chat_conversations", "chat_messages", "chat_conversation_notes", "chat_message_reactions", "chat_visitor_activity"];
  for (const table of tables) {
    const { status, data } = await get(`/rest/v1/${table}?select=*&limit=0`);
    if (status >= 200 && status < 300) say("PASS", `table ${table} exists`);
    else if (data?.code === "PGRST205" || status === 404) {
      say("FAIL", `table ${table} exists`, "missing");
      missing = true;
    } else say("FAIL", `table ${table} readable`, `HTTP ${status}: ${messageOf(data)}`);
  }

  // The columns the inbox features depend on, checked one by one so the report names the missing one.
  const columns = ["visitor_email", "mode", "unread_count", "first_seen_at", "device", "current_page"];
  for (const column of columns) {
    const { status, data } = await get(`/rest/v1/chat_conversations?select=${column}&limit=1`);
    if (status >= 200 && status < 300) say("PASS", `column chat_conversations.${column} exists`);
    else if (data?.code === "42703") {
      say("FAIL", `column chat_conversations.${column} exists`, "missing");
      missing = true;
    } else if (data?.code === "PGRST205") {
      // the table itself is missing; already reported above
    } else say("FAIL", `column chat_conversations.${column} readable`, `HTTP ${status}: ${messageOf(data)}`);
  }

  if (missing) {
    hint("the database is behind the code. In the Supabase SQL Editor, paste and run supabase/APPLY_PENDING.sql");
    hint("(safe to run more than once). Export chat_conversations and chat_messages as CSV first, as a backup.");
  }
}

console.log("Supabase health check  (no keys are printed)");
await checkEnvironment();
await checkAnonymousSignIn();
await checkSchema();

console.log(`\n${results.pass} passed, ${results.fail} failed, ${results.warn} warnings`);
if (results.fail === 0) console.log("Looks healthy. Reload the site and try the chat.");
process.exit(results.fail > 0 ? 1 : 0);
