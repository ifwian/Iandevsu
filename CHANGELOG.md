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
