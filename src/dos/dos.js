/**
 * Dos: a desktop pet for the portfolio.
 * Inspired by oneko.js (originally by adryd), rewritten as a self-contained ES module.
 *
 *   import { initDos } from "./dos.js";
 *   import "./dos.css";
 *   const dos = initDos();      // returns { destroy(), say() }
 *
 * Sprite sheet: oneko layout, 8 x 4 frames of 32 x 32 px (256 x 128).
 * A sheet that is an exact multiple of that size (512 x 256, ...) also works.
 *
 * PLACEMENT RULE (permanent -- do not reintroduce an auto-return):
 * she never walks herself anywhere and never returns to her perch on her own.
 * Click to follow; click again (or let the cursor go idle) and she stops dead
 * where she is and stays there until moved again. No roaming, no "go play"
 * state, no path back to the launcher. `stopInPlace()` is the only way she comes
 * to rest; do not replace it with anything that sets `x`/`y`.
 *
 * The sprite table, and the petting / drag-stretch / shake-wobble / spring-settle
 * / cursor-startle behaviour, are adapted from Vurios/portfolio (`js/kuro.js`),
 * which is itself built on oneko.js by adryd. Their wander mode and perch-restore
 * are deliberately NOT taken, per the placement rule above.
 *
 * oneko.js is released under the MIT License:
 *
 * Copyright (c) 2022 adryd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Markup hooks (all optional):
 *   [data-dos-container]  the element Dos lives inside (falls back to `containerSelector`, then the viewport)
 *   [data-dos-home]       the element she perches on top of (e.g. the chat launcher). Falls back to `corner`.
 *   [data-dos-avoid]      extra elements the speech bubble should not cover
 *   [data-dos-ignore]     elements (or subtrees) the speech bubble may cover
 */

const FRAME = 32; // logical frame size inside the sheet
const SHEET_W = 256; // logical sheet size (8 x 4 frames)
const SHEET_H = 128;
const TICK_MS = 100; // logic tick, same cadence as oneko.js
const ALPHA_MIN = 24; // alpha above this counts as "on the cat" for hit testing
const GRAVITY = 2400; // px/s^2, for the little hop when he is poked or dropped

/**
 * How far above the viewport floor the perch element's bottom edge may sit and
 * still count as the fixed launcher. Generous enough for `bottom-6` plus a
 * safe-area inset, and for the trigger being a little taller than it looks.
 */
const HOME_FLOOR_TOLERANCE = 160;
/** Retries for a perch that has not mounted yet, and the gap between them. */
const HOME_WAIT_TRIES = 20;
const HOME_WAIT_MS = 25;
/**
 * How close counts as "arrived" on the perch, in px. Wider than the old 4px
 * arrival radius so she does not creep the last few pixels one frame at a time,
 * which reads as jitter; she snaps the rest of the way instead.
 */
const HOME_SNAP = 16;

// [column, row] offsets in frames (negative, like oneko.js background-position values)
const SPRITES = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]], // paws up: also the "hanging" pose while he is carried
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

const WALL_FOR_SIDE = { l: "scratchWallW", r: "scratchWallE", t: "scratchWallN", b: "scratchWallS" };

