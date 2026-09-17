# Portfolio -- bryl-minimal edition (Vite + React + TS)

Design language ported from https://github.com/bryllim/bryl-minimal-design
(Bryl Lim's `bryl-minimal-design` skill) and applied by hand across every
component -- monochrome palette, numbered section headers, mono
micro-labels, hairline cards, halftone accents, and full light/dark
theming.

This matches the Vite project you already have set up (not Next.js --
see the folder layout below).

## 1. Install dependencies

```bash
npm install gsap lucide-react
npm install -D @vercel/node
```

(react, react-dom, and their @types should already be installed from
earlier -- gsap is for PixelTransition/DepthCarousel, lucide-react is
the icon set now used in the sidebar and theme toggle.)

## 2. Copy files in

```
src/main.tsx              -- Vite entry point, mounts <App />
src/App.tsx               -- root component, composes every section
src/styles/theme.css       -- design tokens, fonts, .card/.pill/etc.
index.html                 -- replace your existing one at the project root
components/layout/Sidebar.tsx
components/layout/ThemeToggle.tsx
components/layout/Footer.tsx
components/layout/ScrollTopButton.tsx
components/sections/Hero.tsx
components/sections/TechStackShowcase.tsx
components/sections/Education.tsx
components/sections/GithubActivity.tsx
components/sections/Projects.tsx
components/sections/Blog.tsx
components/sections/LifeOutsideIDE.tsx
components/ui/PixelTransition.tsx
components/ui/PixelTransition.module.css
components/ui/DepthCarousel.tsx
components/ui/DepthCarousel.module.css
```

Delete your old `style.css` and `script.js` -- both are fully
superseded (theme.css replaces style.css; the components replace
script.js's DOM logic).

Confirm `tsconfig.json` has `"baseUrl": "."` alongside `"paths": { "@/*": ["./*"] }`,
and that `vite.config.ts` includes the `tsconfigPaths()` plugin (both
should already be true from your existing setup).

## 3. What the design language actually changes

- **No accent color, anywhere.** Every color in every component comes
  from the tokens in `theme.css` (`--bg`, `--ink`, `--gray-50`
  through `--gray-950`). Emphasis is inversion (ink chip on the page,
  like the scroll-to-top button) or typography, never a brand color.
- **Numbered section headers.** Each section's eyebrow reads like
  `01 — home`, `02 — stack`, etc., set in the mono display role at
  small size, gray-400. Renumber if you reorder sections.
- **Four font roles**: Geist (body/UI), Geist Mono (labels, the tiny
  uppercase micro-label register used everywhere), Source Serif 4
  (the Hero's long-form intro paragraphs only), and Geist Pixel as the
  fourth "display" role — see the dedicated bullet below for where
  it's actually used and why.
- **Light / dark / system theming.** `ThemeToggle.tsx` is the 3-way
  switch in the sidebar; it sets `data-theme` on `<html>` and persists
  the choice to `localStorage`. The inline script in `index.html`'s
  `<head>` reads that before first paint so there's no flash. Every
  color reference in the components uses the CSS variables, so
  there's nothing else to wire up.
- **Cards, pills, buttons** all pull from the three reusable classes
  in `theme.css` (`.card`, `.pill` / `.pill-inverted`, `.btn-primary`,
  `.link-arrow`) rather than one-off Tailwind color utilities, so the
  shadow recipe, radius ladder, and hover motion timing from the spec
  stay consistent everywhere instead of drifting component to
  component.
- **Halftone accent**, used exactly twice per the spec's "seasoning,
  not wallpaper" rule: as a small dot cluster bleeding off the top
  corner of the Hero photo frame. It's the `.halftone` class -- a
  radial dot field masked to fade at the edges.
- **Real Geist Pixel font**, self-hosted (Square variant, OFL-licensed —
  `public/fonts/GeistPixel-Square.woff2` + `GeistPixel-LICENSE.txt`,
  sourced directly from `vercel/geist-pixel-font`). `--font-display`
  now points at it for real. It's used for the `mrn.` logotype and the
  mobile full-screen menu's nav labels — short, lowercase, ASCII-only
  text, since the font's coverage of accented characters is limited
  (that's also why the Hero's "Marianne Napaño" heading still uses
  the regular body font rather than the pixel one). Section eyebrows
  (`01 — home`) intentionally stayed on Geist Mono — the pixel font
  is a display face and gets illegible at that size. Want a different
  mood? Swap `GeistPixel-Square.woff2` for the Circle/Grid/Line/Triangle
  variant from the same repo and update the `@font-face` src in
  `theme.css`.
- **Page-load entrance animation.** The Hero's text and photo, plus
  the sidebar logo and nav links, fade up in a single staggered
  sequence (~70ms apart) on load, using the `.enter` class from
  `theme.css` with inline `animationDelay` per element. This only
  runs once, on mount — it's not a scroll-triggered reveal (the spec
  treats this as "one orchestrated moment," not a repeating effect
  down the whole page).
- **Sidebar breakpoint moved to `lg:` (1024px)**, not `md:` (768px),
  matching the spec's stated breakpoint. Below it, navigation is now
  a sticky top bar that expands to a full-screen overlay menu (not
  the bottom sheet from the previous version) -- also per spec.

## 4. Images

Move `images/` into `public/images/` if you haven't already -- Vite
serves `public/` at the site root, so code refers to `/images/mypfp.png`.

## 5. Run it

```bash
npm run dev
```

## 7. Hero now doubles as the contact card

The standalone Contact section is gone -- its three links (email,
GitHub, LinkedIn) moved into the Hero as an inline arrow-link row,
matching the reference layout where the profile card (photo + name +
bio + links) is one self-contained unit. `Sidebar.tsx`'s nav list had
its `#contact` entry removed to match; renumber `Hero`'s "01 — home"
eyebrow if you rename or reorder things later.

Two more changes to Hero specifically:

- **Font**: the whole card (heading, bio, link row) is now set in
  Geist Mono, matching the reference profile card exactly, instead of
  mixing in Geist Sans and Source Serif 4. Every *other* section still
  uses the body/mono/serif split described above -- this mono-only
  treatment is scoped to Hero on purpose, since that's what the
  reference card actually does. If you want the whole site in
  monospace instead, that's a one-line change: set `--font-body` to
  `var(--font-mono)` in `theme.css`.
- **Photo placeholder**: `PixelTransition`'s `firstContent` (shown by
  default) is now a plain placeholder — a generic outline icon on
  `--gray-100` with a "hover to reveal" label — and `secondContent`
  (shown on hover/tap) is the real photo at `/images/mypfp.png`. That's
  the reverse of the previous version. Nothing else about
  `PixelTransition.tsx` needed to change; it was already built to
  swap two arbitrary pieces of content.

## 8. Icons, theme toggle placement, and the redesigned Projects cards

- **Sidebar icons**: each nav item now has a small line icon from
  `lucide-react` (`Home`, `Layers`, `GraduationCap`, `Github`,
  `FolderKanban`, `Newspaper`, `Sparkles`), matching the reference
  dashboard's iconography. Swap any of them for a different lucide
  icon by changing the import and the `Icon` reference in
  `NAV_ITEMS`.
- **Theme toggle moved to the top** of the desktop sidebar (next to
  the `mrn.` logo) and added to the mobile sticky top bar too, instead
  of sitting at the bottom. It's also icon-only now (`Monitor` / `Sun`
  / `Moon` from lucide-react) rather than text labels, matching the
  reference's icon pill.
