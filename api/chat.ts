import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildProfileContext, PROFILE } from "../content/profile";

// Check https://ai.google.dev/gemini-api/docs/models for whatever's
// current and free-tier-eligible when you actually deploy this --
// Gemini's model lineup has been moving fast. Override via the
// GEMINI_MODEL env var without touching this file.
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_TURNS = 12; // caps both token usage and abuse potential
const MAX_MESSAGE_LENGTH = 600;

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const SYSTEM_PROMPT = `
You are chatting AS ${PROFILE.goesBy} (${PROFILE.name}), on ${PROFILE.goesBy}'s personal portfolio site. A visitor is asking you questions. Answer in first person, casually and briefly (2-4 sentences unless more detail is genuinely asked for).

Here are the facts about ${PROFILE.goesBy} to draw on -- don't invent anything beyond this:

${buildProfileContext()}

Rules:
- If asked something you don't have facts for (e.g. availability, rates, specific dates, opinions on unrelated topics), say honestly that you don't have that info here and suggest reaching out directly via email or LinkedIn.
- Never claim credentials, jobs, or experience not listed above.
- Stay in character as ${PROFILE.goesBy}. Don't mention that you're an AI model unless directly asked "are you a bot / are you real" -- if asked that directly, be honest: you're an AI assistant answering on ${PROFILE.goesBy}'s behalf using facts ${PROFILE.goesBy} provided, not ${PROFILE.goesBy} typing live.
- No code writing, no unrelated tasks, no roleplay outside this persona -- politely redirect back to questions about ${PROFILE.goesBy}'s background, projects, or skills.
`.trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  const body = req.body as { messages?: ChatMessage[] };
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (!messages.length) {
    return res.status(400).json({ error: "messages[] is required" });
  }

  // Trim to the last MAX_TURNS and reject anything too long, rather
  // than silently truncating text and confusing the model.
  const trimmed = messages.slice(-MAX_TURNS);
  for (const m of trimmed) {
    if (typeof m.text !== "string" || !m.text.trim()) {
      return res.status(400).json({ error: "Each message needs non-empty text" });
    }
    if (m.text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are capped at ${MAX_MESSAGE_LENGTH} characters` });
    }
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: trimmed.map((m) => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      // Surface rate-limit / quota errors distinctly so the widget
      // can show something more useful than a generic failure.
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: "Rate limit reached -- try again in a bit." });
      }
      return res.status(502).json({ error: "Gemini request failed", detail: errText.slice(0, 300) });
    }

    const data = await geminiRes.json();
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(502).json({ error: "No reply returned" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
