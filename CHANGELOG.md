## Hero wordmark + terminal removal

- Wordmark fix: it was ~300px wide because `.hero-column` is `align-items: flex-start` (the h1 shrink-wrapped and a canvas has no content width). The h1 now stretches to the column, the name is drawn in the body face (Geist 500, not Geist Pixel) at up to 120px, and the box is up to 8rem tall.

- Removed the fake terminal ("$ whoami / git log / echo") from the GitHub activity section, and the now-unused `components/ui/terminal.tsx` (no other importers).
- Hero name is now a React Bits `TechText` wordmark inside the same `<h1>` (`components/ui/TechText.jsx/.css/.d.ts`): Geist Pixel in the theme ink, letters turn to dashed outlines under the pointer, drag/kick, a typed-in intro. Reduced-motion users get still solid letters. Two edits to the vendored source are noted at its top.

## Dos + collapsible sidebar pass

- Dos: every sprite set now maps to a named state (`data-pose` on `.dos`: sit, walk, run, yawn, sleep, scratch, alert, carried). Verified against the 8x4 sheet: sit is frame (3,3), yawn (3,2), alert (7,3), sleep (2,0)/(2,1).
- Dos: fixed walking frames freezing on screen at tour stops whose spot lay outside her bounds. Waypoints are clamped, and a blocked walk now counts as arrival and sits her down.
- Dos: tour arrival hop keeps the seated pose (it used the startled alert frame). Sprinting shortens the stride, so the run cycle is faster.
- Dos: the speech bubble is clamped to the viewport every frame while she moves (it could drift 5-20px off-screen).
- Dos: rare one-line remarks when a section first reaches mid-screen (once each, 50% chance, 30 s apart, never during a tour or while asleep).
- Sidebar: collapses to an icon rail (`html[data-sidebar="collapsed"]` flips `--sidebar-w`; content offset and reading column follow). Toggle button, Ctrl/Cmd+B, preference persisted and restored before first paint, shared fixed-position tooltips (mouse hover and keyboard focus, Escape hides), reduced-motion safe.
- Sidebar: mobile menu closes on Escape (focus returns to the menu button) and on outside press.
- Fixed: the scroll-to-top button sat directly on the chat launcher; it now stacks above it, right-aligned, and Dos's bubble avoids it (`data-dos-avoid`).
- New: `src/lib/useSidebarState.ts`, `src/components/layout/RailTooltip.tsx`; tokens `--sidebar-w-collapsed`, `--rail-dur`, `--content-max`.

## Polish pass

- Theme switch is now an even 450ms colour crossfade (was a circular wipe that jumped).
- Light-mode grey ramp corrected to a true light-to-dark scale (it was out of order), matching the dark theme's hierarchy.
- All ink-tinted shadows/glows removed (they showed as a pale haze in dark mode).
- Professional hero and meta copy; hairline reading-progress bar; print/PDF stylesheet; selection and focus styles.

## Minimal pass

- Hero: portrait, caption and copy centred on mobile (<720px); side-by-side unchanged above.
- New src/styles/minimal.css strips window chrome, grid texture, halftone, glows, pulsing and hover lifts. Delete it to revert.
- Chat inbox: fixed `align-items: normal` typos (now centre), restored the admin bubble fill, panes fill the viewport and scroll internally, tighter mobile spacing.
- Restored the portfolio README (the GitHub-profile README had overwritten it).

## Unreleased

- Design tokens for type, spacing, radius, z-index and breakpoints; ~100 hardcoded px values in CSS now reference them.
- Responsive: dvh viewport units, fluid gutters and display type, small-phone and touch-target rules, no horizontal overflow.
- theme-color meta follows the active theme; added themed `--status-error`.
- Removed unused imports in ChatInboxPage (typecheck is clean).

# Changelog / Testing Report

## Fixed
- `src/components/ErrorBoundary.tsx`: never showed its fallback (missing `getDerivedStateFromError`); typed props/state (removed `any`).
- `src/main.tsx`: ErrorBoundary was never mounted; now wraps `<App />`.
- `src/components/chat/ChatWithIan.tsx`: removed a dev-only effect that made an extra `GET /api/chat` just to `console.log("API Key loaded")`.
- `package.json`: removed the placeholder `test` script that always failed.

## Removed files
None (nothing was safe to delete without a build to verify).

## Tests
- PASSED (static): all relative and `@/` imports resolve; all `/images`, `/fonts`, `/assets` references exist in `public/`.
- NOT PERFORMED: `npm install`, `npm run typecheck`, `npm run build`, running the site, chat, login/admin inbox, Supabase CRUD, responsive checks. The sandbox has no network (npm registry unreachable) and there are no Supabase/Gemini credentials. Run `npm install && npm run typecheck && npm run build` locally to verify.

## Remaining observations (not changed)
- `index.html` loads Tailwind via the Play CDN (`cdn.tailwindcss.com`) with an inline config, while `tailwindcss` and `@tailwindcss/vite` are installed but `theme.css` does not import Tailwind. Switching to the build-time plugin is recommended for production but needs a build to verify, so I left it.
- `api/chat.ts` duplicates profile facts from `src/content/profile.ts` (intentional, documented in README).

## Setup
See README.md: Node 20.19+/22.12+, `npm install`, `cp .env.example .env.local`, `npm run dev`. Database: run `supabase/schema.sql` on a fresh Supabase project.


## Phase 3 — Theme system
See TESTING-REPORT.md and HANDOFF.md (Phase 3).