- **Projects redesigned** as browser-preview cards: a placeholder
  "browser window" (monochrome traffic-light dots + a halftone-and-
  monogram placeholder, since there's no real screenshot yet) sits
  above the title, role line, description, a small devicon stack row,
  and a footer row that shows `visit site ↗` for anything with a real
  `href`, or a muted "not live yet" label otherwise -- so nothing links
  out to a dead page. Fill in `href` on any `PROJECTS` entry once it's
  actually deployed. The "more on github" pill at the bottom links to
  your profile in place of the reference's "Explore 25+ Projects"
  button, since a project count you can't back up would be misleading.

## 9. Chat with Ian (Gemini-powered)

A floating chat widget, bottom-left, that answers visitor questions
*as* you, using the Gemini API. The API key is never exposed to the
browser -- a Vercel serverless function (`api/chat.ts`) holds it
server-side and is the only thing that talks to Gemini directly.

### Files

```
content/profile.ts          -- single source of truth for the facts
                                fed into the chat persona (name, bio,
                                stack, projects, links). Edit this,
                                not api/chat.ts, when your info changes.
api/chat.ts                  -- Vercel serverless function. Builds the
                                system prompt from profile.ts, calls
                                Gemini, returns { reply }.
components/chat/ChatWithIan.tsx -- the floating widget itself.
.env.example                 -- template; copy to .env.local and fill in.
```

### Setup

1. Get a free API key at https://aistudio.google.com/apikey.
2. `cp .env.example .env.local` and paste your key into
   `GEMINI_API_KEY`. **Never commit `.env.local`** -- Vite's default
   `.gitignore` already excludes it, double check yours does too.
3. In your Vercel project's dashboard: Settings → Environment
   Variables → add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) so
   the deployed function has it too. `.env.local` only covers your
   own machine.
