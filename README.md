# Marianne Napaño — Portfolio

Personal portfolio of Marianne Napaño ("Ian"), a Computer Science student and aspiring web developer. A single-page site in a monochrome, terminal-inspired design ("bryl-minimal"), with a Gemini-powered "Chat with Ian" assistant and a password-protected admin inbox.

**Live:** <https://iandevs.vercel.app/>

## Screenshots

| Home | Projects | Chat |
|---|---|---|
| `<screenshot: home>` | `<screenshot: /projects>` | `<screenshot: chat widget>` |

## Features

- Numbered sections: home, about, projects, tech stack, education, life outside the IDE, GitHub activity, blog
- Light / dark / system theme with a no-flash init script
- ⌘K command palette for section navigation
- 3D photo carousel and pixel-dissolve portrait (GSAP), both respecting `prefers-reduced-motion`
- "Chat with Ian": streams answers from Gemini via a serverless function; the API key never reaches the browser
- Conversations persisted to Supabase, with an admin inbox at `/chat-inbox` (human takeover, statuses, internal notes, visitor activity, reactions)

## Tech stack

- **Frontend:** Vite, React 19, TypeScript, React Router
- **Styling:** design tokens in `src/styles/theme.css`, Tailwind utility classes for layout
- **Fonts:** Kode Mono (headings and UI chrome), Geist (body), Source Serif 4 (prose)
- **Animation:** GSAP
- **Icons:** lucide-react, Devicon
- **Backend:** Vercel serverless function (`api/chat.ts`), Google Gemini API, Supabase (Postgres + anonymous auth)

## Project structure

```
api/chat.ts            Vercel serverless function: Gemini proxy, persistence, admin endpoints
src/
  main.tsx, App.tsx    entry point and routes
  styles/theme.css     design tokens and component classes
  components/          layout, sections, ui, chat, projects
  content/             profile and project data
  lib/                 shared helpers (Supabase client, formatting, navigation)
  pages/               /projects and /chat-inbox
public/                images and static assets
supabase/              schema.sql (fresh database), migrations/, APPLY_PENDING.sql (upgrades)
```

`@/*` resolves to `src/*`.

`api/chat.ts` keeps its own copy of the profile facts instead of importing `src/content/profile.ts`. Imports from outside `/api` break the Vercel function at runtime. If you change facts in `src/content/profile.ts`, update `api/chat.ts` too.

## Getting started

Requirements: Node.js 20.19+ or 22.12+ (required by Vite 8) and npm.

```bash
npm install
cp .env.example .env.local   # fill in the values you need
npm run dev
```

`npm run dev` serves both the site and the API. A small plugin in `vite.config.ts` mounts `api/chat.ts` on a loopback port and proxies `/api` to it, loading `.env.local` first, so `vercel dev` is not required.

### Supabase (optional, needed for history and the inbox)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Enable **Authentication → Providers → Anonymous**. Without it, visitors stop receiving admin replies.
3. To upgrade an existing database, run `supabase/APPLY_PENDING.sql` instead. It is idempotent.

Without Supabase the chat still answers, but nothing is saved.

## Environment variables

Set these in `.env.local` for local development and in the Vercel project settings for deployments. Never commit real values. `.env.example` lists every name.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes (chat) | Gemini API key, server-side only |
| `GEMINI_MODEL` | no | Overrides the default model |
| `SUPABASE_URL` | for persistence | Supabase project URL, server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Service-role key, server-side only |
| `SUPABASE_ANON_KEY` | for persistence | Used to verify visitor sessions |
| `VITE_SUPABASE_URL` | for persistence | Supabase URL exposed to the browser |
| `VITE_SUPABASE_ANON_KEY` | for persistence | Anon key exposed to the browser |
| `CHAT_ADMIN_PASSWORD` | on every deployment | Admin inbox password; the inbox returns 503 on a deployment without it |
| `CHAT_NOTIFICATION_EMAIL` | no | Where new-chat notifications go |
| `RESEND_API_KEY` | no | Sends notification emails via Resend |
| `CHAT_NOTIFICATION_FROM` | no | Sender address for notification emails |
| `CHAT_NOTIFICATION_WEBHOOK` | no | Alternative webhook for notifications |
| `CHAT_DEV_API_PORT` | no | Local API port (default 8787) |
| `VITE_API_BASE_URL` | no | Overrides the API base URL used by the browser |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (site + local chat API) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check the whole project (`tsc --noEmit`) |
| `npm run images:resize` | Generate the sized WebP/PNG image copies in `public/images/` |

## Deployment

Deployed on Vercel. `vercel.json` configures the `api/chat.ts` function and the SPA rewrite to `index.html`. Add the environment variables above in the Vercel project settings before deploying.

## Known limitations

- Admin login and visitor chat messages are each rate limited. The limits live in memory per function instance, so they are best-effort rather than hard.
- Chat attachments are sent as file names only. The assistant reads text, and no files are uploaded.
- The admin inbox updates by polling. Its Supabase Realtime subscriptions currently receive nothing.
- Google's free tier may use prompts and outputs to improve its models.
