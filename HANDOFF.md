# HANDOFF — portfolio (Vite 8 / React 19 / TS 5.9)

State: `npm run typecheck` and `npm run build` both PASS.

## Facts a new Claude must know

- Utilities come from the **Tailwind Play CDN** in `index.html` (v3 runtime), NOT from the Vite Tailwind plugin. Do not use v4-only syntax (`@theme`, `@custom-variant`, `@import "tailwindcss"`) in CSS — it is ignored/warns. Define custom classes in plain CSS.
- Colours come from CSS variables in `src/styles/theme.css` (`--ink`, `--bg`, `--gray-50…900`). `src/styles/red-black.css` is a misnamed monochrome layer; `--accent` follows the theme (black in light, near-white in dark).
- `html { scroll-behavior: smooth }` is global, so any code that scrolls then measures must scroll with `behavior: "instant"`.
- Project is not a git repo (was, but initial commit was pushed to GitHub). Do not touch `src/dos/dos.js` tour logic beyond the notes below.
- The sidebar uses numbered navigation **1–7** (not 21–27). The wordmark reads **"Marianne Napaño"** with a border dot. Dark mode is unified, not two-toned.

## Changes made this session (vs. the uploaded zip)

1. `src/components/layout/Sidebar.tsx` — REWRITTEN. Fixed left rail (lg+) with **Marianne Napaño** wordmark and solid-border dot, numbered nav **1–7** (was 21–27), IntersectionObserver scroll-spy, socials, resume pill (hidden when empty), `ThemeToggle`, **Ctrl K hint removed** (old feature). Below lg a fixed top bar with compact toggle + menu. Decision: keep the numbered nav; `file-tree.tsx` is NOT wired for the sidebar (it is an accordion for hierarchical content; this nav is flat).

2. `src/components/layout/MainLayout.tsx` — Removed CommandPalette (Ctrl+K palette). Simplified layout: `<Sidebar />` + `<main>` + `<ScrollTopButton />`. No palette state, no `jumpTo` callback. Removed `paletteItems`, `useState(paletteOpen)`, `useEffect` palette handlers.

3. `src/styles/red-black.css` — accent was `#000` in dark mode on a `#09090a` page, so primary buttons, outgoing bubbles, dots, focus rings and the scroll bar were invisible. Now light `#0a0a0a`/white text, dark `#f4f4f5`/black text. Header comment updated.

4. `src/dos/dos.css` — focus-ring fallback `#b3202a` → `currentColor`.

5. `src/styles/theme.css` — removed `@custom-variant` and `@theme inline` (unprocessed, caused build warnings, and meant `animate-blink-cursor` never worked). Replaced with plain `@keyframes blink-cursor` + `.animate-blink-cursor` (reduced-motion safe).

6. `src/lib/utils.ts` — `cn()` supports both `cn("a","b")` and `cn({a:true})`, and lets a caller's className override defaults.

7. `src/components/ui/dot-pattern.tsx` — static mode now uses one SVG `<pattern>` (was ~7,000 `motion.circle` components). `glow` mode unchanged.

8. `src/App.tsx` — DotPattern moved to the top of the router and made `fixed inset-0 -z-10 opacity-30` with a radial mask (was `absolute z-0` after the routes, painting over content).

9. `src/dos/dos.js` — tour bug: `scrollIntoView()` was smooth, so Dos was positioned from stale rects. Now instant scroll + new `moveGuideTo(el)` (centre of the visible part of the section); duplicate positioning code in `showTourBubble` removed. "by dos" on every stop and in `TOUR_OUTRO` kept. Escape / wheel / touchmove / popstate / hashchange / grab-to-cancel / route-change handlers were reviewed and are intact.

10. `HANDOFF.md` — updated to reflect all changes, numbering fix (1–7), name fix (Marianne Napaño), dark mode unification.

## Component status (ALL WIRED)

- `dot-pattern` -> App.tsx background.
- `animated-theme-toggler` -> wrapped by `layout/ThemeToggle.tsx` (controlled: drives `data-theme`, stores localStorage, sets `window.__themeTransitioning` for Dos). theme.css already had the `::view-transition-*{animation:none}` rule the toggler needs.
- `typing-animation` -> hero/HeroIntro.tsx role line (as="p", keeps `.hero-role` styling).
- `terminal` (+ AnimatedSpan/TypingAnimation) -> end of `sections/GithubActivity.tsx` (no invented numbers).
- `file-tree` -> `sections/Projects.tsx`, a `~/projects` tree built from `content/projects.ts`. Not used for the sidebar (flat nav).

## Not done / ideas

- Visual QA at 360/390/768/1024/1440 px (AUDIT.md says fixed corner elements overlap: chat pill, Dos at bottom-left, ScrollTopButton).
- `PROFILE.links.resume` is empty, so the "view resume" pill is hidden by design.
- Bundle is 572 kB (>500 kB warning); lazy-load GSAP/Supabase if it matters.
- Dos tour on short viewports: the guide is clamped inside the viewport, check it does not cover the bubble.

## Manual checklist

- [ ] Dark + light: buttons, chat send, scroll-progress bar, focus ring (Tab) visible
- [ ] Rail shows at ≥1024px, scroll-spy highlights while scrolling, theme toggle works
- [ ] <1024px: top bar + menu opens/closes, anchors land below the bar
- [ ] Take the tour: Dos sits mid-section at each stop, "by dos" shows; Esc/wheel/grab stops it
- [ ] Dots sit behind content, not over text