4. `npm install gsap lucide-react` and `npm install -D @vercel/node`
   (just for the request/response types in `api/chat.ts` -- it's a
   dev-only dependency, adds nothing to your shipped bundle).

### Local testing needs `vercel dev`, not `vite dev`

Plain `npm run dev` (Vite) only serves the frontend -- it has no idea
what to do with the `api/` folder, so the widget will fail to fetch
locally. To test the whole thing end to end on your machine:

```bash
npm install -g vercel   # one-time
vercel dev
```

`vercel dev` runs both the Vite frontend and the serverless function
together, the same way it'll behave once deployed. If you'd rather
keep using plain `vite dev` day to day, that's fine for everything
else in the project -- just switch to `vercel dev` specifically when
you want to test the chat widget, or test it after pushing to Vercel.

### Model name

`api/chat.ts` defaults to `gemini-2.5-flash`, overridable via the
`GEMINI_MODEL` env var without touching code. Gemini's model lineup
moves fast and Google has been retiring versions on a few months'
notice -- if the default 404s, check
https://ai.google.dev/gemini-api/docs/models for whatever's current
and free-tier-eligible, and set `GEMINI_MODEL` accordingly (no code
change needed).

### What's deliberately simple here

- **Rate limiting**: `api/chat.ts` caps each request to the last 12
  messages and 600 characters per message, which bounds token usage
  and casual abuse, but there's no real per-visitor rate limit --
  serverless functions are stateless between invocations, so that
  needs an external store (Vercel KV, Upstash Redis, etc.) to do
  properly. Fine to skip for a portfolio site with light traffic;
  worth adding if this ever gets meaningful volume.
- **No conversation persistence**: chat history lives in React state
  and disappears on refresh. Intentional -- there's no backend
  database in this project, and adding one just to remember chat
  history for a portfolio widget isn't worth the complexity.
- **Free-tier data use**: Google's free tier terms allow using your
  prompts/outputs to improve their models. Fine for a public portfolio
  chat about your own public info; just don't be surprised by it.

## 10. Five polish requests

1. **Theme-switch animation** -- clicking the toggle now expands a
   circle out from wherever the button sits on screen, using the View
   Transitions API (`document.startViewTransition` in
   `ThemeToggle.tsx`, the actual keyframes in `theme.css` under
   `::view-transition-new(root)`). Browsers without support (or
   people with `prefers-reduced-motion` on) skip straight to the
   plain CSS crossfade that was already on `body` -- widened in this
   pass to cover background/border/color/fill/stroke on every element
   via a universal selector, not just `body` itself, so the fallback
   path is smooth too, not just the fancy one.