const DEFAULTS = {
  spriteUrl: "/assets/kuro/jess.png",
  /** CSS selector (or Element) for the content column Dos lives in. null = viewport. */
  containerSelector: "main",
  scale: 2,
  /** Run speed in CSS px per second. */
  speed: 130,
  /** How close Dos stops to the cursor, in CSS px. */
  stopDistance: 64,
  /** Gap kept between Dos and the corner he rests in (idle-only mode). */
  edgeInset: 0,
  /** Fallback resting spot, used when there is no [data-dos-home] element. */
  corner: "bottom-left",
  /** The element she perches on top of, and goes back to for naps. */
  homeSelector: "[data-dos-home]",
  /** How far her feet sink into the top of that element, in px. */
  perchOffset: 4,
  /** Min and max ticks (100 ms each) she sits idle between idle animations. */
  restEvery: [20, 70],
  /** After a click she follows the cursor; this many ms of a still cursor and she is placed back on the perch. 0 = never. */
  followTimeout: 20000,
  /** How quickly he flies up to the hand when picked up. Higher = snappier, lower = floatier. */
  dragFollow: 14,
  /** Chance per 100 ms tick that an idle animation (nap, scratch) starts once he has been idle for a second. */
  idleChance: 1 / 150,
  /** Relative odds of each idle animation. 0 switches one off (e.g. { sleeping: 0 } = never naps). */
  idleWeights: { sleeping: 1, scratchSelf: 1, wall: 1 },
  /** How long a nap lasts, in 100 ms ticks (192 = about 19 s). */
  sleepLength: 192,
  /** Chance per tick of clawing the wall when the cursor is on the other side of it. */
  wallChance: 0.1,
  /** Min and max ticks between rotating speech bubbles (130-240 = every 13-24 s). */
  sayEvery: [130, 240],
  /** How long a rotating speech bubble stays up, in ticks (38 = about 4 s). */
  sayDuration: 38,
  /** Matching viewports get idle-only Dos (no chasing, no dragging). */
  idleOnlyQuery: "(max-width: 767px), (hover: none)",
  zIndex: null,
  bubble: true,
  avoidSelector:
    'h1,h2,h3,h4,h5,h6,p,li,a,button,input,textarea,select,label,img,video,canvas,figcaption,blockquote,pre,summary,[role="button"],[data-dos-avoid]',
  greeting: "mrrp. i'm Dos!",
  messages: [
    "mrrp?",
    "psst... the projects are down there",
    "hire my human :3",
    "i am 90% fur",
    "scroll, hooman",
    "meow (that means hi)",
    "click me and i'll follow you",
    "Dos on duty.",
    "please don't unplug me",
  ],
  followMessages: ["ok! following you", "lead the way!", "i'm coming!", "walkies?"],
  // Said when a click turns following off. She goes back to her perch, so these
  // must not promise roaming she no longer does.
  stayMessages: ["ok, back to my spot", "home i go", "right where i was"],
  // Said when the cursor goes idle long enough and she gives up following.
  boredMessages: ["...you got boring", "back to the button then", "enough. bye~"],
  grabMessages: ["put me down!", "mmmf!", "hanging in there", "nyaaa~"],
  releaseMessages: ["thud.", "ow. rude.", "...again?"],
  wakeMessages: ["...huh?", "i was NOT sleeping", "mrrp?"],
  sleepMessages: ["zzz...", "zZz", "5 more minutes..."],
  /** Said when the cursor rests on her long enough to pet her. */
  petMessages: ["purr...", "*purr*", "mmrrp~", "...yes. right there."],
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function pickWeighted(items) {
  const total = items.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const [value, w] of items) {
    r -= Math.max(0, w);
    if (r < 0) return value;
  }
  return items[items.length - 1][0];
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initDos(userOptions = {}) {
  const opts = { ...DEFAULTS, ...userOptions };
  const weights = { ...DEFAULTS.idleWeights, ...(userOptions.idleWeights || {}) };
  const inert = { destroy() {}, say() {} };

  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) return inert;

  // Accessibility: no animated pet for people who asked for less motion.
  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMq.matches) return inert;
  if (document.querySelector(".dos")) return inert; // already mounted

  const S = FRAME * opts.scale; // on-screen sprite size
  const HOLD_Y = S * 0.36; // while carried, the cursor holds him by the paws near the top of the sprite
  const ac = new AbortController();
  const on = (target, type, fn, o = {}) => target.addEventListener(type, fn, { ...o, signal: ac.signal });

  // ---------------------------------------------------------------- DOM
  const root = document.createElement("div");
  root.className = "dos";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.style.setProperty("--dos-size", `${S}px`);
  if (opts.zIndex != null) root.style.zIndex = String(opts.zIndex);
  const sprite = document.createElement("div");
  sprite.className = "dos__sprite";
  const bubble = document.createElement("div");
  bubble.className = "dos__bubble";
  root.append(sprite, bubble);
  document.body.append(root);

  // ---------------------------------------------------------------- state
  let destroyed = false;
  let started = false;
  let raf = 0;
  let restTimer = 0;
  let last = 0;
  let acc = 0;

  let x = 0; // sprite centre, viewport px
  let y = 0;
  let running = false;
  let frameCount = 0;
  let idleTime = 0;
  let idleAnim = null;
  let idleAnimFrame = 0;
  let cur = SPRITES.idle[0];
  let isHop = false;

  const pointer = { x: 0, y: 0, active: false, t: 0, vx: 0, vy: 0 };
  let drag = null;
  let hot = false;
  const hop = { y: 0, vy: 0 }; // vertical offset (px, negative = up) of the poke / drop hop
  let hopApplied = false;

  // ---- ported from Vurios/portfolio js/kuro.js (oneko.js, MIT) --------------
  // Petting, drag stretch, shake wobble, spring settle and cursor startle.
  // Wander mode and the perch-restore from that file are deliberately NOT
  // ported: she must not roam or auto-return (see the placement rule above).
  let petTicks = 0; // eyes-closed "content" pose after being petted
  let petAt = -Infinity; // performance.now() of the last pet, for the cooldown
  let hoverMs = 0; // cursor rested on her opaque pixels for this long
  let startleAt = 0; // last cursor-flick startle
  let settling = false; // the spring-back loop after a drop is running
  let stretchApplied = false; // whether a stretch transform is currently on the sprite
  // Squash / stretch while carried, and the damped spring back to rest on drop.
  const stretch = { sx: 1, sy: 1, skew: 0, vsx: 0, vsy: 0, vskew: 0 };
  const HELD_WOBBLE = 900; // ms a shake wobble lasts
  const STARTLE_COOLDOWN = 3000; // ms before another flick can startle her
  const PET_COOLDOWN = 5000;
  const PET_HOLD_MS = 1200; // cursor rested on her this long = a pet

  let container = null;
  let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, real: { l: true, r: true, t: true, b: true } };

  let alpha = null; // RGBA pixels of the sheet, for hit testing
  let sheetW = SHEET_W;
  let sheetH = SHEET_H;

  let bubbleTicks = 0;
  let bubbleChoice = -1;
  let nextSayIn = 30;
  let pendingGreeting = opts.greeting;
  let bag = [];

  // Following + perching. She picks no destinations of her own any more: idle
  // means parked on `home`, and the only movement she does is chasing the cursor
  // after a click.
  let following = false; // only true after she has been clicked
  let wallGoal = null; // wall she walked to on purpose, to scratch
  let restTicks = rand(15, 40);
  let home = null; // { x, y }: where she perches, or null
  let homeEl = null;
  let reach = bounds; // bounds she may stand in: the column plus her perch

  const modeMq = opts.idleOnlyQuery ? window.matchMedia(opts.idleOnlyQuery) : null;
  let idleOnly = !!(modeMq && modeMq.matches);

  // ---------------------------------------------------------------- geometry
  function resolveContainer() {
    const c = opts.containerSelector;
    container =
      document.querySelector("[data-dos-container]") ||
      (typeof c === "string" ? document.querySelector(c) : c instanceof Element ? c : null);
  }

  function resolveHome() {
    homeEl = opts.homeSelector ? document.querySelector(opts.homeSelector) : null;
  }

  /** The point her feet rest on top of the home element. Null when it is missing or off screen. */
  function refreshHome() {
    home = null;
    if (!homeEl || !homeEl.isConnected) return;
    const r = homeEl.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const h = S / 2;
    // The perch is the floating launcher, which is `fixed` to the bottom of the
    // viewport. If the rect puts its bottom edge far above the floor, the styles
    // have not settled yet and the read is handing back the button's in-flow
    // document position -- near the top of the page. Accepting that is what used
    // to park her along the top edge instead of on the button, so treat it as
    // "not rendered yet" and let the caller wait or fall back.
    if (vh - r.bottom > HOME_FLOOR_TOLERANCE) return;
    const hx = clamp(r.left + r.width / 2, h, Math.max(h, vw - h));
    // Her feet sit `perchOffset` px into the element's top edge, so her centre is
    // one half-sprite above it. Clamped into a reachable band rather than rejected:
    // this can never yield y = 0, however early the rect was read.
    const hy = clamp(r.top + opts.perchOffset - h, h, Math.max(h, vh - h));
    home = { x: hx, y: hy };
  }

  /** True while she is standing on the perch, using the arrival threshold so this
   *  agrees with when the walk home is considered finished. */
  function atHome() {
    return !!home && Math.hypot(x - home.x, y - home.y) <= HOME_SNAP;
  }

  function refreshBounds() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let l = 0;
    let t = 0;
    let r = vw;
    let b = vh;
    const real = { l: true, r: true, t: true, b: true };

    if (container && container.isConnected) {
      const rc = container.getBoundingClientRect();
      const il = Math.max(0, rc.left);
      const it = Math.max(0, rc.top);
      const ir = Math.min(vw, rc.right);
      const ib = Math.min(vh, rc.bottom);
      // Only use the column if enough of it is on screen; otherwise fall back to the viewport.
      if (ir - il >= S && ib - it >= S) {
        l = il;
        t = it;
        r = ir;
        b = ib;
        // An edge counts as a wall only if it is the column's own edge, not the screen clipping it.
        real.l = rc.left >= 0;
        real.t = rc.top >= 0;
        real.r = rc.right <= vw;
        real.b = rc.bottom <= vh;
      }
    }
    const h = S / 2;
    bounds = {
      minX: l + h,
      maxX: Math.max(l + h, r - h),
      minY: t + h,
      maxY: Math.max(t + h, b - h),
      real,
    };
    refreshHome();
    // She may also stand on her perch, even when it sits outside the column (e.g. over the sidebar).
    reach = home
      ? {
          minX: Math.min(bounds.minX, home.x),
          maxX: Math.max(bounds.maxX, home.x),
          minY: Math.min(bounds.minY, home.y),
          maxY: Math.max(bounds.maxY, home.y),
          real: bounds.real,
        }
      : bounds;
  }

  function cornerPosition() {
    const left = opts.corner.includes("left");
    const top = opts.corner.includes("top");
    return {
      x: left ? bounds.minX + opts.edgeInset : bounds.maxX - opts.edgeInset,
      y: top ? bounds.minY + opts.edgeInset : bounds.maxY - opts.edgeInset,
    };
  }

  /** Where she rests: on top of the home element, or in the fallback corner. */
  function restPosition() {
    return home || cornerPosition();
  }

  function clampToBounds() {
    // `reach` is where she may stand, but it is not the last word: the perch
    // (`home`) is resolved against the viewport, so a stale home point or a
    // mid-frame layout shift could otherwise sit outside it. The viewport
    // clamp underneath guarantees half a sprite of margin on every side, which
    // is what keeps her from being clipped at the edge of the screen.
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const h = S / 2;
    x = clamp(x, Math.max(reach.minX, h), Math.min(reach.maxX, vw - h));
    y = clamp(y, Math.max(reach.minY, h), Math.min(reach.maxY, vh - h));
  }

  // ---------------------------------------------------------------- sprite + hit testing
  function setSprite(name, frame = 0) {
    const set = SPRITES[name];
    cur = set[frame % set.length];
    sprite.style.backgroundPosition = `${cur[0] * FRAME * opts.scale}px ${cur[1] * FRAME * opts.scale}px`;
    const alertPose = name === "alert";
    if (alertPose !== isHop) {
      isHop = alertPose;
      sprite.classList.toggle("is-alert", alertPose);
    }
  }

  function alphaAt(u, v) {
    // u, v: logical px inside the current frame
    if (!alpha) return 255;
    const k = sheetW / SHEET_W;
    const px = Math.floor((-cur[0] * FRAME + u) * k);
    const py = Math.floor((-cur[1] * FRAME + v) * k);
    if (px < 0 || py < 0 || px >= sheetW || py >= sheetH) return 0;
    return alpha[(py * sheetW + px) * 4 + 3];
  }

  /** True when the viewport point is on an opaque pixel of the cat. */
  function hitTest(px, py) {
    if (!started) return false;
    const lx = px - x + S / 2;
    const ly = py - (y + hop.y) + S / 2;
    if (lx < 0 || ly < 0 || lx >= S || ly >= S) return false;
    return alphaAt(lx / opts.scale, ly / opts.scale) > ALPHA_MIN;
  }

  function setHot(v) {
    if (v === hot) return;
    hot = v;
    sprite.classList.toggle("is-hot", v);
  }

  // ---------------------------------------------------------------- speech bubble
  function nextMessage() {
    if (!opts.messages.length) return "";
    if (!bag.length) bag = shuffle(opts.messages);
    return bag.pop();
  }

  function collectObstacles() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const out = [];
    document.querySelectorAll(opts.avoidSelector).forEach((node) => {
      if (root.contains(node) || node.closest("[data-dos-ignore]")) return;
      const r = node.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return;
      out.push(r);
    });
    return out;
  }

  const overlap = (l, t, w, h, r) =>
    Math.max(0, Math.min(l + w, r.right) - Math.max(l, r.left)) *
    Math.max(0, Math.min(t + h, r.bottom) - Math.max(t, r.top));

  function placeBubble(force) {
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    if (!bw || !bh) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const left0 = Math.round(x - S / 2);
    const top0 = Math.round(y - S / 2);
    const cx = left0 + S / 2;
    const cy = top0 + S / 2;
    const gap = 10; // room for the tail
    const pad = 8;

    // [side, left, top], in order of preference
    const candidates = [
      ["top", cx - bw / 2, top0 - bh - gap],
      ["top", left0 + S - bw, top0 - bh - gap],
      ["top", left0, top0 - bh - gap],
      ["right", left0 + S + gap, cy - bh / 2],
      ["left", left0 - bw - gap, cy - bh / 2],
      ["bottom", cx - bw / 2, top0 + S + gap],
      ["bottom", left0 + S - bw, top0 + S + gap],
      ["bottom", left0, top0 + S + gap],
    ];

    const obstacles = collectObstacles();
    let best = null;
    let current = null;
    candidates.forEach(([side, l, t], i) => {
      const cl = clamp(l, pad, vw - bw - pad);
      const ct = clamp(t, pad, vh - bh - pad);
      let score = (Math.abs(cl - l) + Math.abs(ct - t)) * 60 + i * 40;
      for (const r of obstacles) score += overlap(cl, ct, bw, bh, r);
      const c = { i, side, l: cl, t: ct, score };
      if (!best || score < best.score) best = c;
      if (i === bubbleChoice) current = c;
    });

    // Hysteresis: keep the current spot unless another one is clearly better.
    const chosen = !force && current && current.score - best.score < 600 ? current : best;
    bubbleChoice = chosen.i;
    bubble.style.left = `${chosen.l - left0}px`;
    bubble.style.top = `${chosen.t - top0}px`;
    bubble.dataset.side = chosen.side;
    const vertical = chosen.side === "top" || chosen.side === "bottom";
    const tail = vertical ? clamp(cx - chosen.l, 14, bw - 14) : clamp(cy - chosen.t, 12, bh - 12);
    bubble.style.setProperty("--dos-tail", `${tail}px`);
  }

  function say(text, ticks = 38) {
    if (!opts.bubble || !started || !text) return;
    bubble.textContent = text;
    bubbleTicks = ticks;
    bubble.classList.add("is-visible");
    placeBubble(true);
  }

  function hideBubble() {
    bubbleTicks = 0;
    bubbleChoice = -1;
    bubble.classList.remove("is-visible");
  }

  // ---------------------------------------------------------------- behaviour (one tick = 100 ms)
  /** What she is walking toward right now: the cursor (only after a click), or the perch. */
  function computeTarget() {
    if (idleOnly) return null;
    if (following) {
      if (!pointer.active) return null;
      const b = bounds;
      const outside =
        pointer.x < b.minX ? "l" : pointer.x > b.maxX ? "r" : pointer.y < b.minY ? "t" : pointer.y > b.maxY ? "b" : null;
      return {
        kind: "follow",
        x: clamp(pointer.x, b.minX, b.maxX),
        y: clamp(pointer.y, b.minY, b.maxY),
        outside, // cursor is beyond the column: run to that wall instead of stopping short
        stop: outside ? 3 : opts.stopDistance,
        speed: opts.speed,
      };
    }
    // No walking target at all: when she is not following she stands still where she
    // was left, so there is nothing for her to travel towards.
    return null;
  }

  function setFollowing(v) {
    if (following === v) return;
    following = v;
    resetIdle();
    idleTime = v ? 6 : 0; // starting: show the alert pose first
    restTicks = rand(opts.restEvery[0], opts.restEvery[1]);
    if (v) pointer.t = performance.now();
    // Follow is over (a click, or the cursor going idle). She stops wherever she
    // happens to be -- no walk, no snap, no path back to the button.
    else stopInPlace();
  }

  /**
 * Stops her dead where she stands.
 *
 * Clears every piece of movement state without touching `x`/`y`, so a click that
 * ends follow, or a drag release, leaves her on the spot. Nothing here walks,
 * snaps or teleports her anywhere: once she is placed she stays where the
 * visitor put her until they move her again.
 */
  function stopInPlace() {
    hop.y = 0; // the drop/poke hop is the only velocity here
    hop.vy = 0;
    wallGoal = null;
    running = false; // movement flag off, whatever she was doing before
    resetIdle(); // no half-finished nap or scratch carried into the stop
    idleTime = 0;
    setSprite("idle", 0);
  }

  function hopActive() {
    return hop.y !== 0 || hop.vy !== 0;
  }

  /** Clears the current idle animation. Returns true if Dos was properly asleep. */
  function resetIdle() {
    const wasAsleep = idleAnim === "sleeping" && idleAnimFrame > 8;
    idleAnim = null;
    idleAnimFrame = 0;
    return wasAsleep;
  }

  function wallsAvailable() {
    const e = opts.edgeInset + 3;
    const b = bounds;
    const walls = [];
    if (b.real.l && x - b.minX < e) walls.push("scratchWallW");
    if (b.real.t && y - b.minY < e) walls.push("scratchWallN");
    if (b.real.r && b.maxX - x < e) walls.push("scratchWallE");
    if (b.real.b && b.maxY - y < e) walls.push("scratchWallS");
    return walls;
  }

  function idleTick(target) {
    running = false;
    idleTime++;

    // Being petted: eyes closed, content, for a beat (ported from kuro.js).
    if (petTicks > 0) {
      petTicks -= 1;
      setSprite("tired", 0);
      return;
    }

    // She walked to a wall on purpose: scratch it.
    if (!idleAnim && wallGoal && idleTime > 2) {
      if (wallsAvailable().includes(wallGoal)) idleAnim = wallGoal;
      wallGoal = null;
    }

    if (!idleAnim && idleTime > 10) {
      const walls = wallsAvailable();
      const wanted = target && target.outside ? WALL_FOR_SIDE[target.outside] : null;
      const onPerch = atHome();
      if (wanted && walls.includes(wanted)) {
        if (Math.random() < opts.wallChance) idleAnim = wanted; // cursor is on the other side of the wall
      } else if (Math.random() < opts.idleChance * (onPerch ? 4 : 1)) {
        // She naps on her perch (or when she is idle-only / following), not in the middle of the page.
        const canSleep = idleOnly || following || onPerch;
        idleAnim = pickWeighted([
          ["sleeping", canSleep ? weights.sleeping * (onPerch ? 3 : 1) : 0],
          ["scratchSelf", weights.scratchSelf],
          ...walls.map((w) => [w, weights.wall]),
        ]);
      }
    }

    switch (idleAnim) {
      case "sleeping":
        if (idleAnimFrame < 8) {
          setSprite("tired", 0);
        } else {
          if (idleAnimFrame === 8) say(pick(opts.sleepMessages), 30);
          setSprite("sleeping", Math.floor(idleAnimFrame / 4));
        }
        if (idleAnimFrame > opts.sleepLength) resetIdle();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnim, idleAnimFrame);
        if (idleAnimFrame > 9) resetIdle();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimFrame++;
  }

  function tick() {
    frameCount++;

    if (frameCount % 20 === 0) {
      if (!container || !container.isConnected) resolveContainer();
      if (!homeEl || !homeEl.isConnected) resolveHome();
    }

    // She is either following the cursor or sitting still where she was left. Nothing
    // pulls her back to the perch: free placement means she stays put until the
    // visitor moves her, clicks her, or drags her.

    // A still cursor for long enough: she gets bored of following and goes home.
    if (following && opts.followTimeout > 0 && performance.now() - pointer.t > opts.followTimeout) {
      setFollowing(false);
      say(pick(opts.boredMessages), 28);
    }

    if (bubbleTicks > 0) {
      bubbleTicks--;
      if (bubbleTicks === 0) hideBubble();
      else if (frameCount % 4 === 0) placeBubble(false);
    }

    // Being carried: dangle by the paws. After a drop or poke: startled while he hops.
    if (drag || hopActive()) {
      running = false;
      idleTime = 0;
      resetIdle();
      if (drag) setSprite("scratchWallN", Math.floor(frameCount / 2));
      else setSprite("alert", 0);
      return;
    }

    // Rotating speech bubble. She chats while perched or resting, but not while asleep.
    if (bubbleTicks === 0 && idleAnim !== "sleeping" && --nextSayIn <= 0) {
      say(pendingGreeting || nextMessage(), opts.sayDuration);
      pendingGreeting = null;
      nextSayIn = rand(opts.sayEvery[0], opts.sayEvery[1]);
    }

    const target = computeTarget();
    if (!target) {
      idleTick(null);
      return;
    }

    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= target.stop) {
      idleTick(target);
      return;
    }

    if (resetIdle()) say(pick(opts.wakeMessages), 24);

    // Alert pose before bolting off after the cursor, like oneko. The walk home needs no warning.
    if (target.kind === "follow" && idleTime > 1) {
      running = false;
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7) - 1;
      return;
    }

    if (target.kind !== "follow") idleTime = 0;
    running = true;
    let dir = "";
    dir += dy / dist > 0.5 ? "N" : "";
    dir += dy / dist < -0.5 ? "S" : "";
    dir += dx / dist > 0.5 ? "W" : "";
    dir += dx / dist < -0.5 ? "E" : "";
    setSprite(dir || "idle", frameCount);
  }

  function move(dt) {
    if (!running || drag) return;
    const target = computeTarget();
    if (!target) return;
    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.hypot(dx, dy);
    const gap = dist - target.stop;
    if (gap <= 0) return;
    const step = Math.min((target.speed || opts.speed) * dt, gap);
    x += (dx / dist) * step;
    y += (dy / dist) * step;
    clampToBounds();
  }

  // --------------------------------------- petting, stretch & settle ----
  // Ported from Vurios/portfolio `js/kuro.js` (oneko.js, MIT -- notice kept at
  // the top of this file). Wander mode and the perch-restore are not ported.
  function applyStretch() {
    stretchApplied = true;
  }

  /** A cursor rested on one of her opaque pixels for long enough. */
  function pet() {
    if (performance.now() - petAt < PET_COOLDOWN) return;
    petAt = performance.now();
    hoverMs = 0;
    resetIdle();
    petTicks = 16;
    say(pick(opts.petMessages), 1800);
    for (let i = 0; i < 4; i++) window.setTimeout(spawnHeart, i * 180);
  }

  /** Little hearts drifting up out of her. */
  function spawnHeart() {
    if (destroyed) return;
    const span = document.createElement("span");
    span.className = "dos-heart";
    span.setAttribute("aria-hidden", "true");
    const left = Math.round(clamp(x + (Math.random() * 2 - 1) * S * 0.35, 0, window.innerWidth - 12));
    const top = Math.round(y - S / 2 - 6);
    span.style.left = `${left}px`;
    span.style.top = `${top}px`;
    document.body.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  }

  /** The cursor flicked fast past her: a startled hop. */
  function maybeStartle() {
    if (following || running || performance.now() - startleAt < STARTLE_COOLDOWN) return;
    const vx = pointer.vx;
    const vy = pointer.vy;
    if (Math.hypot(vx, vy) < 45) return;
    if (Math.hypot(pointer.x - x, pointer.y - y) > 130) return;
    startleAt = performance.now();
    resetIdle();
    petTicks = 0;
    hop.vy = -420;
    setSprite("alert", 0);
  }

  /** Called every frame from the main loop; decides whether she is being petted. */
  function checkPetting(dt) {
    if (idleOnly || drag || !pointer.active) {
      hoverMs = 0;
      return;
    }
    const still = performance.now() - pointer.t > 80 || Math.hypot(pointer.vx, pointer.vy) < 6;
    if (still && hitTest(pointer.x, pointer.y)) {
      hoverMs += dt * 1000;
      if (hoverMs > PET_HOLD_MS) pet();
    } else {
      hoverMs = 0;
    }
  }

  // ---------------------------------------------------------------- hop (poke / drop)
  function stepHop(dt) {
    if (!hopActive()) return;
    hop.vy += GRAVITY * dt;
    hop.y += hop.vy * dt;
    if (hop.y >= 0) {
      // landed: one small bounce, then rest
      hop.y = 0;
      hop.vy = hop.vy > 160 ? -hop.vy * 0.3 : 0;
    }
  }

  function applyHop() {
    // The stretch (skew/scale) and the hop (translateY) both want the sprite's
    // `transform`, so they are composed here rather than overwriting each other.
    const parts = [];
    if (hop.y !== 0) parts.push(`translateY(${hop.y.toFixed(1)}px)`);
    if (stretchApplied) parts.push(`skewX(${stretch.skew.toFixed(2)}deg) scale(${stretch.sx.toFixed(3)}, ${stretch.sy.toFixed(3)})`);
    if (parts.length === 0) {
      if (hopApplied) {
        sprite.style.transform = "";
        hopApplied = false;
      }
      return;
    }
    sprite.style.transform = parts.join(" ");
    hopApplied = true;
  }

  // ---------------------------------------------------------------- pointer input
  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    // Smoothed cursor velocity, used for the flick-startle and to tell "resting
    // on her" apart from "passing over". Same damping as kuro.js.
    const now = performance.now();
    const dt = Math.max(1, now - pointer.t);
    if (pointer.active) {
      pointer.vx = pointer.vx * 0.5 + ((e.clientX - pointer.x) / dt) * 16 * 0.5;
      pointer.vy = pointer.vy * 0.5 + ((e.clientY - pointer.y) / dt) * 16 * 0.5;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.t = now;
    if (drag) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
    } else {
      setHot(!idleOnly && hitTest(e.clientX, e.clientY)); // only catch clicks that land on cat pixels
      if (!idleOnly && !drag) maybeStartle();
    }
  }

  function onPointerDown(e) {
    if (idleOnly || drag || e.button !== 0 || e.pointerType === "touch") return;
    if (!hitTest(e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation(); // the click belongs to the cat, not to whatever is underneath
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    setHot(true);
    try {
      sprite.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, dragging still works without it */
    }
    drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      moved: false,
      // For the stretch/shake port: last position and time, smoothed velocity,
      // and a counter of quick left-right reversals (three in a row = a wobble).
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
      flips: 0,
      sign: 0,
      flipAt: 0,
      wobbleUntil: 0,
      frame: 0,
      frameAt: 0,
    };
    running = false; // a chase in progress must not tug against the hand
    wallGoal = null;
    hop.y = 0;
    hop.vy = 0;
    resetIdle();
    idleTime = 0;
    petTicks = 0;
    setSprite("scratchWallN", 0); // picked up: dangle by the paws straight away
    sprite.classList.add("is-dragging");
    document.documentElement.classList.add("dos-dragging");
    if (Math.random() < 0.6) say(pick(opts.grabMessages), 28);
  }

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    sprite.classList.remove("is-dragging");
    document.documentElement.classList.remove("dos-dragging");
    try {
      sprite.releasePointerCapture(d.id);
    } catch {
      /* already released */
    }
    if (!d.moved && performance.now() - d.t0 < 400) {
      // A quick click toggles between exactly two states: still where she was
      // left (idle, napping, talking) and following the cursor. Turning follow
      // off stops her on the spot; turning it on gives her a hop and she goes.
      if (following) {
        setFollowing(false); // stopInPlace cancels the hop, so she stays put
        say(pick(opts.stayMessages), 28);
      } else {
        hop.vy = -420;
        setFollowing(true);
        say(pick(opts.followMessages), 28);
      }
    } else {
      // Dropped somewhere: she settles on the spot with a springy squash-and-
      // bounce back to rest, and stays wherever she was left. `stopInPlace`
      // clears the movement flag, the wall goal and the hop velocity; free
      // placement is preserved, she does not walk back anywhere.
      settling = true;
      stretch.vsx = stretch.vsy = stretch.vskew = 0;
      idleTime = 0;
      if (!following) stopInPlace();
      if (Math.random() < 0.6) say(pick(opts.releaseMessages), 24);
    }
    setHot(hitTest(pointer.x, pointer.y));
  }

  function onModeChange() {
    idleOnly = !!(modeMq && modeMq.matches);
    if (idleOnly) {
      endDrag();
      setHot(false);
      pointer.active = false;
      following = false;
      wallGoal = null;
    }
  }

  // ---------------------------------------------------------------- main loop
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    refreshBounds();
    if (idleOnly) {
      const c = restPosition();
      x = c.x;
      y = c.y;
    } else {
      if (drag) {
        // Carried: he flies up to the cursor and hangs from it by the paws.
        const f = 1 - Math.exp(-dt * opts.dragFollow);
        x += (pointer.x - x) * f;
        y += (pointer.y + HOLD_Y - y) * f;
        // Stretch toward the hand and wobble when shaken (ported from kuro.js).
        const d = drag;
        const el = Math.max(1, now - d.lastT);
        d.vx = d.vx * 0.6 + ((pointer.x - d.lastX) / el) * 16 * 0.4;
        d.vy = d.vy * 0.6 + ((pointer.y - d.lastY) / el) * 16 * 0.4;
        d.lastX = pointer.x;
        d.lastY = pointer.y;
        d.lastT = now;
        const sign = d.vx > 5 ? 1 : d.vx < -5 ? -1 : 0;
        if (sign && sign !== d.sign) {
          d.flips = d.sign && now - d.flipAt < 240 ? d.flips + 1 : 0;
          d.sign = sign;
          d.flipAt = now;
          if (d.flips >= 3) {
            d.wobbleUntil = now + HELD_WOBBLE;
            d.flips = 0;
          }
        }
        if (el > 60) {
          d.vx *= 0.85;
          d.vy *= 0.85;
        }
        const s = Math.min(0.55, Math.hypot(d.vx, d.vy) / 55);
        stretch.sy += (1 + 0.08 + s - stretch.sy) * 0.3;
        stretch.sx += (1 - s * 0.45 - stretch.sx) * 0.3;
        let skewTarget = Math.max(-16, Math.min(16, -d.vx * 1.4));
        if (d.wobbleUntil > now) skewTarget += Math.sin(now / 45) * 14 * ((d.wobbleUntil - now) / HELD_WOBBLE);
        stretch.skew += (skewTarget - stretch.skew) * 0.3;
        applyStretch();
        if (now - d.frameAt > 140) {
          d.frameAt = now;
          d.frame += 1;
          setSprite("scratchWallN", d.frame);
        }
      } else if (!settling) {
        // Back at rest: return the sprite to a plain, unstretched frame.
        stretch.vsx = stretch.vsy = stretch.vskew = 0;
        stretch.sx += (1 - stretch.sx) * 0.3;
        stretch.sy += (1 - stretch.sy) * 0.3;
        stretch.skew += (0 - stretch.skew) * 0.3;
        applyRestTransform();
      }
      clampToBounds();
    }

    acc += dt * 1000;
    while (acc >= TICK_MS) {
      acc -= TICK_MS;
      tick();
    }

    if (!idleOnly) {
      move(dt);
      clampToBounds();
    }

    if (settling) stepSettle();
    checkPetting(dt);
    stepHop(dt);
    applyHop();
    root.style.transform = `translate3d(${Math.round(x - S / 2)}px, ${Math.round(y - S / 2)}px, 0)`;
  }

  /** Clears the stretch/skew once it has visually converged, so the hop offset can own the transform. */
  function applyRestTransform() {
    const done =
      Math.abs(stretch.sx - 1) < 0.004 &&
      Math.abs(stretch.sy - 1) < 0.004 &&
      Math.abs(stretch.skew) < 0.2;
    if (done && (stretchApplied || stretch.skew !== 0)) {
      stretch.sx = stretch.sy = 1;
      stretch.skew = 0;
      stretchApplied = false;
    }
  }

  /** Damped spring back to rest after a drop: a squash-and-bounce settle. */
  function stepSettle() {
    const k = 0.2;
    const damp = 0.72;
    stretch.vsx = (stretch.vsx + (1 - stretch.sx) * k) * damp;
    stretch.vsy = (stretch.vsy + (1 - stretch.sy) * k) * damp;
    stretch.vskew = (stretch.vskew + (0 - stretch.skew) * k) * damp;
    stretch.sx += stretch.vsx;
    stretch.sy += stretch.vsy;
    stretch.skew += stretch.vskew;
    applyStretch();
    if (
      Math.abs(stretch.sx - 1) < 0.004 &&
      Math.abs(stretch.sy - 1) < 0.004 &&
      Math.abs(stretch.skew) < 0.2 &&
      Math.abs(stretch.vsy) < 0.004
    ) {
      stretch.sx = stretch.sy = 1;
      stretch.skew = 0;
      stretchApplied = false;
      settling = false;
    }
  }

  /**
   * Puts her at rest and only then reveals her.
   *
   * `x` and `y` both start at 0, which is the top-left of the viewport, so
   * anything that un-hides the root before a real position is chosen puts her
   * visibly in the corner. The launcher is mounted by the chat widget, so on a
   * cold load `[data-dos-home]` can legitimately not be there on the first read:
   * retry briefly, and only fall back to the corner once it is clear the perch
   * is not coming.
   */
  function placeAtRest(attempt) {
    if (destroyed) return;
    resolveHome();
    refreshBounds();
    if (home) {
      x = home.x;
      y = home.y;
    } else if (attempt < HOME_WAIT_TRIES) {
      restTimer = setTimeout(() => placeAtRest(attempt + 1), HOME_WAIT_MS);
      return;
    } else {
      const c = cornerPosition();
      x = c.x;
      y = c.y;
    }
    clampToBounds();
    setSprite("idle", 0);
    started = true;
    root.hidden = false;
    root.style.transform = `translate3d(${Math.round(x - S / 2)}px, ${Math.round(y - S / 2)}px, 0)`;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed) return;
    resolveContainer();
    placeAtRest(0);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    clearTimeout(restTimer);
    ac.abort();
    document.documentElement.classList.remove("dos-dragging");
    root.remove();
  }

  // ---------------------------------------------------------------- wiring
  on(window, "pointermove", onPointerMove, { passive: true });
  on(window, "pointerdown", onPointerDown, { capture: true });
  on(window, "pointerup", endDrag);
  on(window, "pointercancel", endDrag);
  on(window, "blur", () => endDrag());
  on(document.documentElement, "mouseleave", () => {
    pointer.active = false;
    if (!drag) setHot(false);
  });
  if (modeMq) on(modeMq, "change", onModeChange);
  on(reduceMq, "change", (e) => {
    if (e.matches) destroy(); // user switched on reduced motion while the page was open
  });

  // Load the sheet, build the hit-test mask from its alpha channel, then start.
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    if (destroyed) return;
    sheetW = img.naturalWidth;
    sheetH = img.naturalHeight;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = sheetW;
      canvas.height = sheetH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      alpha = ctx.getImageData(0, 0, sheetW, sheetH).data;
    } catch {
      alpha = null; // tainted canvas (cross-origin sheet): fall back to the sprite's bounding box
    }
    sprite.style.backgroundImage = `url(${JSON.stringify(opts.spriteUrl)})`;
    sprite.style.backgroundSize = `${SHEET_W * opts.scale}px ${SHEET_H * opts.scale}px`;
    start();
  };
  img.onerror = () => {
    console.warn("[dos] could not load the sprite sheet:", opts.spriteUrl);
    destroy();
  };
  img.src = opts.spriteUrl;

  return { destroy, say };
}
