# Phase 3: Theme System: Testing Report

Scope: theme system only (no layout, content or backend changes).

## Framework inspection
Vite 8 + React 19 + TypeScript SPA (react-router). **Not Next.js, so no migration.** Magic UI's `animated-theme-toggler` was already in the repo and works in Vite as-is, so it is used directly (controlled mode, exactly the documented `theme` / `onThemeChange` pattern). No theme library was added: `next-themes` is not installed; `src/lib/theme.tsx` provides the same `useTheme()` surface in ~100 lines.

## What changed
| Area | Change |
|---|---|
| Tokens | New `src/styles/tokens.css` is the only place colours are declared. Dark is the default (`:root`); `:root[data-theme="light"]` overrides. Semantic tokens added: `--surface`, `--surface-raised`, `--border`, `--border-strong`, `--text-muted`, `--text-subtle`, `--input-border`, `--overlay`, `--shadow-toast`, `--focus-ring`. Duplicate palettes (theme.css dark block, `prefers-color-scheme` copies, red-black.css overrides) removed. |
| State | `ThemeProvider` / `useTheme` (`theme`, `resolvedTheme`, `setTheme`); supports `dark`, `light`, `system`; default `dark`. |
| Persistence | `localStorage["theme"]`; guarded for blocked storage; synced across tabs. |
| No flash | Inline script in `index.html` applies the stored theme (default dark) before first paint, plus an inline `html` background and a `theme-color` meta that match the tokens. |
| Animation | Magic UI circular reveal. Added the missing `::view-transition-group` duration CSS (the reveal was being cut short). Reduced-motion users get an instant swap; browsers without View Transitions get a 350 ms crossfade. |
| Transitions | Removed the permanent global `*` transition and the body transition; smoothing is now applied only during a switch. |
| Components | Dialog scrim, chat toast shadow, input and chat-field borders, Tailwind colour map (`bg-card`, `border-input` ...), `dot-pattern`, `file-tree` hover now use tokens. Sidebar toggle uses semantic tokens. |
| Bug fixes | Desktop rail rendered **two** theme toggles; toggler blindly flipped a `dark` class (could desync); `.theme-fading` / `.theme-transitioning` were referenced but never applied; old `status-error` token was unused/low-contrast. |

## Tests run (Playwright + Chromium, 43 checks, 0 failures)
- Default with empty storage: dark before React mounts; `<html class="dark">`, `color-scheme: dark`, theme-color `#09090a`.
- Stored light: applied before React mounts (no dark-to-light flash); theme-color `#ffffff`.
- Click toggle: circular view-transition reveal runs (2 active animations, 0.5 s group duration), ends on light, flags cleaned up, persisted, survives reload, toggles back.
- Reduced motion: instant swap, no reveal. No View-Transitions API: crossfade class applied then removed.
- `system` follows the OS and reacts to OS changes; cross-tab storage event syncs; corrupt stored value falls back to dark.
- Dialog scrim uses the correct token in both themes. No runtime/console errors.
- Screenshots reviewed: dark, light, mid-reveal, dialog (light/dark), mobile light.

## Contrast (WCAG 2.x)
All 32 token pairs and 14 live-element checks pass in both themes: body text 18.1:1 (dark) / 19.8:1 (light); muted text 7.7:1 / 7.7:1; captions 4.8:1 minimum on raised surfaces; primary button 18.0:1 / 19.8:1; status colours 5.4:1 minimum; text-field borders 3.1:1 minimum (WCAG 1.4.11). Light status colours (`--status-active` #3f7d3f to #2f6f2f) and dark-field borders were adjusted to pass.

## Limitations (please read)
- The sandbox had **no npm access**, so `npm install`, `npm run typecheck` and `npm run build` were **not run** on the full project. The theme files were compiled with esbuild and exercised in a real browser through a harness that loads the project's actual CSS and theme code. The full pages (hero, projects, inbox, real chat panel) were not rendered. Run `npm install && npm run typecheck && npm run build` locally.
- Tailwind still comes from the Play CDN (unchanged, out of scope); the harness cannot load it, so the toggle button looked unstyled in screenshots. I added `darkMode: selector` to its config.
- Dos pet bubble stays white in both themes (documented design choice).
- Supabase/Gemini features were not exercised.
