# AUDIT.md — Phase 0 Portfolio Audit

**Project:** `iandevs` (Marianne "Ian" Napaño) · **Audited:** 2026-11-17 · **Mode:** read-only. No code changed, nothing installed.

> **Scope note.** Only one ZIP (your project) was attached. The Kim De Guzman ZIP did not come through, so the reference was checked via its public URL, which returned text only (no CSS or screenshots). Its visual details (portrait crop, fonts, spacing, motion) are **unverified**. Please re-attach the reference ZIP or screenshots before Phase 1.
>
> **Not verified by running.** `node_modules` is absent and installs were off-limits, so `typecheck`, `build` and a browser run were **not** performed. Findings below come from reading source.

---

## 1. Existing architecture

| Area | What it is |
|---|---|
| Framework | Vite 8 + React 19 + TypeScript 5.9 SPA (not Next.js). `react-router-dom` 7 with `BrowserRouter`. |
| Hosting | Vercel. `vercel.json` rewrites all non-`/api` paths to `index.html`, adds security headers. |
| Backend | `api/chat.ts` (3,211 lines), one Vercel serverless function. Gemini for the AI persona, Supabase (service role) for storage, optional Resend/webhook notifications, HMAC admin session. `vite.config.ts` spins up a local Node server so `/api/chat` works under `vite dev`. |
| Database | Supabase (Postgres + Realtime + anonymous auth). Schema and 8 migrations in `supabase/`. |
| Runtime deps | `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `gsap`, `lucide-react`. |
| Dev deps | `tailwindcss` 4 + `@tailwindcss/vite`, `sharp`, `@vercel/node`, `@vitejs/plugin-react`, `typescript`. |
| Not present | `clsx`, `tailwind-merge`, `class-variance-authority`, Radix/Base UI, `framer-motion`/`motion`, ESLint, Prettier, tests. |
| Routes | `/` (single-scroll home), `/projects` (lazy), `/chat-inbox` (lazy, admin). |
| Styling | Hand-written global CSS (`theme.css`, 2,498 lines) + per-feature CSS + Tailwind **utility classes served from the Play CDN** (see problem P1). "bryl-minimal" monochrome token system. |
| Theme | `data-theme="light\|dark"` on `<html>`, set pre-paint by an inline script in `index.html`, persisted in `localStorage["theme"]`, falls back to `prefers-color-scheme`. `ThemeToggle` does a 450 ms colour crossfade. |
| State/data | No global store. Local `useState`. Content in `src/content/*.ts` plus several hardcoded arrays inside section components. |
| Extras | "Dos" pixel-cat pet (`src/dos/`, vanilla JS), `CommandPalette` (⌘K), GSAP `PixelTransition` hero image swap, scroll-reveal hook, GitHub contribution calendar fetch. |

## 2. Project structure

```
Iandevsu-main/
├─ api/chat.ts                     # serverless chat + admin API (3.2k lines)
├─ supabase/                       # schema.sql, 8 migrations, APPLY_PENDING.sql
├─ public/{images,fonts,assets/kuro}
├─ assets/                         # README/GitHub-profile SVGs (not used by the site)
├─ scripts/                        # resize-images, generate_stats, check-supabase
├─ src/
│  ├─ App.tsx · main.tsx
│  ├─ pages/        ProjectsPage, ChatInboxPage (684 lines)
│  ├─ content/      hero.ts, profile.ts, projects.ts
│  ├─ lib/          api, supabase, navigation, socials, chatFormat, hooks (7), cn
│  ├─ styles/       theme.css (2,498), minimal.css (143)
│  ├─ dos/          dos.js, dos.css, dos.d.ts
│  └─ components/
│     ├─ layout/    MainLayout, Sidebar (426), ThemeToggle, ScrollTopButton
│     ├─ sections/  Hero, AboutMe, Projects, TechStackShowcase, LifeOutsideIDE, GithubActivity, Blog
│     ├─ hero/      HeroPortrait, HeroIntro, HeroQuote, HeroActions, HeroStats, hero.css
│     ├─ projects/  ProjectCard, BuildingPreview, project-preview.css
│     ├─ chat/      ChatWithIan (1,642), ChatBubble, ChatText, ChatTextarea, ReactionBar, TypingIndicator, ChatNotice, ChatPanelHeader, 2 CSS
│     ├─ inbox/     InboxShell, ConversationList/Row, ThreadHeader, Transcript, Composer, SignInGate, EmptyState, Monogram, types, inbox.css
│     ├─ ui/        button, card, badge, input, textarea, skeleton, scroll-area, dropdown-menu, alert-dialog, CommandPalette, PixelTransition, ElasticReel, ui.css
│     └─ icons/     GithubIcon, TechIcon
└─ DESIGN_SYSTEM.md, CHANGELOG.md, README.md, SETUP-NOTES.txt
```

**Pages / sections (all present, all used):** Home = Hero → About → Projects → Stack → Life outside IDE → GitHub activity → Blog. Plus `/projects` and `/chat-inbox`.

**Hero + portrait locations**
- Section: `src/components/sections/Hero.tsx`; parts in `src/components/hero/`; styles `hero.css` plus hero blocks in `theme.css` (~L656–1070).
- Portrait: `HeroPortrait.tsx` → `PixelTransition` (GSAP). Hover or tap swaps `public/images/anime-480w.webp` (illustrated B/W) for `public/images/ianface-480w.webp`. Both are 480×480, displayed in a 5:6 frame with `object-cover` (sides get cropped). The same anime image is the OG/Twitter image and `anime-avatar-64.webp` is the chat avatar.
- Copy: `src/content/hero.ts`.

**Chat / inbox**
- Visitor widget: `components/chat/ChatWithIan.tsx`, mounted globally in `App.tsx` via `VisitorChat` (hidden on `/chat-inbox`). Features: pre-chat name/email form, SSE streaming, localStorage history, reactions, typing signal over Supabase Realtime, admin takeover messages merged in, anonymous Supabase auth.
- Admin inbox: `pages/ChatInboxPage.tsx` + `components/inbox/*`. Password sign-in (HMAC session in `sessionStorage`), conversation list with search and open/archived tabs, unread counts, takeover mode, archive, delete (AlertDialog), reply drafts, 3 s visibility-aware polling plus Realtime. Responsive two-pane (list/thread switch below 900 px).
- Everything works through `/api/chat`; none of it needs to change for a visual redesign.

## 3. Identified problems

### Blocking / high risk for the redesign
- **P1. Tailwind is loaded from the Play CDN** (`<script src="https://cdn.tailwindcss.com">` plus an inline `tailwind.config` in `index.html`). It is the v3 runtime JIT, not for production, causes flash/late styling, and conflicts with the installed **Tailwind v4** + `@tailwindcss/vite`. `theme.css` never has `@import "tailwindcss"`, so the v4 plugin is effectively idle. The colour aliases `bg-card`, `bg-primary`, `text-muted-foreground`… exist only in that inline config.
- **P2. shadcn is not actually wired up.** `components.json` points `utils` at `@/lib/utils` (file doesn't exist; the helper is `lib/cn.ts`), `hooks` at `@/hooks` (no folder), and `style: "base-nova"` (a Base UI-based style, which needs `@base-ui/react`). Current `ui/*` are hand-rolled look-alikes styled by `ui.css` (`ui-button--outline` etc.), not shadcn output. Running `shadcn add button` would overwrite `button.tsx` and break its 6 callers.
- **P3. CSS cascade conflict risk.** `theme.css` is un-layered with its own reset. Tailwind v4 puts utilities in `@layer utilities`, and un-layered CSS **beats** layered CSS. Once v4 is truly enabled, existing global classes will silently override utilities.
- **P4. Two overlapping design layers.** `minimal.css` is a patch layer that hides what `theme.css` / `hero.css` still define (title bars, dots, halftone, grid, glows, hover lifts, section shells). The hero JSX still renders the `hero-titlebar` + three dots that `minimal.css` then hides with `display:none`. Roughly a quarter of the CSS is dead or overridden, and `!important` appears 12× in total.

### Medium
- **P5. Duplicated / drifting content.**
  - `content/profile.ts` (chat persona) still lists *old* projects (Coffee Shop, Calculator, To-Do, Weather) while `content/projects.ts` lists Sifted Café, LMS Notifier, FRAME, Dear in Stereo, Sora. The AI chat will describe the wrong projects.
  - `api/chat.ts` re-declares its own `PROFILE` and a hard-coded persona paragraph (documented as intentional, but it has already drifted).
  - Location/school/age facts are repeated as literals in `AboutMe.tsx`, `profile.ts`, `api/chat.ts`, `README.md`.
  - Social URLs live in `socials.tsx`, `HeroStats.tsx`, `profile.ts` and `GithubActivity.tsx` (username).
  - Hardcoded arrays inside components: `AboutMe` FACTS/specs, `TechStackShowcase` STACK, `LifeOutsideIDE` INTERESTS/GALLERY, `Blog` POSTS (including Medium image URLs hot-linked from `miro.medium.com`).
  - Resume link is empty (`profile.links.resume = ""`), so the sidebar "view resume" pill never shows.
- **P6. Hardcoded year in a fetch:** `GithubActivity.tsx` calls `…?y=2026`. It will show an empty/stale graph from Jan 2027.
- **P7. Name inconsistency:** `<title>` says "Marianne Napaño", OG title says "MRN", UI says "Ian". Also the meta description says "HTML, CSS, and JavaScript" only. Pick one brand string.
- **P8. Oversized files:** `ChatWithIan.tsx` (1,642 lines, ~35 hooks), `api/chat.ts` (3,211), `ChatInboxPage.tsx` (684), `theme.css` (2,498). `ChatWithIan`'s CSS is split across `theme.css` + `chat-ux.css` + `chat-redesign.css`, and `chat-ux.css` targets elements by `aria-label` text (`button[aria-label="Close chat"]`), which is brittle.
- **P9. Stale docs:** `DESIGN_SYSTEM.md` describes CSS Modules, `DepthCarousel`, `Stack.module.css`, a 2,327-line `theme.css` and "Tailwind not compiled"; none match the code now. `navigation.ts` cites a `.clinerules` file that isn't in the repo.
- **P10. Duplicated tokens:** the dark palette is written **twice** in `theme.css` (`[data-theme="dark"]` and the `prefers-color-scheme` fallback). Light/dark gray ramps are also redefined per theme with numeric names whose meaning inverts (`--gray-400` is lighter-than-500 in light, darker in dark).
- **P11. Inline styles and colours:** ~65 `style={{…}}` usages; hero dots hard-code `var(--gray-300)`; `--status-*` colours break the "no accent" rule on purpose but are hex-literal in several places.

### Low / watch
- **P12. Portrait:** 480×480 sources are scaled into a 240 px-wide 5:6 frame; on 2× screens that is ~1.0× density (soft). Side crop of a square image in a portrait frame may cut the subject. The caption says "Hover or tap" (OK) but the swap depends on GSAP, so the portrait has no non-JS interaction.
- **P13. Duplicate section chrome:** each section re-implements `px-5 py-16 lg:px-6` + `max-w-4xl mx-auto` + `section-eyebrow` instead of a shared `<Section>` component.
- **P14. Always-on extras:** the Dos cat and GSAP load on every route (GSAP is only used by `PixelTransition`). `ElasticReel`, `skeleton`, `alert-dialog` each have a single caller.
- **P15. `ScrollToTop`** uses smooth scrolling on every route change.
- **P16. No tests, linter or CI** (only `stats.yml`). `CHANGELOG.md` itself says typecheck/build were never run in its sandbox.
- **P17. SEO:** OG image is a 480×480 illustration, `twitter:card="summary"`; no sitemap/robots; SPA means no pre-rendered content.

### Responsive observations (from CSS review, not rendered)
- Breakpoints are inconsistent: Tailwind `sm/md/lg` (640/768/1024), hero card **720**, inbox **900**, plus `639/719.98/899` max-width mirrors. Documented in tokens but easy to mis-step.
- Sidebar is fixed from `lg` up (`sidebar-offset`); below that the top bar is `fixed` and content gets `pt-20/24`.
- Chat panel is `fixed` bottom-right and also overlaps the Dos cat (`z-index:45`, bottom-left) and `ScrollTopButton` on narrow screens: needs visual verification.
- The one prior fix in `App.tsx` (chat pill covering the inbox send button) shows corner-stacking of fixed elements is a recurring hazard.
- Visual check at 360 / 390 / 768 / 1024 / 1440 px is required in Phase 1 before any claim of "no overflow".

## 4. shadcn + Magic UI compatibility

**Prerequisite for any of them:** fix P1–P3 (enable Tailwind v4 properly, alias `utils`, add `clsx` + `tailwind-merge`, pick shadcn style `new-york` or keep `base-nova` + `@base-ui/react`). Magic UI also needs `motion` (framer-motion successor) for most animated components.

| Component | Verdict | Notes |
|---|---|---|
| shadcn `button`, `badge`, `card`, `input`, `textarea`, `skeleton` | ✅ Compatible | Already exist as look-alikes. Replace gradually; keep the API (`variant`, `size`, `icon`) via a wrapper so the 6+ callers and the inbox keep working. |
| shadcn `scroll-area`, `dropdown-menu`, `alert-dialog` | ⚠️ Compatible with care | Current ones are hand-built. Swapping brings Radix/Base UI deps and focus/portal behaviour changes inside the **admin inbox**. Do last, test inbox. |
| shadcn `command` (palette) | ⚠️ Optional | `CommandPalette.tsx` works; replace only if wanted. Needs `cmdk`. |
| shadcn `sonner`, `tooltip`, `separator`, `sheet` | ✅ Safe additions | `sheet` is a good fit for mobile nav. |
| shadcn `sidebar` | ❌ Skip | Custom `Sidebar.tsx` has scroll-spy, ⌘K, theme toggle; the shadcn one is an app-shell, not a portfolio nav. |
| Magic UI `blur-fade`, `text-animate`, `word-rotate`, `number-ticker`, `marquee`, `dock`, `border-beam`, `shine-border`, `animated-gradient-text`, `ripple`, `dot-pattern`, `grid-pattern`, `bento-grid`, `magic-card`, `shimmer-button`, `typing-animation` | ✅ Compatible | Pure React + Tailwind + `motion`. Fit the stack once v4 works. Several (`blur-fade`) could replace `useRevealOnScroll`. |
| Magic UI `particles`, `meteors`, `globe`, `orbiting-circles`, `neon-gradient-card` | ⚠️ Conflicts with design language | Colourful/glowy; the site is monochrome ("no accent ever") and `minimal.css` removes glows. Use only if the new direction drops that rule. |
| Magic UI `safari`/`iphone`/`android` mockups | ✅ Good for project previews | Replaces the `building-preview` scenes. |

Dependency impact if all "compatible" items are adopted: `clsx`, `tailwind-merge`, `class-variance-authority`, `motion`, plus Radix/Base UI packages and `cmdk` if those pieces are taken. `gsap` can stay for `PixelTransition`, or be dropped if replaced.

## 5. Recommended improvements

1. Make Tailwind real: remove the CDN script, `@import "tailwindcss"` in the CSS entry, move the inline colour/font config to `@theme inline` using existing `--bg/--ink/--gray-*` tokens, put legacy global CSS into a `@layer` so utilities win.
2. Align shadcn: add `lib/utils.ts` (re-export `cn` upgraded with clsx+twMerge), fix `components.json` aliases, then regenerate primitives behind the same prop API.
3. Collapse the two visual layers: fold `minimal.css` into `theme.css`/`hero.css` and delete the dead title bar/halftone/grid code. Keep one dark palette block.
4. Single source of truth for content: one `content/site.ts` feeding hero, about, sidebar, socials, blog, chat persona and `api/chat.ts`. Update the stale project list used by the AI.
5. Introduce a shared `<Section>` wrapper (eyebrow, spacing, reveal).
6. Split `ChatWithIan.tsx` into hooks (`useChatSession`, `useChatStream`, `useChatRealtime`) and components, with no behaviour change; move its CSS into one file and swap `aria-label` selectors for class names.
7. Fix small bugs: dynamic year in GitHub fetch, brand/title consistency, resume link, local copies of Medium images.
8. Portrait: supply higher-res source (≥ 960 px) with `srcset`, set a deliberate crop (`object-position`), keep both reveal states.
9. Add ESLint + a build/typecheck CI step, and run `npm run typecheck && npm run build` locally to get a baseline before changing anything.

## 6. Implementation priorities (practical order)

| # | Phase | Why this order | Risk |
|---|---|---|---|
| 0 | **Baseline:** `npm i && npm run typecheck && npm run build`, screenshot every route at 5 widths, test chat + inbox | Without this, regressions can't be told from pre-existing bugs | Low |
| 1 | **Tailwind v4 properly + `@theme` + layering** (P1, P3) | Everything else depends on it | **High**; do alone, in a branch |
| 2 | **shadcn plumbing** (`utils`, `components.json`, `cn` upgrade) and swap `button/badge/card/input/textarea/skeleton` behind the existing API (P2) | Low blast radius, immediate consistency | Medium |
| 3 | **Theme cleanup:** merge `minimal.css`, dedupe dark tokens, remove dead chrome (P4, P10) | Gives a clean base for the new look | Medium |
| 4 | **Content consolidation + fix drift/bugs** (P5–P7) | Cheap, user-visible, and fixes wrong AI answers | Low |
| 5 | **Hero + portrait redesign** (using the reference once re-supplied), `<Section>` wrapper, Magic UI `blur-fade` / `text-animate` / `marquee` | The visible payoff | Medium |
| 6 | **Remaining sections, project cards (device mockups), blog** | Builds on the new primitives | Low |
| 7 | **Chat widget visual refresh** (CSS only first, then split the file) | Largest file; keep behaviour frozen | **High** |
| 8 | **Admin inbox** visual alignment, optional Radix/Base UI swaps | Private page; do last | Medium |
| 9 | **Polish:** responsive pass at 360–1440 px, a11y, reduced-motion, SEO/OG, lighthouse | Final | Low |

## 7. Preserved, not touched

All content, personal info, links, chat/inbox functionality, Supabase schema and API are untouched by this phase. This audit added **only** this file.

## 8. Open questions for you

1. Please re-attach the Kim De Guzman ZIP (or screenshots) so Phase 1 matches its visuals accurately.
2. The reference is dark, lowercase, numbered sections, with an "open to opportunities" tag. Should yours keep the **monochrome / no-accent rule**, or may the redesign add one accent colour?
3. Name on the site: **Marianne Napaño**, **Ian**, or both with a fixed pattern?
4. Do you have a higher-resolution portrait, and a resume URL to enable the resume link?
