# Design System & Style Guide

**Project:** `iandevs` — Marianne Napaño, portfolio + live chat + admin inbox
**Design language:** *bryl-minimal* (hand-ported from [bryllim/bryl-minimal-design](https://github.com/bryllim/bryl-minimal-design))
**Stack:** React 19 · TypeScript · Vite 8 · CSS Modules + one global stylesheet
**Version:** 1.0 — extracted from source at commit `1fac080b`

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Architecture & Token Pipeline](#2-architecture--token-pipeline) ⚠️ read first
3. [Color Palette](#3-color-palette)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Shadows, Borders & Radii](#6-shadows-borders--radii)
7. [Motion](#7-motion)
8. [Component Library](#8-component-library)
9. [Theming](#9-theming)
10. [Accessibility](#10-accessibility)
11. [Audit: Known Inconsistencies & Debt](#11-audit-known-inconsistencies--debt)

---

## 1. Design Principles

These are the rules the codebase actually follows. Most are enforced by convention and by unusually thorough inline commentary; a few are aspirational and are currently violated (see [§11](#11-audit-known-inconsistencies--debt)).

| # | Principle | How it manifests |
|---|---|---|
| 1 | **No accent colour, ever.** | Every colour resolves to a `--gray-*`, `--bg` or `--ink` token. The single sanctioned exception is the four-state chat-status vocabulary. |
| 2 | **Emphasis is inversion, not colour.** | "Active" = `--ink` fill + `--bg` text. Used for the selected palette row, the pressed segmented item, admin chat bubbles, chosen reactions, the unread badge, `ScrollTopButton`, the chat send button. |
| 3 | **Typography-first hierarchy.** | Four font roles, not weight/size alone, separate registers. Register changes carry meaning. |
| 4 | **The page is a terminal.** | Every bounded surface is a "window" with a title bar, a hairline, a trio of chrome dots and a scanline texture. Shared vocabulary across hero, sections, panels, cards. |
| 5 | **Monochrome is a hard constraint, not a phase.** | Glows, rings and scanlines are all built from `--ink` at low alpha via `color-mix()`, so they retint themselves per theme instead of being fixed `rgba(0,0,0,.3)` smudges. |
| 6 | **11px is the legibility floor** for uppercase mono chrome. | Raised from 9px. `.micro-label` documents it; several call sites use 10px anyway. |
| 7 | **A status is never the only carrier of meaning.** | Status pills always spell the state in text (or a `.visually-hidden` label), so the inbox is readable in monochrome and by a colour-blind reader. |
| 8 | **Non-interactive things don't fake interactivity.** | Static cards get a border + glow on hover, never a fill or a pointer cursor. A lift implies a click. |
| 9 | **State lives in the accessibility tree.** | Selection is `aria-current`, pressed is `aria-pressed`, selected is `aria-selected`. Styling is written against those attributes so the two cannot disagree. |
| 10 | **Reduced motion is honoured at the source.** | `prefers-reduced-motion: reduce` blocks exist for every transform and looping animation, and are scoped so a texture still renders while its drift stops. |

---

## 2. Architecture & Token Pipeline

### 2.1 Where the design system lives

| File | Role |
|---|---|
| `src/styles/theme.css` | **The design system.** 2,327 lines. All colour tokens, both themes, all global component classes, reset, keyframes, reduced-motion guards. Imported once from `src/main.tsx`. |
| `index.html` | Google Fonts link, **Tailwind Play CDN `<script>`**, no-flash theme bootstrap. |
| `components/ui/*.css` | 3 scoped files: `DepthCarousel.css`, `Stack.module.css`, `PixelTransition.module.css`. No tokens of their own. |
| `components/**`, `pages/**` | Tailwind utilities for **layout**; tokens and global classes for **colour and typography**. |

> `index.html:17-19` states the division of labour explicitly: *"Tailwind CSS (utility classes for layout only -- colors and typography come from the bryl-minimal tokens in `src/styles/theme.css`)"*.

### 2.2 ⚠️ Critical: Tailwind is not actually compiled

`package.json` declares `tailwindcss@^4.3.3` and `@tailwindcss/vite@^4.3.3`, and `vite.config.ts:152` registers the plugin:

```ts
plugins: [react(), tailwindcss(), localChatApiPlugin(chatApiPort)],
```

**But the plugin is inert.** `theme.css` contains no `@import "tailwindcss"` and no `@theme` block, and there is no `tailwind.config.*` or `postcss.config.*` file. Verified against the production bundle:

```
dist/assets/index-Bm2ODDT8.css   28,817 bytes
  --gray-50 present .............. yes
  .flex{display:flex ............ NO
  .text-sm present .............. NO
  --tw-* variables present ...... NO
  preflight box-sizing count .... 1   (the project's own reset)
```

Every Tailwind utility in the JSX is instead generated **at runtime** by the Play CDN (`index.html:20`):

```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Consequences you must know before editing this system:**

1. **`npm run build` cannot catch a broken utility class.** A typo in `className` compiles, bundles, and ships silently.
2. **Cascade precedence depends on injection order.** The Play CDN injects an unlayered `<style>` at runtime; `theme.css` is also unlayered. Neither wins on specificity alone — whichever the browser receives last wins. This is why `theme.css` repeatedly uses `html .sidebar-offset` and compound selectors like `.pill.project-tag` and `.section-shell-bar .section-eyebrow` purely to force specificity over CDN utilities.
3. **The production build has no preflight.** The reset in `theme.css:161-165` is the only reset.
4. **The Play CDN prints a console warning and is not intended for production.** It also blocks render on a cold cache.

**Recommended remediation (not applied — this document is descriptive):** add `@import "tailwindcss";` plus a `@theme` block to `theme.css`, delete the CDN `<script>`, and pin `@source` directives. That single change converts the entire utility layer from unverified to build-verified.

### 2.3 The shadcn layer is vestigial

`components/ui/button.tsx` and `components.json` are a shadcn scaffold that was never wired to this design system.

- `button.tsx` is **imported by nothing** (verified across `components/`, `pages/`, `src/`).
- It depends on ~14 tokens that **do not exist anywhere in the repo**: `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--destructive`, `--ring`, `--muted`, `--accent`, `--border`, `--input`, `--card`, `--popover`, `--radius-md`, and OKLCH foreground values. Every variant would render unstyled.
- `components.json:8` points Tailwind at `src/index.css`, which does not exist (the real file is `src/styles/theme.css`).
- `@base-ui/react`, `class-variance-authority`, `shadcn`, `tw-animate-css`, `@fontsource-variable/geist` are dependencies serving this dead layer or nothing.

**The real button vocabulary is the CSS-class system in `theme.css`** — see [§8](#8-component-library). Treat `button.tsx` as deletable.

---

## 3. Color Palette

### 3.1 Foundations

Two tokens define the page ground and the maximum-contrast ink. Every other colour is a grey between them.

| Token | Light HEX | Light RGB | Light HSL | Dark HEX | Dark RGB | Dark HSL | Usage |
|---|---|---|---|---|---|---|---|
| `--bg` | `#ffffff` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` | `#0c0c0f` | `rgb(12, 12, 15)` | `hsl(240, 11.1%, 5.3%)` | Page ground. `body` background, sidebar fill, dialog fill. |
| `--ink` | `#0a0a0a` | `rgb(10, 10, 10)` | `hsl(0, 0%, 3.9%)` | `#f4f4f5` | `rgb(244, 244, 245)` | `hsl(240, 4.8%, 95.9%)` | Maximum-contrast text **and** the emphasis fill. Never a decorative colour. |

> **Dark `--bg` is not pure black.** `#0c0c0f` is a near-black with a cool cast, chosen so the neutral ramp can carry the same faint blue tint. `--ink` in dark mode is `#f4f4f5`, not `#ffffff`, for the same reason.

### 3.2 Neutral ramp

Eleven steps. The naming is **Tailwind-shaped** (`gray-50` = lightest) but the ramp **inverts in dark mode** — `gray-50` becomes the *darkest* surface. This is the single most important thing to internalise.

| Token | Role | Light | Light RGB | Light HSL | Dark | Dark RGB | Dark HSL |
|---|---|---|---|---|---|---|---|
| `--gray-50` | **Surface** (cards, panels, windows) | `#fafafa` | `rgb(250,250,250)` | `hsl(0, 0%, 98%)` | `#18181b` | `rgb(24,24,27)` | `hsl(240, 5.9%, 10%)` |
| `--gray-100` | **Raised surface** (title bars, hover fills) | `#f5f5f5` | `rgb(245,245,245)` | `hsl(0, 0%, 96.1%)` | `#1e1e22` | `rgb(30,30,34)` | `hsl(240, 6.3%, 12.5%)` |
| `--gray-200` | **Hairline / divider** | `#e9e9e9` | `rgb(233,233,233)` | `hsl(0, 0%, 91.4%)` | `#2a2a30` | `rgb(42,42,48)` | `hsl(240, 6.7%, 17.6%)` |
| `--gray-300` | **Border** (inputs, chips, interactive) | `#d4d4d4` | `rgb(212,212,212)` | `hsl(0, 0%, 83.1%)` | `#3a3a42` | `rgb(58,58,66)` | `hsl(240, 6.5%, 24.3%)` |
| `--gray-400` | **Muted text / prose** | `#404040` | `rgb(64,64,64)` | `hsl(0, 0%, 25.1%)` | `#8a8a92` | `rgb(138,138,146)` | `hsl(240, 3.5%, 55.7%)` |
| `--gray-500` | **Secondary text / labels** | `#333333` | `rgb(51,51,51)` | `hsl(0, 0%, 20%)` | `#a0a0a8` | `rgb(160,160,168)` | `hsl(240, 4.4%, 64.3%)` |
| `--gray-600` | Reserved | `#525252` | `rgb(82,82,82)` | `hsl(0, 0%, 32.2%)` | `#b5b5bc` | `rgb(181,181,188)` | `hsl(240, 5%, 72.4%)` |
| `--gray-700` | Reserved | `#2b2b2b` | `rgb(43,43,43)` | `hsl(0, 0%, 16.9%)` | `#c8c8ce` | `rgb(200,200,206)` | `hsl(240, 5.8%, 79.6%)` |
| `--gray-800` | Reserved | `#262626` | `rgb(38,38,38)` | `hsl(0, 0%, 14.9%)` | `#dcdce0` | `rgb(220,220,224)` | `hsl(240, 6.1%, 87.1%)` |
| `--gray-900` | Reserved | `#171717` | `rgb(23,23,23)` | `hsl(0, 0%, 9%)` | `#ececee` | `rgb(236,236,238)` | `hsl(240, 5.6%, 92.9%)` |
| `--gray-950` | Reserved (≈ `--ink`) | `#0f0f0f` | `rgb(15,15,15)` | `hsl(0, 0%, 5.9%)` | `#f4f4f5` | `rgb(244,244,245)` | `hsl(240, 4.8%, 95.9%)` |

**Notes**

- **The light ramp is not monotonic.** `--gray-400` (`#404040`, L≈25%) is *lighter* than `--gray-500` (`#333333`, L≈20%), which is lighter than `--gray-600` (`#525252`, L≈32%)… no: 400 → 500 → 600 goes 25% → 20% → 32%, a genuine inversion in the middle of the ramp. Steps 400 and 500 are therefore a **text pair used together**, not a sequence. 600–950 are unused by any call site today.
- **Light values are perfectly achromatic** (`S = 0%`). **Dark values carry a 3.5–6.7% saturation at hue 240°** — a deliberate cool cast. Do not "correct" dark greys to pure grey.
- Only 6 of 11 steps are in active use. `600`–`950` are dead weight inherited from the Tailwind-shaped naming.

### 3.3 Semantic / accent colours

The **only** non-monochrome tokens. Their stated purpose (`theme.css:53-67`) is to separate four triage states down a 50-row admin list, where inversion alone cannot distinguish `active` from `assigned` at pill size.

| Token | Meaning | Light | Light RGB | Light HSL | Dark | Dark RGB | Dark HSL |
|---|---|---|---|---|---|---|---|
| `--status-active` | Conversation live / certified | `#3f7d3f` | `rgb(63,125,63)` | `hsl(120, 33%, 36.9%)` | `#6ee06e` | `rgb(110,224,110)` | `hsl(120, 64.8%, 65.5%)` |
| `--status-waiting` | Awaiting reply | `#8a6412` | `rgb(138,100,18)` | `hsl(41, 76.9%, 30.6%)` | `#e0b252` | `rgb(224,178,82)` | `hsl(41, 69.6%, 60%)` |
| `--status-assigned` | Taken by a human | `#3f5aa6` | `rgb(63,90,166)` | `hsl(224, 45%, 44.9%)` | `#8ea8f0` | `rgb(142,168,240)` | `hsl(224, 76.6%, 74.9%)` |
| `--status-resolved` | Closed | `→ --gray-400` | `#404040` | `hsl(0,0%,25.1%)` | `→ --gray-400` | `#8a8a92` | `hsl(240,3.5%,55.7%)` |
| `--accent-positive` | Confirmed / earned | `→ --status-active` | `#3f7d3f` | — | `→ --status-active` | `#6ee06e` | — |

**Hue is held constant across themes; only lightness and saturation lift.** The dark values are the same three hues at ~+25–30 points of lightness, because the light-mode values are too dark to read on a near-black ground.

`--accent-positive` is an **alias, not a value**, so the muted green is defined in exactly one place and the two cannot drift. If a green accent is ever wanted, this is the correct pattern (`theme.css:842-846`).

### 3.4 Derived / alpha colours

There are no alpha tokens. Derivation is done inline with `color-mix()`, which is what makes every glow retint per theme.

| Expression | Effect | Where |
|---|---|---|
| `color-mix(in srgb, var(--ink) 3%, transparent)` | Scanline | `.scanlines` |
| `… var(--ink) 5%` | Hero outer ring | `.hero-frame` |
| `… var(--ink) 6%` | Card hover ring; widget hover ring; selected row fill | `.card:hover`, `.about-widget:hover`, `.inbox-row[aria-current]` |
| `… var(--ink) 7%` | Shell hover ring; `live` project tag fill | `.section-shell:hover`, `.pill.project-tag[data-tone="live"]` |
| `… var(--ink) 8%` | Widget hover ring | `.about-widget:hover` |
| `… var(--ink) 11%` | Portrait hover outer ring | `.hero-portrait:hover` |
| `… var(--ink) 30%` | Prose underline | `.about-em` |
| `… var(--ink) 25%` | Link underline | `.text-link` |
| `… var(--ink) 32%` | Portrait hover glow | `.hero-portrait:hover` |
| `… var(--ink) 34% / 16%` | Title halo (tight + falloff) | `.title-row:hover` |
| `… var(--ink) 40% / 45%` | Shell / widget falloff shadow | hover states |
| `… var(--gray-50) 74%` | Frosted widget fill | `.about-widget` |
| `… var(--gray-100) 62%` | Frosted input / bubble / composer | `.inbox-field`, `.inbox-bubble--visitor`, `.inbox-composer` |
| `… var(--bg) 55%` | Portrait inner ring | `.hero-portrait` |
| `… var(--bg) 72%` | Command-palette backdrop | `CommandPalette.tsx` |
| `… var(--bg) 90%` | Mobile top-bar glass | `Sidebar.tsx` |

### 3.5 Contrast verification

Measured WCAG 2.1 ratios. Text pairs all pass; hairlines intentionally do not (they are not text).

**Light**

| Pair | Ratio | Grade |
|---|---|---|
| `--ink` on `--bg` | **19.80** | AAA |
| `--gray-500` on `--bg` | **12.63** | AAA |
| `--gray-400` on `--bg` | **10.37** | AAA |
| `--gray-400` on `--gray-50` | **9.93** | AAA |
| `--gray-500` on `--gray-50` | **12.10** | AAA |
| `--bg` on `--ink` (inverted) | **19.80** | AAA |
| `--status-assigned` on `--bg` | **6.51** | AA |
| `--status-waiting` on `--bg` | **5.37** | AA |
| `--status-active` on `--bg` | **4.98** | AA |
| `--gray-300` on `--gray-50` (hairline) | 1.42 | — intentional |
| `--gray-200` on `--gray-50` (hairline) | 1.16 | — intentional |

**Dark**

| Pair | Ratio | Grade |
|---|---|---|
| `--ink` on `--bg` | **17.77** | AAA |
| `--gray-500` on `--bg` | **7.52** | AAA |
| `--gray-400` on `--bg` | **5.70** | AA |
| `--gray-500` on `--gray-50` | **6.82** | AA |
| `--gray-400` on `--gray-50` | **5.17** | AA |
| `--status-active` on `--bg` | **11.67** | AAA |
| `--status-waiting` on `--bg` | **9.91** | AAA |
| `--status-assigned` on `--bg` | **8.38** | AAA |
| `--gray-300` on `--gray-50` (hairline) | 1.57 | — intentional |
| `--gray-200` on `--gray-50` (hairline) | 1.24 | — intentional |

> **Note on the light `--status-active` value.** 4.98 is AA for normal text but **fails AA for any use below 18.66px bold / 24px regular**. The status colours are used at 10–11px. They currently sit on `--bg` or `--gray-50` and rely on the accompanying text label for the actual meaning (principle 7), so the colour is redundant rather than load-bearing — but it is not a WCAG-passing text colour at that size. Consider a darker light-mode green if status text ever ships unaccompanied by a label.

> **Note on hairlines.** `--gray-200` at 1.16:1 against `--gray-50` is below the 3:1 that WCAG 1.4.11 requires for *meaningful* non-text boundaries. These borders are decorative surface edges, not the sole indicator of any control boundary — inputs use `--gray-300` for that. Acceptable as-is; flag if a hairline ever becomes the only thing distinguishing two states.

### 3.6 Rules

```css
/* ✅ Correct — retints per theme */
color: var(--gray-400);
border-color: var(--ink);
box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 6%, transparent);

/* ✅ Correct — a token aliased to a status */
<Check className="text-[var(--accent-positive)]" />

/* ❌ Wrong — fixed hex renders identically on white and near-black */
color: #22c55e;                    /* ❌ exists in ChatWithIan.tsx:101 */
color: rgb(0,0,0,.3);              /* ❌ reads as a grey smudge in light mode */
```

Every colour in a component must resolve to a token. `Hero.tsx:349-354` and `ChatInboxPage.tsx:53-59` both contain comments explaining that a previously-hardcoded green was replaced for exactly this reason.

---

## 4. Typography

### 4.1 Font families

Four tokens, **three** distinct faces, all loaded from Google Fonts in one request (`index.html:33-36`).

| Token | Family | Weights | Roles | Applied to |
|---|---|---|---|---|
| `--font-display` | **Kode Mono** | `400–700` (variable) | Display | All `<h1>`–`<h6>` (blanket rule), `.hero-name`, `.section-title`, `.project-card-title`, `.about-widget-value`, `.btn-primary`, `.link-arrow` |
| `--font-mono` | **Kode Mono** | `400–700` (variable) | Chrome | `.micro-label`, `.section-eyebrow`, `.pill`, `.terminal-pill`, all nav, all title bars, all inputs, all buttons, all timestamps |
| `--font-serif` | **Source Serif 4** | `300–700`, `opsz 8–60`, ital | Prose | `.about-prose`, `.project-card-summary`, every section description |
| `--font-body` | **Geist** | `300–700` (variable) | Document | `body` base, `.inbox-bubble`, `.inbox-composer textarea` |

```css
:root {
  --font-body: "Geist", system-ui, sans-serif;
  --font-mono: "Kode Mono", ui-monospace, monospace;
  --font-display: "Kode Mono", ui-monospace, monospace;   /* same face, different meaning */
  --font-serif: "Source Serif 4", Georgia, serif;
}
```

> **`--font-display` and `--font-mono` are intentionally the same family.** `theme.css:6-11` explains the reasoning: they are kept as separate tokens because they *mean* different things (a 32px heading vs. an 11px badge), and collapsing them into one name would make the markup lie about intent. Every call site therefore renders Kode Mono regardless of which role it reaches for. **Swapping a badge to `--font-display` can never change its face** — that is the guarantee the split buys.

> **Fallback chain note.** Every mono/display stack ends in `ui-monospace, monospace`. This matters: the design repeatedly avoids glyphs that may be absent from a given mono face (see the block cursor rationale in §4.4). Do not introduce `_`, `✓` or `▍` as literal characters.

> **Unused font loading.** `index.html` also requests **Geist Mono**, which no token references. `@fontsource-variable/geist` is a declared dependency but unused (the CDN is used instead). `public/fonts/KodeMono-*.ttf` ships a self-hostable copy that is currently unused; `public/fonts/README.txt` documents it as the fallback if the CDN is dropped.

### 4.2 Document base

```css
body {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
}
```

A **15px** base, not 16px. This is deliberate: the site is chrome-dense and every surface is small. The inbox route then re-scales itself (§5.6).

### 4.3 Heading scale

There is **no `h4`–`h6` scale.** The only blanket rule is the family assignment; every other heading size is opt-in via a class.

| Level | Class | Size | Line-height | Weight | Tracking | Margin-bottom |
|---|---|---|---|---|---|---|
| `<h1>` | `.hero-name` | `2rem` (32px) → `2.5rem` (40px) at `sm` | `1.1` | `600` | `-0.03em` | — |
| `<h1>` | `.section-title` (on `/projects`) | `1.25rem` → `1.5rem` | `1.25` | `600` | `-0.025em` | `0.5rem` |
| `<h2>` | `.section-title` | `1.25rem` (20px) → `1.5rem` (24px) at `sm` | `1.25` | `600` | `-0.025em` | `0.5rem` |
| `<h3>` | `.project-card-title` | `15px` | `1.3` | `600` | `-0.02em` | — |
| `<h3>` | inline (blog) | `text-sm` (14px) → `sm:text-base` (16px) | `leading-snug` | `700` | `tracking-tight` | — |
| `<h4>`–`<h6>` | — | **undefined** | — | — | — | — |

```css
/* theme.css:370-384 */
.section-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: -0.025em;   /* the display face's metrics need tightening */
  color: var(--ink);
  margin-bottom: 0.5rem;
}
@media (min-width: 640px) { .section-title { font-size: 1.5rem; } }
```

> **`.section-title` is a type scale, not a heading-level rule.** `/projects` applies it to an `<h1>`; home-page sections apply it to `<h2>`; a project card title uses a separate 15px class. The class encodes *size and rhythm*, and heading level is a separate semantic decision. Seven sections once drifted across four different heading shapes; the class exists specifically to stop that recurring.
>
> **The hero's `<h1>` deliberately does not use `.section-title`** — it is the page's one large title, not a section heading.

### 4.4 Body & supporting text

| Class / context | Size | Line-height | Family | Weight | Tracking | Transform | Colour |
|---|---|---|---|---|---|---|---|
| `body` | `15px` | `1.6` | body | 400 | — | — | `--ink` |
| `.about-prose` | `15px` → `17px` at `sm` | `1.75` → `1.8` | serif | 400 | — | — | `--gray-400` |
| `.project-card-summary` | `14px` | `1.7` | serif | 400 | — | — | `--gray-400` |
| Section descriptions | `15px` | `1.7`–`1.75` | serif | 400 | — | — | `--gray-400` / `--gray-500` |
| `.about-widget-value` | `14px` | `1.45` | display | `500` | `-0.01em` | — | `--ink` |
| `.inbox-bubble` | `15px` | `1.6` | **body** | 400 | — | — | `--ink` / `--bg` |
| `.section-eyebrow` | `14px` | `1.3` | mono | `400` | `1px` | uppercase | `--gray-500` |
| `.micro-label` | `11px` | — | mono | 400 | `0.5px` | uppercase | `--gray-500` |
| `.hero-subtitle` | `11px` → `12px` | `1.5` | mono | 400 | `0.14em` | uppercase | `--gray-500` |
| `.terminal-pill` | `11px` | *inherits 1.6* | mono | 400 | `0.04em` | **none** | `--gray-500` |
| `.pill` | `11px` | — | mono | 400 | `0.5px` | uppercase | `--gray-500` |
| `.hero-titlebar` | `11px` | — | mono | 400 | `0.5px` | — | `--gray-500` |
| `.build-panel-bar` | `10px` | `1.4` | mono | 400 | `0.18em` | uppercase | `--gray-500` |
| `.about-specs` | `11px` | `1.5` | mono | 400 | `0.08em` | uppercase (key) | `--gray-500` / `--ink` |
| `.inbox-seg-item` | `10px` | `1.2` | mono | 400 | `0.1em` | uppercase | `--gray-500` |
| `.inbox-row-preview` / `.inbox-row-time` | `11px` / `10px` | `1.4` | — / mono | 400 | `0.04em` | — | `--gray-500` / `--gray-400` |
| `.chat-meta` | `11px` | `1.4` | mono | 400 | `0.5px` | uppercase | `--gray-400` |
| Sidebar nav | `13px` | `normal` | mono | 400 | `0.2px` | — | `--gray-500` / `--ink` |
| `.btn-primary` / `.link-arrow` | `13px` | — | display | `500` | — | — | `--ink` / `--bg` |

### 4.5 Size steps actually in use

`10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 24 · 32 · 40 px`

- **11px is the documented floor** for badge/label text. It was raised from 9px because uppercase mono with wide tracking stops being legible below it, especially on dark where thin strokes disappear (`theme.css:306-309`).
- 10px appears in five places *below* that floor — see [§11.5](#115-text-smaller-than-the-stated-11px-floor).
- The scale is dense between 10 and 15 (1px steps) and coarse above 18. That is a direct consequence of a 15px base on a chrome-dense page.

### 4.6 Typographic rules

**Register is semantic.** Switching family changes meaning, not decoration:

| Register | Means |
|---|---|
| Display (Kode Mono) | A named thing you are meant to read |
| Mono chrome (Kode Mono) | Interface, metadata, a label about the UI |
| Serif | Someone's prose, written in sentences |
| Body (Geist) | A visitor's own words, or document base copy |

The most explicit instance is `.inbox-bubble` (`theme.css:1945-1951`): the whole inbox shell is mono because every label in it is chrome, but a visitor's message is **not** chrome — it is a sentence they typed, often in Tagalog, and Kode Mono at message length sets a fixed letter width per character that makes a 60-character message measurably harder to scan. So the bubble opts back to `--font-body` while the timestamp above it stays mono. *"The register change is exactly: this is their voice, the timestamp is ours."*

**Two tracking conventions:**

```css
/* Display face — negative, because Kode Mono's metrics are wide and
   would otherwise open gaps inside a word. */
letter-spacing: -0.025em;   /* .section-title */
letter-spacing: -0.03em;    /* .hero-name   */
letter-spacing: -0.02em;    /* .project-card-title */
letter-spacing: -0.01em;    /* .about-widget-value */

/* Chrome — positive, for uppercase at 10-11px */
letter-spacing: 0.04em;     /* .terminal-pill, .inbox-field, .inbox-row-time */
letter-spacing: 0.06em;     /* .about-widget-label-tight, .inbox-btn, .project-card-role */
letter-spacing: 0.08em;     /* .project-card-bar, .about-specs-key, .inbox-hint */
letter-spacing: 0.1em;      /* .about-widget-label, .inbox-seg-item */
letter-spacing: 0.14em;     /* .hero-subtitle, .about-specs-bar, .inbox-panel-title */
letter-spacing: 0.18em;     /* .build-panel-bar */
letter-spacing: 0.5px;      /* .micro-label, .pill, .chat-meta, .hero-titlebar */
letter-spacing: 1px;        /* .section-eyebrow */
```

Tracking rises as size falls — the standard optical correction, applied consistently.

**Never hardcode a glyph that may be missing from the loaded mono faces.** The design uses drawn elements instead:

- **Block cursor** instead of `_` — `theme.css:876-886`. Sized in `em` off the heading so one rule serves the 20px `<h2>` and the 40px `<h1>`; `steps(1, end)` for a hard on/off blink, which is what a terminal cursor is. Always `aria-hidden`.

```css
.title-cursor {
  display: inline-block;
  flex: none;
  width: 0.5em;
  height: 1.02em;
  background-color: var(--ink);
  animation: title-cursor-blink 1.15s steps(1, end) infinite;
}
```

- **Inline SVG check** instead of `✓` — `Education.tsx:125-128`. *"The check glyph is not in every mono face the project loads, and a missing glyph would render as a tofu box."*

**Tabular numerals anywhere a value changes or ticks.** `font-variant-numeric: tabular-nums` is applied to the live clock (`LiveStatus.tsx:108` — *"without it the digits change width every second and the badge visibly jitters"*), `.about-widget-value`, `.build-pill-index` and `.project-card-index`. The last two also get `min-width: 2.4ch` so `[01]` and `[10]` cannot shift their labels.

**Never let a Tailwind `text-*` utility override a tracking/transform rule from `theme.css`.** `theme.css:320-336` records a real incident: four section call sites added `tracking-wider`, which is `0.05em` — about 0.7px at 14px, so it was quietly *reducing* the `1px` defined in `.section-eyebrow`. Because the Play CDN utilities and `theme.css` are both unlayered, which rule won depended on injection order. Spacing and tracking for these classes now live only in `theme.css`.

---

## 5. Spacing & Layout

### 5.1 There is no spacing scale token

**Spacing is not tokenised.** It is expressed as raw Tailwind utilities in JSX and raw `rem` literals in `theme.css`. The only layout token in the entire system is `--sidebar-w`.

What follows is the **de facto** scale, derived from actual usage.

### 5.2 De facto spacing scale

Two coexisting granularities:

**(a) Tailwind's 4px base** (`0.25rem` unit) — used in all JSX:

| Step | Value | Representative use |
|---|---|---|
| `0.5` | `0.125rem` / 2px | `.pill` padding |
| `1` | `0.25rem` / 4px | chip gaps, `min-width: 0.75rem` leaders |
| `1.5` | `0.375rem` / 6px | icon-to-label gaps |
| `2` | `0.5rem` / 8px | standard grid gap, `.card` offsets |
| `2.5` | `0.625rem` / 10px | hero/portrait gap |
| `3` | `0.75rem` / 12px | `.section-eyebrow` margin, panel gaps |
| `4` | `1rem` / 16px | `.hero-eyebrow-row`, `.about-prose p+p` |
| `5` | `1.25rem` / 20px | **section gutter** `px-5` |
| `6` | `1.5rem` / 24px | `.section-shell-body` top, inter-card gap |
| `7` | `1.75rem` / 28px | `.section-shell-body` bottom at `sm` |
| `8` | `2rem` / 32px | `.section-shell-body` bottom at `sm` |
| `9` | `2.25rem` / 36px | *(retired — was over-padding)* |
| `10` | `2.5rem` / 40px | message-seam spacing |
| `12` | `3rem` / 48px | block separation |
| `16` | `4rem` / 64px | **section vertical padding** `py-16` |

**(b) Sub-grid `rem` literals in `theme.css`** — for the fine optical work that a 4px grid cannot express:

| Value | Where | Why not on the 4px grid |
|---|---|---|
| `0.18rem` | `.about-specs-rows` padding | Optical, not structural |
| `0.2rem` | `.project-card-title` margin | Optical |
| `0.25rem` | `.section-shell-action` gap | Sub-chip |
| `0.3rem` | `.project-card-role` margin, `.chat-meta` margin | Optical |
| `0.35rem` | `.inbox-transcript` seam, sidebar nav `gap` | Optical seam |
| `0.4rem` | `.build-panel-bar` padding, `.inbox-composer-bar` | Optical |
| `0.45rem` | `.inbox-field` padding, `.inbox-row-line` gap | Optical |
| `0.5rem` | `.section-title` margin, `.pill` gap | — |
| `0.6rem` | `.hero-titlebar` gap, `.about-specs-row` | Optical |
| `0.65rem` | `.hero-subtitle` margin, `.inbox-row` padding | Optical |
| `0.7rem` | `.about-widget` gap, `.inbox-bubble` padding | Optical |
| `0.75rem` | `.section-eyebrow` margin, `.pill` gap | — |
| `0.85rem` | `.about-widget` padding, `.inbox-panel-head` | Optical |
| `0.9rem` | `.about-widget` / `.inbox-bubble` x-padding | Optical |
| `0.95rem` | `.about-widget` bottom padding | Optical |
| `1.1rem` | `.section-shell` bar + body x-padding | Aligns to the bar |
| `1.15rem` | `.inbox-transcript` x-padding, `.project-card-body` | — |
| `1.25rem` | `.hero-titlebar` x-padding (base) | Aligns to hero body |
| `1.35rem` | `.project-card-body` at `sm` | — |
| `1.5rem` | `.section-shell-body` y, `.hero-subtitle` | — |
| `1.75rem` | `.section-shell-body` y at `sm` | — |
| `2rem` | `.hero-titlebar` x at `lg`; `.section-shell-body` y at `sm` | — |

**The rule this reveals:** horizontal and vertical padding are *not* independent. `.hero-titlebar` and the hero body both step `1.25rem → 1.5rem → 2rem` at base / `sm` / `lg`, so the window's title path and the name beneath it share one left edge at every width. `Hero.tsx:186-192` records the bug this fixed: a fixed `1.25rem` bar drifted by 8px at `sm` and 16px at `lg` as the body grew to `p-7`/`p-9`.

### 5.3 Breakpoints

Standard Tailwind, referenced explicitly in `@media` queries.

| Token | Width | What changes |
|---|---|---|
| — | `< 640px` | Single column. Fixed 68px top bar. Section titles at their base size. |
| `sm` | `640px` | `.section-title` 1.25→1.5rem; `.hero-name` 2→2.5rem; `.about-prose` 15→17px; hero stat grid 2→4 columns. |
| `md` | `768px` | Hero portrait/text go side-by-side (`flex-row`); section grids go 2-up; `.build-panel-body` left-aligns. |
| `lg` | `1024px` | **Sidebar rail appears** (16rem), top bar hides; content gets `padding-left: var(--sidebar-w)`; section gutters 20→24px; About becomes 1.45fr/1fr. |
| `xl` | `1280px` | Inbox grid widens to `300px / 1fr / 344px`. |

### 5.4 Section framing

One class, not eight repeated declarations (`theme.css:204-209`):

```css
.section-frame {
  display: flex;
  flex-direction: column;
  justify-content: center;
  scroll-snap-align: start;
}
```

**Sections are their natural height.** They were once pinned to `100svh`, which made every section a viewport-sized panel with a short paragraph floating in the middle and dead space between sections. At natural height the page reads as one continuous column. `justify-content: center` is retained as a no-op so a `min-height` would still centre if reintroduced.

**Scroll snapping is scoped to the home page** via `:has()`:

```css
html:has(.snap-sections) { scroll-snap-type: y proximity; }
```

`proximity`, not `mandatory` — mandatory traps fast scrolling and feels hostile on a trackpad, while proximity still magnetises a section once you land near one. `/projects` and `/chat-inbox` manage their own scrolling and are untouched.

**Anchor offset for the fixed mobile top bar:**

```css
@media (max-width: 1023px) {
  section[id] { scroll-margin-top: 68px; }
}
```

68px = `py-4` (16×2) + the `h-9` (36px) toggle. At `lg`+ the top bar is hidden and the sidebar is a left rail, so no offset is needed.

### 5.5 Section rhythm

```html
<!-- 02–08, identical on all seven -->
<section id="about" class="section-frame px-5 py-16 lg:px-6">
  <div class="w-full max-w-4xl mx-auto">
    <div class="section-shell">
      <div class="section-shell-bar"><p class="section-eyebrow">02 — about</p></div>
      <div class="scanlines" aria-hidden="true"></div>
      <div class="section-shell-body">…</div>
    </div>
  </div>
</section>
```

| Value | Size | Notes |
|---|---|---|
| Section gutter | `px-5` (20px) → `lg:px-6` (24px) | Identical string on `/projects` so the routes cannot drift |
| Section vertical padding | `py-16` (64px) | |
| Hero padding | `px-5 pt-6 pb-16 lg:px-6 lg:pt-0` | Hero's `pb-16` is deliberately larger than its `pt` |
| Eyebrow → bar | `.hero-eyebrow-row` `1rem` | Hero's marker sits *outside* the frame; 02–08 sit inside their bar (margin zeroed) |
| Eyebrow → heading | `.section-title` `0.5rem` | |
| Shell body padding | `1.5rem 1.1rem 1.75rem` → `1.75rem 1.5rem 2rem` at `sm` | Top/bottom differ — bottom is always larger |

**Internal column gaps:** `gap-3` (widget grid, mobile) · `gap-4` → `sm:gap-5` (project grid) · `gap-6` → `md:gap-8` (Education) · `gap-7` → `lg:gap-8` (About, hero row) · `lg:gap-10 lg:gap-16` (Life).

### 5.6 Containers & max-widths

| Container | Max-width | Px | Where |
|---|---|---|---|
| **Page measure** | `max-w-4xl` | `56rem` / **896px** | `MainLayout.tsx:119` — the single measure for all public content |
| Inbox inner | `max-w-[1600px]` | 1600px | `ChatInboxPage.tsx` — full-bleed, see note |
| Inbox thread | `48rem` | **672px** | `.inbox-thread-inner` — centred column, composer inside it |
| Inbox bubble | `min(74%, 40rem)` | — | `.inbox-msg` — widest bubble ≈ 500px ≈ 65 chars at 15px |
| Prose | `62ch` | — | `.about-prose` |
| Hero quote | `48ch` | — | Hero intro |
| Hero text column | `max-w-md` | `28rem` / 448px | Hero, at `md`+ |
| Section description | `max-w-xl` | `36rem` / 576px | All seven sections |
| Command palette | `max-w-lg` | `32rem` / 512px | `CommandPalette.tsx` |
| Sidebar | `16rem` | **256px** | `--sidebar-w` |
| Carousel stage | `max-w-[380px]` | 380px | Life section |
| Admin card | `max-w-lg` | 512px | Inbox login / auth-restoring |

**The `48rem` thread measure is a deliberate readability cap**, not a leftover. A chat window across a 1600px column runs lines to ~1300px, which is as hard to track back from as a paragraph of unbroken text. This is the same move Discord and Telegram make: the conversation column has a maximum and the whitespace around it is the point.

> ⚠️ **Stale comment, verified behaviour.** `MainLayout.tsx:112-118` claims *"It is also what currently holds /chat-inbox at 4xl: that page asks for `max-w-[1600px]` and is clamped by this wrapper."* **This is false.** `App.tsx:89-91` routes `/chat-inbox` to `ChatInboxPage` **outside** `MainLayout`; that page has its own `max-w-[1600px]` and no `sidebar-offset`. The inbox genuinely renders full-bleed at 1600px. The comment will mislead the next person who tries to "clean up" the `max-w-4xl` cap.

### 5.7 The admin grid is CSS, not utilities

```css
.inbox-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);   /* one column below lg */
  grid-template-rows: minmax(0, 1fr);
  gap: 0.75rem;
}
@media (min-width: 1024px) {
  .inbox-shell                      { grid-template-columns: 280px minmax(0, 1fr); }
  .inbox-shell[data-info="open"]    { grid-template-columns: 280px minmax(0, 1fr) 330px; }
  .inbox-shell[data-info="closed"] .inbox-info { display: none; }
  .inbox-shell[data-info="open"]   .inbox-info { display: flex; }
}
@media (min-width: 1280px) {
  .inbox-shell[data-info="open"]    { grid-template-columns: 300px minmax(0, 1fr) 344px; }
}
```

**Why not `lg:grid-cols-[280px_1fr_330px]`:** the column count depends on a *runtime state*, not just a breakpoint. Closing the info drawer has to **remove** a column, and a class that is merely absent from the element cannot do that — a two-column utility always beats a three-column one by order, never by intent. `[data-info]` makes the state explicit and lets the two declarations be mutually exclusive by construction.

The descendant `display` rules score 0-3-0 against a utility's 0-1-0, so whichever way the two disagree, the grid definition wins. Below `lg` the panes take turns via a `hidden`/`flex` pair in the markup — standard messenger behaviour on a phone: list, then thread, then context, never all three.

### 5.8 The de-zoom lever

```css
.inbox-app { font-size: 14px; line-height: 1.5; }
```

**Every size in the inbox block is expressed in `rem`**, so this single declaration rescales all padding, radius and chrome together by ~12%. The page read as zoomed-in because those values were tuned against the 16px document root, which is right for the marketing sections and wrong for a tool you sit and read all day.

14px rather than smaller, because this shrinks the *chrome* without touching what an operator reads: `.inbox-bubble` declares `font-size: 15px` in **px**, so message text keeps its legibility while everything around it tightens. *"Message legibility is the one thing in this interface that should not be economised on."*

`line-height: 1.5` also comes off the body's 1.6 — mono needs less leading than a proportional face at the same size.

---

## 6. Shadows, Borders & Radii

### 6.1 Shadow tokens

Three elevation levels, redefined per theme.

| Token | Light | Dark |
|---|---|---|
| `--shadow-resting` | `0 8px 22px -14px rgba(0, 0, 0, 0.25)` | `0 8px 22px -14px rgba(0, 0, 0, 0.6)` |
| `--shadow-hover` | `0 18px 36px -20px rgba(0, 0, 0, 0.4)` | `0 18px 36px -20px rgba(0, 0, 0, 0.7)` |
| `--shadow-modal` | `0 40px 90px -20px rgba(0, 0, 0, 0.35)` | `0 40px 90px -20px rgba(0, 0, 0, 0.7)` |

```css
--shadow-color: 0, 0, 0;   /* light only; dark inlines its own rgb triple */
```

**Every shadow is heavily negative-spread** — the blur is large but the offset is cancelled, producing a tight, diffuse lift rather than a directional drop. That is what makes the monochrome palette read as paper rather than as glass.

Applied to: `.card` (resting + hover), `.section-shell` (resting), `.hero-frame` (a bespoke glow, see below).

**`--shadow-modal` is defined but never consumed.** The command palette and mobile drawer use Tailwind's `shadow-2xl` / `shadow-lg` instead, which are the **only** raw Tailwind shadows in the codebase and are not theme-aware.

### 6.2 The ink-ring-and-falloff vocabulary

The site's real "lift" gesture. Not a shadow — a **1px ink-alpha ring** plus a **wide falloff shadow**, so it reads as a lit edge rather than a drop shadow, and it retints per theme for free.

```css
/* resting → lit */
.card, .section-shell { border: 1px solid var(--gray-200); box-shadow: var(--shadow-resting); }
.card:hover          { border-color: var(--gray-300); transform: translateY(-2px);
                       box-shadow: var(--shadow-hover),
                                  0 0 0 1px color-mix(in srgb, var(--ink) 6%, transparent); }
.section-shell:hover { border-color: var(--gray-300);
                       box-shadow: var(--shadow-resting),
                                  0 0 0 1px color-mix(in srgb, var(--ink) 7%, transparent),
                                  0 18px 48px -28px color-mix(in srgb, var(--ink) 40%, transparent); }
.about-widget:hover  { border-color: var(--ink); transform: translateY(-2px);
                       box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 8%, transparent),
                                  0 16px 40px -24px color-mix(in srgb, var(--ink) 45%, transparent); }
```

One vocabulary for **every** bordered surface: `.card`, `.section-shell`, `.build-panel`, `.about-widget`, `.inbox-panel`, `.hero-frame`, `.inbox-icon-btn`.

**The hero is the one surface that also glows**, because it is the screen you are looking *at*; the sections are what it displays, and eight equally-glowing boxes would flatten the page:

```css
.hero-frame {
  border: 1px solid var(--gray-200);
  border-radius: 16px;
  background-color: var(--gray-50);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ink) 5%, transparent),
    0 20px 60px -30px color-mix(in srgb, var(--ink) 45%, transparent);
}
```

**The portrait uses a doubled ring via `box-shadow` spread, not a second border** — a real border would push the 5:6 frame out of proportion and shift the flex row beside it.

### 6.3 The scanline texture

```css
.scanlines {
  position: absolute; inset: 0; z-index: 0;
  border-radius: inherit;          /* follows its container: 16px hero, 14px shell */
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    color-mix(in srgb, var(--ink) 3%, transparent) 0 1px,
    transparent 1px 4px
  );
  animation: scan-drift 7s linear infinite;
}
```

Four decisions worth preserving:

1. **3% ink, not 7%.** At 7% the lines crossed the hero's 11px uppercase header and the quote's 4px periods, uncomfortably close to their x-height, so the smallest text on the page started to look striped rather than solid.
2. **`z-index: 0` + `pointer-events: none` are load-bearing, not decorative.** The content layers are `position: relative` with no z-index so they paint above; a texture that swallowed clicks would make every link and button inside a section unclickable over the lines.
3. **`border-radius: inherit`** is what lets `.section-shell` skip `overflow: hidden` and still have square-free corners. The shell has no clipping because the Life section's photo `Stack` rotates cards ~21° around a 90%/90% origin, throwing a corner ~70px outside its own 280px box; a clipping shell would slice them off.
4. **Reduced motion stops the drift, not the texture.** The static lines stay — they are a texture, not an animation.

### 6.4 Halftone motif

```css
.halftone {
  position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(var(--halftone-dot-color) 1px, transparent 1.6px);
  background-size: 9px 9px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
}
```

`--halftone-dot-color`: `rgba(10,10,10,.9)` light / `rgba(244,244,245,.42)` dark. Used as "seasoning, not wallpaper" — currently on project-card previews at `opacity: 0.45`.

### 6.5 Radii

No radius tokens — all literals. The ladder, with its rationale:

| Value | Tokens | Role |
|---|---|---|
| `2px` | inline | GitHub contribution cell |
| `1.5px` | inline | Hamburger bars |
| `3px` | `.inbox-bubble--visitor/--admin` | **Message tail** — the shape says "incoming" before the label is read |
| `6px` | `.inbox-avatar--sm` | Small monogram |
| `7px` | `.btn-primary`, `.inbox-btn`, `.inbox-field` | Compact rectangular controls |
| `8px` | `.inbox-avatar`, `.inbox-icon-btn`, `.inbox-row` | Controls, list rows, square monogram |
| `10px` | `.build-panel`, `.inbox-composer`, `.inbox-avatar--lg` | Nested panels — the hero's 16px scaled to 10px |
| `12px` | `.about-widget`, `.project-card`, `.inbox-panel`, `.inbox-bubble` | Cards and panels |
| `13px` | `.section-shell-bar` | The bar sits *inside* the shell's 1px border, so matching the outer 14px exactly leaves a hairline of background at each corner |
| `14px` | `.section-shell` | Section windows |
| `16px` | `.card`, `.hero-frame` | The primary surface radius |
| `1rem` (16px) | `Stack.module.css .card` | *Scoped duplicate of the same name* — see §11.6 |
| `999px` | `.terminal-pill`, `.pill`, `.chat-reaction-chip`, `.inbox-seg`, `.chat-unread-badge`, `.status-dot`, `.inbox-system`, indicator dots | Fully-rounded chips and dots |

**Rule: there is no true circle in the layout.** `.inbox-avatar` is deliberately *square* at 8px — *"a circle would be the only true curve in the layout."* Circles are reserved for dots, pills and icon-only buttons, which read as controls rather than containers.

### 6.6 Borders

| Width | Tokens | Role |
|---|---|---|
| `1px` | `var(--gray-200)` | Hairline / divider — all panel edges, title-bar bottoms, `.card`, `.section-shell`, `.build-panel`, `.project-card-preview`, `.project-card-foot` |
| `1px` | `var(--gray-300)` | **Interactive** border — inputs, chips, `.terminal-pill`, `.pill`, `.inbox-btn`, `.inbox-icon-btn`, `.inbox-row`, `.inbox-avatar`, `.inbox-composer` |
| `1px` | `var(--ink)` | Hover / active border — the warm-up gesture on every chip and control |
| `1px dotted` | `var(--gray-300)` | `.about-specs-leader` — the only place a dotted rule belongs, because a spec sheet is the only place that format fits |
| `2px` | `--bg` | Chat avatar presence dot, so it separates from the avatar's 1px edge |
| `1.5px` | `--ink` | Hamburger bars |

**The `--gray-200` / `--gray-300` split is the load-bearing one**: `--gray-200` means *this is a surface*, `--gray-300` means *you can interact with this*. Hover moves either to `--ink`.

---

## 7. Motion

### 7.1 Easing

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default for the whole system.** Steep-out, long settle. |
| inline | `cubic-bezier(0.4, 0, 0.2, 1)` | Colour-only fades on chips — deliberately the Tailwind `transition-colors` default, spelled out so the replacement is identical |
| inline | `ease` / `ease-in-out` | Opacity-only |

### 7.2 Duration scale

| Duration | Use |
|---|---|
| `0.15s` | `.terminal-pill` colour/border/background |
| `0.16s` | `.chat-reaction-bar` opacity, `.chat-reaction-chip` |
| `0.18s` | All inbox interactions — avatar, icon button, row, segmented item, `.inbox-btn`, `.inbox-field` |
| `0.2s` | `.pill`, `.btn-primary`, `.text-link`, `.section-shell-action`, `.link-arrow` |
| `0.3s` | Project card stack icons, path colour |
| `0.35s` | **All surface transitions** — `.card`, `.section-shell`, `.about-widget`, `.hero-portrait` (border + shadow + transform) |
| `0.42s` | `.card` transform lift |
| `0.5s` | `body` background/colour crossfade; blog image `scale-105` |
| `0.65s` | Theme-switch circle reveal |
| `0.7s` | `.enter` page-entrance stagger |
| `1.1s` | Chat typing dots |
| `1.15s` | Title cursor blink (`steps(1, end)`) |
| `1.8s` | `.status-dot` pulse |
| `7s` | Scanline drift |
| `0.3s` | `PixelTransition` step duration |

**The pattern: colour at ≤0.2s, surface and shadow at 0.35s, transform at 0.42s, ornament at ≥0.7s.** Nothing structural moves faster than 0.35s.

### 7.3 Animations

| Name | Duration | Easing | Reduced-motion behaviour |
|---|---|---|---|
| `scan-drift` | `7s` infinite | `linear` | `animation: none` — **texture stays** |
| `title-cursor-blink` | `1.15s` infinite | `steps(1, end)` | `animation: none`, held at full opacity — *"a heading with a gap where its last letter should be reads as broken"* |
| `chat-typing-fade` | `1.1s` infinite | `ease-in-out` | `animation: none; opacity: 0.7` |
| `status-pulse` | `1.8s` infinite | `ease-in-out` | Not guarded (only used in the sidebar via `animate-ping`) |
| `enter-up` | `0.7s` once | `var(--ease-out)` | `opacity: 1; transform: none; animation: none` |
| `theme-reveal` | `0.65s` once | `var(--ease-out)` | `animation: none` — falls back to the plain crossfade |

**The page-entrance stagger** (`.enter`) runs once on mount, ~70ms apart, with inline `animationDelay` per element — not a scroll-triggered reveal. The reference design treats this as "one orchestrated moment".

**The theme reveal** is a View Transitions API circle expanding from the toggle's coordinates:

```css
@keyframes theme-reveal {
  from { clip-path: circle(0px    at var(--theme-toggle-x, 50%) var(--theme-toggle-y, 50%)); }
  to   { clip-path: circle(150vmax at var(--theme-toggle-x, 50%) var(--theme-toggle-y, 50%)); }
}
```

Browsers without support — or with reduced motion — get a plain crossfade instead, and that fallback is scoped so the two never fight:

```css
@supports not (view-transition-name: none) {
  *, *::before, *::after {
    transition: background-color .4s, border-color .4s, color .4s, fill .4s, stroke .4s;
  }
}
```

An earlier version ran the circle reveal *and* a universal colour transition simultaneously, which read as stutter. The `@supports` guard means the crossfade only exists where the circle does not.

### 7.4 Reduced motion

`prefers-reduced-motion: reduce` blocks exist for **every** transform and looping animation, and they are scoped by judgement rather than blanket-applied:

- `html { scroll-behavior: auto }` — anchors still work, they just don't animate.
- `.card:hover`, `.about-widget:hover` — `transform: none`. The glow stays; the lift goes.
- `.scanlines` — drift stops, texture stays.
- `.title-cursor` — blink stops, cursor held solid.
- `.chat-typing-dot` — fade stops, held at 0.7 opacity.
- `.enter` — starts visible.
- `::view-transition-new(root)` — `animation: none`.

**No guard on `.terminal-pill` or `.pill` colour transitions** — deliberately: *"a colour fade is not vestibular motion, and the guards in this file are for transforms and looping animation."*

---

## 8. Component Library

The system is **CSS-class-first**. `theme.css` defines ~70 global classes; React components compose them with Tailwind layout utilities. There is no `cva`/variant-object layer in active use (the one `cva` in the repo belongs to dead shadcn code).

### 8.1 Surfaces — the "terminal window" family

All bounded surfaces share one vocabulary: hairline border, `--gray-50` ground, `--gray-100` title bar, trio of chrome dots, optional scanlines.

| Class | Radius | Title bar | Body padding | Notes |
|---|---|---|---|---|
| `.hero-frame` | `16px` | `.hero-titlebar` | `p-5 sm:p-6 lg:p-8` | Only surface that glows. The screen you look *at*. |
| `.section-shell` | `14px` | `.section-shell-bar` | `1.5rem 1.1rem 1.75rem` | **No `overflow: hidden`** — the rotating photo stack would be clipped. 7 uses. |
| `.build-panel` | `10px` | `.build-panel-bar` | `0.75rem` | Nested one depth further. 3 uses (hero builds, About specs). |
| `.card` | `16px` | — | varies | The generic elevated card. 5 uses. |
| `.project-card` | `12px` | `.project-card-bar` | `1rem 1.1rem 1.1rem` | `.card` + window chrome. 2 routes. |
| `.inbox-panel` | `12px` | `.inbox-panel-head` | `0.5rem` | 3 panes. |

**Title bar anatomy** (all four variants are structurally identical):

```html
<div class="section-shell-bar">
  <p class="section-eyebrow">02 — about</p>
  <!-- optional right-hand control, sharing the eyebrow's baseline -->
  <button class="section-shell-action">view all stack <span>↗</span></button>
</div>
```

- Dot trio: `h-1.5 w-1.5 rounded-full` (hero titlebar uses `h-2 w-2`) with `background-color: var(--gray-300)`, `aria-hidden`.
- `.section-shell-action` is `margin-left: auto`, unbordered, 11px mono, `--gray-500` → `--ink` on `:hover` **and** `:focus-visible`. It is the right-hand slot for the stack toggle and the GitHub handle.
- `.section-shell-bar .section-eyebrow` has its bottom margin zeroed (the bar's padding owns the spacing), plus `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` so a long marker can never break the bar's height.

**Markup pattern for every section:**

```html
<section id="about" class="section-frame px-5 py-16 lg:px-6" style="font-family: var(--font-mono)">
  <div class="w-full max-w-4xl mx-auto">
    <div class="section-shell">
      <div class="section-shell-bar"><p class="section-eyebrow">02 — about</p></div>
      <div class="scanlines" aria-hidden="true"></div>
      <div class="section-shell-body">
        <h2 class="section-title title-row">
          <span>about me</span>
          <span class="title-cursor" aria-hidden="true" />
        </h2>
        …
      </div>
    </div>
  </div>
</section>
```

`font-family: var(--font-mono)` on the `<section>` is the reason every label and number in the shell is mono by inheritance, and it is why `.inbox-bubble` has to opt *back* to `--font-body`.

### 8.2 Buttons & chips

| Class | Shape | Rest | Hover | Variants |
|---|---|---|---|---|
| `.btn-primary` | `7px` | `--ink` fill, `--bg` text, 13px/500 display | `opacity: .82` | — |
| `.terminal-pill` | `999px` | `--gray-300` border, `--gray-500` text, 11px mono, `2px 8px`→`0.5rem 0.75rem` | text **and** border → `--ink` | — |
| `.pill` | `999px` | `--gray-300` border, `--gray-500` text, 11px mono uppercase, `2px 8px` | text **and** border → `--ink` | `.pill-inverted` (no border, `--ink` fill) |
| `.link-arrow` | — | 13px/500 display, `--ink` | glyph `translate(2px, -2px)` | — |
| `.inbox-btn` | `7px` | `--gray-300` border, `--gray-500` text, 11px mono | border+text → `--ink`, `--gray-100` fill | `--primary` (`--ink` fill, hovers to `opacity: .82`), `--active` (persistent ink fill) |
| `.inbox-icon-btn` | `8px`, `2rem` square | `--gray-300` border, `--gray-500` | → `--ink` + `--gray-100` fill | `[aria-expanded="true"]` inverts |
| `.inbox-seg` + `.inbox-seg-item` | `999px` joined | `--gray-300` container, `--gray-200` dividers, 10px mono uppercase | `--gray-100` fill + `--ink` text | `[aria-pressed="true"]` / `[aria-selected="true"]` → `--ink` fill |
| `.section-shell-action` | — | 11px mono, unbordered | → `--ink` | — |
| `.chat-reaction-chip` | `999px` | transparent, `--gray-300` border, 11px mono | border + text → `--ink` | `[aria-pressed="true"]` inverts |

**The one emphasis mechanism in the system is inversion.** `bg: var(--ink); color: var(--bg)`. It is used for the primary button, the active segmented item, the selected palette row, admin chat bubbles, chosen reactions, the unread badge, the typing bubble, `.pill-inverted`, and the scroll-to-top button. Nowhere else.

```css
/* .btn-primary — the only "solid button" in the system */
.btn-primary {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background-color: var(--ink); color: var(--bg);
  font-family: var(--font-display); font-weight: 500; font-size: 13px;
  border-radius: 7px; padding: 0.7rem 1.3rem;
  transition: opacity 0.2s ease;
}
.btn-primary:hover { opacity: 0.82; }
```

**Hovering an inversion button uses `opacity`, not a colour change** — there is nowhere to go but lighter, and a fill shift would be invisible against the same fill.

**The segmented control** replaced free-floating pills that were each individually bordered, so four of them in a row read as four unrelated buttons. One shared container, one divider between positions, the active position inverted:

```css
.inbox-seg { display: inline-flex; align-items: stretch;
             border: 1px solid var(--gray-300); border-radius: 999px;
             overflow: hidden; background-color: var(--gray-50); }
.inbox-seg > * + * { border-left: 1px solid var(--gray-200); }   /* gap:0 + border = the join */
.inbox-seg-item[aria-pressed="true"] { background-color: var(--ink); color: var(--bg); }
.inbox-seg-item:disabled { opacity: 0.4; cursor: default; }
```

It serves **three roles** with the same two classes: status filter (`role="group"` + `aria-pressed`), status setter (with a `saving...` label swap), and the visitor/activity tab strip (`role="tablist"` + `aria-selected`).

### 8.3 Status & state tags

**`.pill.project-tag`** — a `.pill` that can carry a tone, driven by one attribute:

| `data-tone` | Text | Border | Fill | Meaning |
|---|---|---|---|---|
| *(default)* | `--gray-500` | `--gray-300` | transparent | Untagged |
| `live` | `--ink` | `--ink` | `color-mix(--ink 7%)` | Shipped or about to |
| `active` | `--ink` | `--ink` | transparent | Being built right now |
| `template` | `--gray-400` | `--gray-200` | transparent | Practice template — the quietest |

```css
.pill.project-tag {                                   /* compound, deliberately */
  --project-tag-tone: var(--gray-500);
  --project-tag-edge: var(--gray-300);
  --project-tag-fill: transparent;
  flex: none;
  color: var(--project-tag-tone);
  border-color: var(--project-tag-edge);
  background-color: var(--project-tag-fill);
}
.pill.project-tag[data-tone="live"] {
  --project-tag-tone: var(--ink);  --project-tag-edge: var(--ink);
  --project-tag-fill: color-mix(in srgb, var(--ink) 7%, transparent);
}
```

> **Why the compound selector is load-bearing:** `.pill` is defined *later* in the file than these rules, and both are single-class. At equal specificity the later one would simply win and every tone here would silently do nothing — `--ink` tags rendering as `--gray-500`, with no error anywhere. `.pill.project-tag` scores 0-2-0 against `.pill`'s 0-1-0, so the tone holds whatever order they end up in. The same reasoning applies to `.section-shell-bar .section-eyebrow` and `.terminal-pill .build-pill-index`.

**`StatusPill`** (React) — 2 shapes × 4 tones, sourced from `statusPresentation()` in `lib/chatFormat.ts`:

| Variant | Markup | Label |
|---|---|---|
| `pill` (default) | border + dot + text, `px-2.5 py-1`, 11px uppercase, `0.08em` | visible |
| `dot` | dot only, `h-1.5 w-1.5` | `.visually-hidden` text + `title` |
| `hideLabel` | drops both `title` and the hidden span | — |

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
                 text-[11px] uppercase tracking-[0.08em]"
      style={{ borderColor: color, color }}>
  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }} />
  {label}
</span>
```

| Status | Label | Colour |
|---|---|---|
| `active` | "active" | `var(--status-active)` |
| `waiting` | "waiting" | `var(--status-waiting)` |
| `assigned` | "assigned" | `var(--status-assigned)` |
| `resolved` | "resolved" | `var(--status-resolved)` → `--gray-400` |
| *unknown* | falls back to `resolved` | no throw, no blank row |

**`.chat-unread-badge`** — inverted, `min-width: 1.1rem`, 10px mono, so it survives being read as a *count* rather than a coloured dot. Capped at `99+`. Unread also drives two more expressions: name weight `600` vs `500`, and preview colour `--ink` vs `--gray-500`.

### 8.4 Data display

**`.about-widget`** — the four quick facts, upgraded from `.card` boxes into terminal micro-widgets.

```css
.about-widget {
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  background-color: color-mix(in srgb, var(--gray-50) 74%, transparent);  /* translucent... */
  backdrop-filter: blur(6px);                                             /* ...so this does something */
  padding: 0.85rem 0.9rem 0.95rem;
  transition: border-color .35s, box-shadow .35s, transform .35s, background-color .35s;
}
.about-widget:hover { border-color: var(--ink); transform: translateY(-2px); background-color: color-mix(--gray-100 82%, transparent); }
```

| Sub-class | Role | Key values |
|---|---|---|
| `.about-widget-head` | flex row | `gap: 0.45rem`, `min-width: 0` |
| `.about-widget-icon` | 13px lucide, `strokeWidth: 1.7` | `--gray-400` → `--ink` on hover |
| `.about-widget-label` | 11px mono uppercase | `0.1em`, `nowrap`, `ellipsis`, `--gray-500` |
| `.about-widget-label-tight` | two long labels | `0.06em` — trading tracking, **not** font-size, so all four stay optically equal |
| `.about-widget-dot` | 4px indicator | `--gray-300` → `--ink`. *No pulse* — a pulsing dot implies a state that is changing, and these four facts are not |
| `.about-widget-value` | the thing you're here to read | 14px display/500, `tabular-nums`, full `--ink`, `margin-top: auto` |

**`tabular-nums` matters here** because "2nd Year" and "Age 17" are the values most likely to sit beside other digits, and proportional figures would make the hover re-flow. `margin-top: auto` on the value is what makes all four share a baseline even though "Photography · Badminton · Music" wraps to two lines and "Calamba, PH" does not.

**`.about-specs`** — the `key ..... value` dump. Reuses `.build-panel` + `.build-panel-bar` for the box, so it reads as the same component at a third depth rather than as a new invention.

```html
<div class="about-specs-row">
  <span class="about-specs-key">school</span>
  <span class="about-specs-leader" aria-hidden="true"></span>   <!-- flex:1 + dotted bottom border -->
  <span class="about-specs-value">City College of Calamba</span>
</div>
```

The leader is a flex child that grows to fill the gap, with its own bottom border, so the rule is always exactly as long as the free space and the value stays flush right without a per-row width. `aria-hidden` — a screen reader reads the pair off the markup, so announcing a row of dots is noise.

**Not interactive, so no hover.** Lifting would imply a click.

**`.project-card`** — one component, two call sites (home preview + `/projects`).

| Sub-class | Role |
|---|---|
| `.project-card-bar` | Window chrome: dots + `01` index + slugified path, `0.08em`, `truncate` |
| `.project-card-index` | `2.4ch` floor + `tabular-nums` so the path never shifts |
| `.project-card-preview` | `16/9` aspect, `--gray-100`, `.halftone` at 0.45, the project's own devicon at `text-4xl sm:text-5xl` with `grayscale(.55) contrast(.95)` |
| `.project-card-title` | 15px display/600, **`min-width: 0` is load-bearing** — the status tag beside it is `flex: none`, so without it a long single-word title pushes the row past the card edge instead of wrapping |
| `.project-card-role` | 11px mono uppercase, `0.06em` |
| `.project-card-summary` | 14px **serif** — this is prose describing a project, not a label |
| `.project-card-stack` | devicon row, `15px`, `saturate(.9) opacity(.85)`; `translateY(-1px)` on hover |
| `.project-card-foot` | `margin-top: auto` + `border-top` — pins to the card bottom regardless of description length |

**The preview swaps the primary devicon, not a giant washed-out first letter.** The letter made every card advertise the same anonymous shape and pushed real content two-thirds down the card; the devicon is recognisable, already the first thing in the stack row below, and gives six cards six different previews.

**`.section-title` + `.title-row` + `.title-cursor`** — the section heading, optionally with a blinking block cursor. The cursor is sized in `em` off the heading, so `/projects`' 20px `<h1>` and About's `<h2>` share one rule.

```html
<h2 class="section-title title-row">
  <span>about me</span>
  <span class="title-cursor" aria-hidden="true" />
</h2>
```

`text-shadow` is inherited, so `.title-row:hover` reaches the heading's text but not the cursor block beside it (that's a background, not glyphs). **Two haloes, not one** — the tight one is the lit edge, the wide one is the falloff. A single shadow at this radius reads as a grey smudge in light mode, because that is exactly what a wide black-ish alpha over white is.

### 8.5 Chat components

**`ChatWithIan`** — `variant?: "floating" | "sidebar"`. The variant changes exactly two elements and nothing else.

| | `floating` (default) | `sidebar` |
|---|---|---|
| Opener | `fixed bottom-6 left-6 rounded-full px-4 h-11 shadow-lg`, `--ink` fill | in-flow, `rounded-lg px-3 py-2.5`, `--gray-50` fill, 14px icon |
| Panel | `chat-panel-floating`, `left: calc(var(--sidebar-w) + 1rem)` at `lg` | `chat-panel`, `bottom-4 left-4` |

**Message roles** (driven by `message.source`, not a prop):

| Source | Alignment | Fill | Text | Avatar | Meta |
|---|---|---|---|---|---|
| visitor (`role="user"`) | end | `--ink` | `--bg` | — | "you · 9:42 AM" |
| assistant | start | `--gray-100` | `--ink` | anime avatar | "Ian · 9:42 AM" |
| admin (human takeover) | start | `--gray-100` | `--ink` | **name, not avatar** | "Ian · 9:42 AM" |
| system | centre | `--ink` chip | `--bg` | none | `role="status"` |

The AI avatar renders only for non-visitor, non-admin messages — a human takeover gets a name instead, so the visitor can see a person answered.

**States:**

| State | Treatment |
|---|---|
| Loading | `aria-busy` on the dialog, empty bubble reads `thinking…`, `▍` caret after streamed text, quick-actions hidden, composer controls disabled |
| Disabled | attach `opacity-40`, input `opacity-50`, send `opacity-40`, quick pills `opacity-50` |
| Empty | The greeting is the seed message; the pre-chat contact form replaces the whole transcript |
| Error | Inline `role="alert"` — `var(--gray-500)` in the thread, `#dc2626` in the contact form |
| System notice | `role="status"`, centred `rounded-full` ink chip, no avatar, no meta |

```html
<div class="chat-reaction-row flex flex-col items-end">   <!-- visitor -->
  <div class="chat-meta" style="justify-content: flex-end">
    <span style="color: var(--ink)">you</span>
    <span aria-hidden="true">·</span>
    <time datetime="…">9:42 AM</time>
  </div>
  <div class="whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-relaxed"
       style="background: var(--ink); color: var(--bg)">…</div>
  <div class="chat-reaction-bar" data-active="true">…</div>
</div>
```

**`.chat-reaction-bar`** is `opacity: 0` until hovered, focused, or already reacted — an un-reacted thread stays clean. `:focus-within` is not optional; a hover-only affordance is invisible to anyone tabbing through the transcript. `data-active="true"` is the sticky case, so a row the viewer has used stays visible.

**`ReactionBar`** — 2 kinds (`thumbs_up`, `heart`), `align?: "start" | "end"`, `busy` blocks double-submit. The count renders only when `> 0`, as plain text beside the glyph rather than a filled pill, so the un-hovered state stays quiet. The emoji itself carries the colour, so a tinted background would only add noise.

**`TypingIndicator`** — inverted ink bubble with a flat bottom-left corner (matching an incoming bubble), sized to match a single-line message so the transcript does not jump as it appears and disappears. `aria-live="polite"` always; `role="status"` only when `announce`.

```css
.chat-typing-bubble {
  background-color: var(--ink); color: var(--bg);
  border-radius: 0.75rem; padding: 0.5rem 0.75rem;
  font-size: 0.8125rem; line-height: 1rem;
}
.chat-typing-dot { width: 4px; height: 4px; border-radius: 50%;
                   opacity: .35; animation: chat-typing-fade 1.1s ease-in-out infinite; }
.chat-typing-dot:nth-of-type(2) { animation-delay: .16s; }
.chat-typing-dot:nth-of-type(3) { animation-delay: .32s; }
```

### 8.6 Inbox components

**`.inbox-bubble`** — two roles, with a **flat corner as the tail**:

```css
.inbox-bubble { font-family: var(--font-body); font-size: 15px; line-height: 1.6;
                white-space: pre-wrap; overflow-wrap: anywhere;
                padding: 0.7rem 0.9rem; border-radius: 12px; }

.inbox-bubble--visitor { color: var(--ink);
  background-color: color-mix(in srgb, var(--gray-100) 62%, transparent);
  backdrop-filter: blur(8px); border: 1px solid var(--gray-300);
  border-top-left-radius: 3px; }                    /* ← "incoming" */

.inbox-bubble--admin   { color: var(--bg);
  background-color: var(--ink); border: 1px solid var(--ink);
  border-top-right-radius: 3px; }                    /* ← "mine" */
```

> **A documented bug this fixed.** Visitor bubbles were once `var(--gray-100)` inside a `var(--gray-50)` panel — adjacent steps in the same ramp, **5/255 apart in light and 6/255 in dark**. *"Which is not a surface, it is a rounding error."* The bubbles had no edge, and the only thing marking where one message ended was a 1.5rem gap, so the transcript read as undifferentiated blocks. Visitor bubbles now carry a real hairline **and** a translucent fill — which is what makes `backdrop-filter` do anything at all. Admin bubbles keep the inversion: the design system's one emphasis mechanism, and the only thing on the page that says "this one is mine".

`overflow-wrap: anywhere` plus `min-width: 0` on `.inbox-bubble--wrap` means a pasted URL or stack trace cannot push a bubble past its 74% measure.

**`.inbox-row`** — 280px rail, two lines instead of four. Was ~92px per row showing four conversations; now ~half the height with the timestamp moved onto the identity line.

```css
.inbox-row { display: block; width: 100%; padding: 0.6rem 0.65rem;
             border: 1px solid transparent; border-radius: 8px; text-align: left; }
.inbox-row:hover { background-color: var(--gray-100); }
.inbox-row[aria-current="true"] {                       /* not a class — matches the a11y tree */
  background-color: color-mix(in srgb, var(--ink) 6%, transparent);
  border-color: var(--ink);
}
```

Inverted edge + tinted fill, so the active row is unmistakable in a list of grey ones and still reads without relying on the tint alone.

**`.inbox-avatar`** — a CSS-drawn monogram, because `chat_conversations` has no avatars. **Square, not round** (see §6.5).

| Modifier | Size | Font | Radius |
|---|---|---|---|
| *(base = `md`)* | `2rem` | `12px` | `8px` |
| `--sm` | `1.65rem` | `10px` | `6px` |
| `--lg` | `2.5rem` | `15px` | `10px` |

The open row inverts its monogram, so the selection reads from the corner of the eye as well as from the row's fill and border.

**`.inbox-field`** and **`.inbox-composer`** — the two input surfaces, both translucent so the blur does something, both signalling focus with a **border** swap and never a ring.

```css
.inbox-field { padding: .45rem; border: 1px solid var(--gray-300); border-radius: 7px;
               background: color-mix(in srgb, var(--gray-100) 62%, transparent);
               font-family: var(--font-mono); font-size: 11px; letter-spacing: .04em; }
.inbox-field:focus { border-color: var(--ink); }
.inbox-field::placeholder { color: var(--gray-400); font-style: italic; letter-spacing: 0; }
```

```css
.inbox-composer { border: 1px solid var(--gray-300); border-radius: 10px;
                  background: color-mix(in srgb, var(--gray-100) 62%, transparent);
                  backdrop-filter: blur(8px); }
.inbox-composer:focus-within { border-color: var(--ink); }   /* focus-within, not :focus */
.inbox-composer textarea { min-height: 2.5rem; max-height: 13rem; overflow-y: auto;
                           font-family: var(--font-body); font-size: 15px; line-height: 1.6;
                           resize: none; outline: none; }
```

**One bordered surface holds the textarea and its actions**, rather than a bare textarea with a button floating beside a hint line. The textarea auto-grows from `scrollHeight` on every keystroke, tracking content up to the 13rem cap rather than growing its own scrollbar; `min-height` covers the frame before that effect runs, so there is no jump on first paint.

**The composer hint is variant-aware** — `"Enter sends · Shift+Enter for a new line"`, or `"Resolved — replying does not reopen it"` on a closed thread.

**`.inbox-transcript`** — the only element given real breathing room. `scrollbar-gutter: stable` reserves the gutter whether or not the thread is currently scrollable, so messages do not shift sideways the moment a thread grows past the fold.

**`.inbox-system`** — a centred 999px pill for system notices, `role="status"`.

**`.activity-row` / `.activity-rail`** — the timeline rail is drawn with a **border** on a flex child rather than a positioned pseudo-element, so the dot and the line cannot drift apart when a row wraps to two lines. Chat rows vs page rows are distinguished by **two** things: a `MessageCircle` icon vs a 1.5px grey dot, and a `"chat · "` meta prefix.

**Two-step destructive confirm** — `confirmDeleteId`. Idle is an `inbox-icon-btn` with `aria-label="Delete session"`; confirming swaps in an `inbox-btn inbox-btn--primary` plus a cancel. Inbox buttons invert on hover rather than filling, so the destructive action can never be mistaken for the primary action at a glance.

### 8.7 Layout chrome

**`Sidebar`** — three zones at `lg`+ (`16rem`, `h-screen`, `overflow-hidden`, `border-r`):

1. **Identity** — `marianne napaño` in display, `BSCS · COMPUTER SCIENCE` in 11px mono uppercase.
2. **Scroll region** (`min-h-0 flex-1 overflow-y-auto pr-1`) — the ⌘K command button, the `LiveStatus` readout, the chat trigger. Each is a bordered `py-5` group.
3. **Footer** (`mt-auto shrink-0 pt-5`) — `ThemeToggle` + contact.

The numbered section list was **removed from the rail** — it duplicated the command palette and made the sidebar the longest thing on the page. It survives in the mobile drawer, where it is the only navigation a touch user has: a hamburger opening a drawer containing one button which opens a modal would be strictly worse than not having a drawer.

**`SidebarCommandButton`** — the shortcut is shown *on the control*, not only in a tooltip; it is the only way a visitor learns the palette has a keyboard shortcut. `py-px` on the `<kbd>` rather than `py-0.5` because the tag is the tallest thing in the row and therefore sets the button's height: 10px line + 2px padding + 2px border = 14px, exactly the icon beside it.

**`ScrollTopButton`** — 44px circle, `--ink` fill, appears past `scrollY > 400`. `h-11 w-11` matches the chat opener's height.

**`CommandPalette`** — ⌘K / Ctrl+K bound on `document`, so the palette is reachable without aiming at the sidebar. The modifier glyph is platform-resolved (`⌘K` on Apple, `ctrl k` elsewhere) because showing "⌘K" to a Windows user describes a chord their keyboard does not have; it starts as a neutral `"K"` so the first paint shows something true.

| Behaviour | Implementation |
|---|---|
| Search | Label + keywords, **every** term must match. Substring, not fuzzy — a palette for eight fixed destinations should never reorder results behind the visitor's back. |
| Navigation | ↑↓ wraps, `Home`/`End`, `↵` selects. Active row is a real `role="option"` with `aria-selected`, so the highlight is **announced**, not just drawn. |
| Scrolling | `scrollIntoView({ block: "nearest" })` so the active row cannot be dragged under the sticky search field |
| Focus | Moved into the input on open (deferred a frame so it isn't lost to the open transition), **returned to the trigger on close** — a keyboard user is never dropped at the top of the document |
| Dismiss | `Escape`; backdrop uses `onMouseDown` so a drag that began inside the panel and ended outside does not close it |
| Scroll lock | Restores the **exact previous value** of `body.style.overflow`, because the mobile drawer also writes it and a hard reset would unlock the page while that drawer is open |
| Active row | **Inversion**, not an accent colour: reads instantly in both themes and in a greyscale screenshot |
| Empty | `no section matches "…"` |
| Body scroll lock + `aria-modal` | ✅ |

**`ThemeToggle`** — two shapes:

| Shape | Rendering |
|---|---|
| Default (sidebar) | 3-way `system / light / dark` segmented pill, `h-6 w-6` round buttons, active = `--gray-200` fill + `--ink` |
| `compact` (mobile bar) | Single 32px round button, `aria-pressed`, `title` + `aria-label` |

`system` **removes** the `data-theme` attribute rather than setting it, which is what lets the `prefers-color-scheme` media query take over.

### 8.8 Decorative components

**`PixelTransition`** — a 7×7 pixel-dissolve hover/tap transition between two arbitrary contents, driven by GSAP. `pixelColor="var(--bg)"` so the pixels match the theme. Used for the hero portrait.

**`DepthCarousel`** — a 3D `preserve-3d` photo fan.

```html
<DepthCarousel items={...} cardWidth={260} cardHeight={340} depth={180}
               spread={70} tilt={18} perspective={1200} visibleCards={3}
               radius={12} tint="#05060a" autoplay loop />
```

> **The one non-negotiable constraint in `DepthCarousel.css`:** an element with `overflow` other than `visible` renders as if its `transform-style` were `flat`, silently cancelling the depth. Clipping belongs to the carousel's own *stage*, which is a different element from the one carrying `preserve-3d`. Never merge them.
>
> Also: the carousel is `height: 100%`, and a percentage height against an auto-height parent resolves to **zero** — which is what collapses the whole fan into a strip. The inner box needs an explicit height.

### 8.9 Utility classes

| Class | Purpose |
|---|---|
| `.visually-hidden` | Screen-reader-only. **Plain CSS, not Tailwind's `sr-only`, on purpose** — the utilities are CDN-generated and unverifiable from `npm run build`, and a utility that silently fails to generate in an accessibility affordance means the text is simply gone. |
| `.micro-label` | 11px uppercase mono. The smallest readable step. |
| `.section-eyebrow` | 14px uppercase mono, `1px` tracking, `0.75rem` bottom margin. |
| `.section-title` | Section heading type scale. |
| `.text-link` | `underline` at `2px` offset, `color-mix(--ink 25%)`, strengthening to `--ink` on hover. |
| `.enter` | One-shot page-entrance fade-up, `translateY(12px)` → `0`. |
| `.scanlines` | CRT texture. |
| `.halftone` | Dot field, radially masked. |
| `.status-dot` | 6px `--ink` dot, `1.8s` opacity pulse. |
| `.sidebar-offset` | `lg:padding-left: var(--sidebar-w)`, written as `html .sidebar-offset` for specificity over Tailwind's `lg:px-0`. |
| `.sidebar-chat-panel` | `lg:left: calc(var(--sidebar-w) + 1rem)` — derives the 16px gap instead of hardcoding `21rem`. |
| `.section-frame` | Section flex column + snap align. |

**Scrollbars are globally slimmed** — `scrollbar-width: thin`, 6px webkit track/thumb, `--gray-300` thumb at `999px` radius.

```css
* { scrollbar-width: thin; scrollbar-color: var(--gray-300) transparent; }
*::-webkit-scrollbar { width: 6px; height: 6px; }
*::-webkit-scrollbar-thumb { background-color: var(--gray-300); border-radius: 999px; }
```

---

## 9. Theming

Three states: **system / light / dark**, persisted to `localStorage["theme"]`.

**`system` removes the attribute rather than setting it**, which is what lets the media query take over:

```ts
function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}
```

Three CSS blocks define the same tokens:

| Block | Selector | Trigger |
|---|---|---|
| Explicit | `:root` | Default, light |
| Explicit | `:root[data-theme="dark"]` | Toggle or stored choice |
| System | `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]):not([data-theme="dark"]) }` | OS preference only |

Each sets `color-scheme` so native UI (scrollbars, form controls) follows.

**No-flash bootstrap** (`index.html:40-49`) — runs before first paint:

```js
try {
  var stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
} catch (e) {}
```

**Token contract for adding a new accent.** `theme.css:842-846` prescribes it: add a token **aliased** to a status colour in all three theme blocks, the way `--accent-positive` is — never a literal typed into a rule. A fixed hex renders identically on white and near-black, so it either vanishes or glares depending on the visitor's system setting.

---

## 10. Accessibility

This is a genuinely strong part of the system. The rules below are consistently applied.

### 10.1 Colour independence

- **Status is never the only carrier.** Every pill spells the state in text, or in `.visually-hidden` text for the compact list form. The inbox is fully readable in monochrome and by a colour-blind reader.
- **Selected/pressed state is carried by shape as well as fill.** Bubbles get a flat corner; the open row inverts its monogram; the active segmented item inverts; a chosen reaction inverts.
- **Contribution graph has a text total** and a `title` per cell, so the heatmap is never the only representation.
- **Focus is a border swap** (`focus:border-[var(--ink)]` / `:focus-within`) — a shape change, not a colour-only one.

### 10.2 Live regions

| Region | Semantics |
|---|---|
| `.inbox-transcript` | `aria-live="polite"` |
| Chat message list | `aria-live="polite"`, `aria-label="Chat messages"` |
| `.inbox-system`, system notice, `TypingIndicator announce` | `role="status"` |
| Every error | `role="alert"` |
| Chat dialog | `aria-busy={loading}` |
| `.chat-reaction-bar` | `:focus-within` — a hover-only affordance is invisible to a keyboard user |

**Deliberately *not* a live region:** the sidebar clock and uptime. A clock that updated every second through `aria-live` would make the page unusable. The clock gets a `.visually-hidden` "local time, updated live" read once in full; the uptime counter is `aria-hidden` entirely — *"an uptime counter is ambience."*

### 10.3 Decoration vs content

Consistently correct: `.scanlines`, halftone dots, chrome dots, indicator dots, build-pill indices, the title cursor, dotted spec leaders, project devicons, the activity rail, and avatar images all carry `aria-hidden`. The title cursor specifically — *"it is decoration implying 'editable', and these are static reads — announcing a cursor would be a false claim."*

### 10.4 Keyboard

| Contract | Implementation |
|---|---|
| ⌘K / Ctrl+K | Bound on `document`; typing guard applies **only on open**, so the palette can always be closed |
| Palette | ↑↓ (wrapping), Home, End, ↵, `Escape` |
| Chat & note composers | `Enter` sends, `Shift+Enter` newlines — identical in all three text inputs |
| Theme toggle | Every icon-only button has `aria-label` **and** `title` |
| Anchor navigation | `scrollIntoView()` with no options, so `html`'s `scroll-behavior: smooth` and its reduced-motion override both apply |

**Known gaps:** no focus trap in the chat panel or command palette, no `Escape` to close the chat panel, no `focus-visible` ring anywhere (focus is border-only), and the palette's `aria-modal="true"` is therefore an over-claim.

### 10.5 Structure & semantics

- Real `<ol>` / `<ul>` where order matters; numbering comes from the list, so bracketed indices are `aria-hidden`.
- Real `<time dateTime="ISO">` on every timestamp, with the human format as content and the exact time in `title`.
- `aria-current="location"` (in-page nav) and `aria-current="true"` (selected list row) — the selected row uses the attribute already declared for assistive tech, so styling cannot disagree with it.
- `aria-expanded` on the info toggle and the stack toggle; `aria-pressed` on filter chips, status chips and takeover; `aria-selected` on tabs and palette options.
- `aria-label` on **every** icon-only button.
- Icon-only buttons are **fixed square** (`2rem` / `2.25rem`) so a labelled and an unlabelled control share one optical height.
- The `@property`-free `getModifierLabel` starts at a neutral `"K"`, so the first paint shows something true rather than the wrong modifier.
- `.inbox-shell` uses **explicit `grid-column` placement**, not auto-flow, because below `lg` only one of the three panes is displayed and auto-placement would see a hole and push the next pane into the wrong column.
- `min-width: 0` is applied wherever a flex or grid child must shrink below its content — on `.project-card-title`, the palette input, `.section-shell-bar`, `.inbox-bubble--wrap`, `.inbox-row-line`, and the hero's path. It is load-bearing every time.

### 10.6 Reduced motion

Covered in detail in [§7.4](#74-reduced-motion). Nine guards, each scoped by judgement, each with a stated reason for what survives.

---

## 11. Audit: Known Inconsistencies & Debt

Ranked by risk. Everything here was verified against the source at commit `1fac080b`.

### 11.1 🔴 Tailwind utilities are unverifiable at build time

Covered in [§2.2](#22-️-critical-tailwind-is-not-actually-compiled). The Vite plugin is registered but inert; the Play CDN does the work; the production bundle contains **zero** Tailwind output; `npm run build` cannot catch a broken class; cascade precedence depends on runtime injection order.

**Impact:** highest. A single typo in any `className` ships silently, and the entire layout layer — which is most of this system — has no build-time guarantee.

**Fix:** add `@import "tailwindcss"` + a `@theme` block to `theme.css`, delete `index.html:20`, add `@source` globs. This also lets the specificity hacks in `theme.css` be removed safely.

### 11.2 🔴 A hardcoded green that clashes with the themed one

```ts
// components/chat/ChatWithIan.tsx:101
const PRESENCE_COLOR = "#22c55e";
```

This is the visitor chat's presence dot and "online" bullet. Every *other* live indicator on the site — the hero titlebar, the hero stat, the sidebar clock, the inbox takeover banner — correctly uses `var(--status-active)`, and `ChatInboxPage.tsx:57` contains a comment explaining that this exact literal was replaced *there* for precisely this reason.

`#22c55e` is not `--status-active` in either theme (`#3f7d3f` light, `#6ee06e` dark). So the visitor chat renders a fixed green that is simultaneously too dark on white and too dark on near-black, while the identical concept elsewhere renders correctly. It is a direct violation of the rule `Hero.tsx:349-354` and `ChatInboxPage.tsx:53-59` both cite.

**Fix:** `const PRESENCE_COLOR = "var(--status-active)";`

### 11.3 🟠 Three competing spellings of "error red"

| Spelling | Location |
|---|---|
| `style={{ color: "#dc2626" }}` | `ChatWithIan.tsx:1687` (contact form) |
| `className="text-xs text-red-500"` | `ChatInboxPage.tsx` (composer + login) |
| `className="... text-red-500"` | `InternalNotes.tsx` (note error) |

`#dc2626` ≈ Tailwind `red-600`; `text-red-500` is a *different* red. Two shades, no token, neither theme-aware. Add `--status-error` alongside the other three status tokens and alias it in all three theme blocks.

### 11.4 🟠 The shadcn layer should be deleted

`components/ui/button.tsx` + `components.json` + `components.json`'s reference to a non-existent `src/index.css`. Covered in [§2.3](#23-the-shadcn-layer-is-vestigial). `button.tsx` is imported by nothing and depends on 14 undefined tokens. Also deletable: `components/ui/Stack.tsx` (imported by nothing), and the unused `@fontsource-variable/geist`, `tw-animate-css`, `autoprefixer` and `postcss` dependencies.

### 11.5 🟡 Text smaller than the stated 11px floor

`theme.css:306-309` sets 11px as the floor, because uppercase mono with wide tracking stops being legible below it and thin strokes disappear on dark. Five call sites use **10px**:

| Site | Class |
|---|---|
| `.build-panel-bar` | `10px` (overridden to 11px by `.about-specs-bar`, but not elsewhere) |
| `.inbox-seg-item` | `10px` |
| `.inbox-row-time` | `10px` |
| `.inbox-hint` | `10px` |
| `.chat-unread-badge` | `10px` |
| `ActivityTimeline` meta, `InternalNotes` timestamp/counter, `ChatWithIan` attachment label | `10px` |

Either lift them to 11px, or amend the rule to say the floor is 10px for the *inbox* route — which is arguably the honest statement, since `.inbox-app` has already re-based the whole route at 14px.

### 11.6 🟡 Two different `.card` classes

| Definition | Radius | Background |
|---|---|---|
| `theme.css:387` — the global design-system card | `16px` | `var(--gray-50)`, `--shadow-resting`, lift on hover |
| `Stack.module.css:22` — a CSS-module class also named `.card` | `1rem` (16px) | `var(--gray-50)`, no shadow |

The radius happens to match; the elevation does not. CSS-module hashing keeps them from colliding at runtime, but the name collision will mislead the next reader. Rename the module class to `.stackCard`.

### 11.7 🟡 Unused tokens and dead ramp steps

- `--gray-600` through `--gray-950` — 6 of 11 ramp steps have **zero** call sites.
- `--shadow-modal` — defined in both themes, never consumed.
- **`Geist Mono`** is requested from Google Fonts on every page load and no token references it.
- `public/fonts/KodeMono-*.ttf` (5 files, plus OFL) ships unused; `README.txt` documents them as the self-host fallback.

### 11.8 🟡 The README describes a different design system

`README.md` is ~2 passes behind the code and contradicts it on fonts:

| README claim | Reality |
|---|---|
| "Headings → Geist Pixel" | `--font-display` is **Kode Mono** |
| "Geist Mono (labels, the tiny uppercase micro-label register)" | `--font-mono` is **Kode Mono**; Geist Mono is loaded and unused |
| "`--font-display` now points at [GeistPixel-Square.woff2]" | File does not exist; no `@font-face` in `theme.css` |
| "the `mrn.` logotype also stays on the Geist Pixel display font" | No `mrn.` anywhere; the wordmark is `marianne napaño` |
| "ThemeToggle is now a single icon button that cycles light → dark → system" | It is a 3-way segmented control (`system`/`light`/`dark`) plus a separate `compact` shape |
| "Theme toggle moved to the top of the desktop sidebar" | It is in the sidebar **footer** |
| Lists `components/layout/Footer.tsx` | Does not exist |
| Lists `components/ui/DepthCarousel.module.css` | Actual file is `DepthCarousel.css` (not a module) |
| "Halftone accent, used exactly twice per the spec's rule" | Used on every project card preview |

**Also stale, in-code:**

| Location | Drift |
|---|---|
| `Hero.tsx:236` | *"Name takes the display role (**Geist Pixel**)"* — it is Kode Mono |
| `theme.css:16-17` | *"All **three** are requested once from Google Fonts"* — `index.html` requests **four** |
| `index.html:27` | *"Mono — **Geist Mono** (labels, nav, code, UI chrome)"* — `--font-mono` is Kode Mono |
| `MainLayout.tsx:112-118` | Claims the `max-w-4xl` cap clamps `/chat-inbox`; it does not (see §5.6) |
| `.clinerules` | Cited as the authority for "no hardcoded colours" in 4+ comments. **The file does not exist in the repo.** |

### 11.9 🟡 No `h4`–`h6` type scale

Only `h1`–`h3` have a defined scale. The blanket rule assigns the family to all six and nothing else. The next section that wants a fourth-level heading will invent a size — which is exactly the drift `.section-title` was created to stop.

### 11.10 🟡 Inconsistent non-interactive hover

Principle 8 says static surfaces get a border + glow, never a fill or a pointer. `.about-widget` and the Education/Life `.pill` rows comply. **`TechStackShowcase.tsx:115` and `:131` do not:**

```tsx
className="card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)]
           border border-[var(--gray-200)] … hover:border-[var(--gray-300)]
           hover:bg-[var(--gray-100)] cursor-default"
```

A background fill plus `cursor-default` on a non-interactive element promises an action that does not exist. Worse, `.card`'s own 16px radius is overridden by `rounded-lg` (8px), and its `--shadow-resting` + hover lift is kept — so the element gets two competing hover treatments.

### 11.11 🟢 Smaller items

| Item | Detail |
|---|---|
| `#05060a` hardcoded | `DepthCarousel.tsx:62` (default) and `LifeOutsideIDE.tsx:131` — a 3D depth tint, arguably a scene value rather than a UI token, but it is the same dark value in both themes |
| `--shadow-color` unused in dark | Light declares `--shadow-color: 0,0,0` and composes `rgba(var(--shadow-color), α)`; dark inlines its own triple. The light pattern is the better one |
| Scrollbar thumb on dark | `--gray-300` = `#3a3a42` on `#0c0c0f` — visible, but at 1.57:1 it is faint. `--gray-400` would be stronger |
| `Select` / form controls | Never styled. `color-scheme` is set, so native controls follow the OS rather than the design system |
| Blog card radius | Uses `rounded-2xl` (16px) on the image box, matching `.card` by coincidence rather than by reference |
| `theme-color` meta | Hardcoded `#0a0a0a`; does not follow the active theme |
| `Sidebar.tsx:294` | `<aside>` renders with an empty `className` interpolation (`${className}`), so the prop is inert |

### 11.12 Summary

The **design system itself is excellent** — deeply considered, unusually well-reasoned, with an accessibility layer most portfolios skip entirely. The problems are almost entirely at the seams: a build pipeline that does not actually run, a scaffold from a different design system left in place, three hardcoded colours, and documentation that describes a design language two refactors old.

The single highest-leverage change is [§11.1](#111-️-tailwind-utilities-are-unverifiable-at-build-time) — it converts the majority of the system from runtime-asserted to build-verified, and makes the specificity workarounds in `theme.css` unnecessary.

---

*Extracted from `src/styles/theme.css` (2,327 lines) and 22 component files. Colour values computed from source; contrast ratios measured per WCAG 2.1. Verify against source before relying on it — the codebase is actively changing.*