2. **Toggle redesign** -- `ThemeToggle.tsx` is now a single icon
   button (no border, no background at rest) that cycles
   light → dark → system on click, showing whichever icon matches the
   *current* theme. Position didn't change -- still top of the
   desktop sidebar and the mobile top bar -- only how it looks and
   behaves.
3. **Hero photo restored** -- the previous version showed a
   placeholder by default and only revealed your real photo on hover,
   which read as a missing/broken photo rather than an interactive
   effect. It's flipped back: your real photo shows immediately,
   `PixelTransition` still fires on hover/tap, now revealing a small
   "now learning" card instead of hiding the photo. Still a portrait
   rectangle (not circular), still on the right on desktop.
4. **"View Projects" removed** from Hero -- projects are reachable
   from the sidebar already, so the extra button was redundant.
5. **Font**: `.btn-primary` and `.link-arrow` (used for every button
   and arrow-link across the site -- Hero's link row, the GitHub
   section's `@ifwian ↗` handle, Projects' `visit site ↗` /
   `more on github`) now use Geist instead of Geist Mono. Hero's
   heading/bio also lost the mono override it had picked up from an
   earlier request, so it's back to Geist. Mobile menu nav labels
   switched from the pixel display font to Geist too.

   **Scoping note**: I did *not* touch the small uppercase "kicker"
   text -- section eyebrows (`01 — home`), `.micro-label`, and
   `.pill` tags -- those stay on Geist Mono. That's a distinct
   secondary register for metadata/labels in the bryl-minimal system,
   not body copy, and removing it would flatten a chunk of the
   existing design language rather than just changing "the font." The
   `mrn.` logotype also stays on the Geist Pixel display font as a
   wordmark, the same way a brand mark commonly differs from body text
   even on single-font sites. If you actually want *everything*
   including those on Geist, say so -- it's a small, contained change,
   I just didn't want to make that call unasked given the "don't
   unnecessarily redesign" instruction.

## 11. Font clarified, animation lag fixed

- **Headings → Geist Pixel, paragraphs → Geist.** Every `<h1>`–`<h6>`
  across the site now uses the pixel display font (one rule in
  `theme.css`, so every section heading picks it up automatically —
  no per-file edits needed). Buttons and arrow-links (`.btn-primary`,
  `.link-arrow`) and the sidebar's nav labels followed the same
  heading/UI-chrome bucket, back onto Geist Pixel. Body copy (`<p>`
  tags, card descriptions, the bio paragraphs) stays on Geist,
  unaffected — that split is the actual distinction between "the
  font" and "content/paragraphs" from your message. The small
  uppercase kicker labels (section eyebrows, `.micro-label`, `.pill`)
  are still on Geist Mono, not Pixel — a pixel font at 9-11px reads as
  noise rather than text, so I kept those on the mono face they were
  already using rather than making them illegible.

  One rendering note with no real fix: Geist Pixel's character set
  doesn't include accented letters, so "Marianne Napaño" will show
  "Napa" and "o" in the pixel font but the "ñ" specifically falls back
  to Geist Mono (the next font in `--font-display`'s stack) for just
  that one glyph. That's the browser's normal per-character
  font-fallback behavior, not a bug -- there's no way to force a
  missing glyph to render in a font that doesn't have it.

- **Animation lag, fixed.** The previous pass had two animations
  running at once in any browser that supports View Transitions: the
  circular reveal *and* a plain CSS color-transition on every element,
  fighting each other every frame -- that's what read as
  stutter/lag. The plain CSS crossfade is now wrapped in
  `@supports not (view-transition-name: none)`, so it only exists at
  all in browsers that *lack* View Transitions support. Anywhere the
  circle reveal actually runs, it's now the only animation happening.
