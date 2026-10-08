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
 * Markup hooks (all optional):
 *   [data-dos-container]  the element Dos lives inside (falls back to `containerSelector`, then the viewport)
 *   [data-dos-avoid]      extra elements the speech bubble should not cover
 *   [data-dos-ignore]     elements (or subtrees) the speech bubble may cover
 */

const FRAME = 32; // logical frame size inside the sheet
const SHEET_W = 256; // logical sheet size (8 x 4 frames)
const SHEET_H = 128;
const TICK_MS = 100; // logic tick, same cadence as oneko.js
const ALPHA_MIN = 24; // alpha above this counts as "on the cat" for hit testing
const GRAVITY = 2400; // px/s^2, for the little hop when he is poked or dropped

// [column, row] offsets in frames (negative, like oneko.js background-position values)
const SPRITES = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]], // paws up: also the "hanging" pose while he is carried
  scratchWallS: [[-7, -1], [-6, -1]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -2]],
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
  /** Where he starts, and where he sits in idle-only mode. */
  corner: "bottom-left",
  /** How quickly he flies up to the hand when picked up. Higher = snappier, lower = floatier. */
  dragFollow: 14,
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
    "is that a cursor?!",
    "Dos on duty.",
    "please don't unplug me",
  ],
  pokeMessages: ["nyaa!", "boing!", "hey!", "rude. (nice)"],
  grabMessages: ["put me down!", "mmmf!", "hanging in there", "nyaaa~"],
  releaseMessages: ["thud.", "ow. rude.", "...again?"],
  wakeMessages: ["...huh?", "i was NOT sleeping", "mrrp?"],
  sleepMessages: ["zzz...", "zZz", "5 more minutes..."],
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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

  const pointer = { x: 0, y: 0, active: false };
  let drag = null;
  let hot = false;
  const hop = { y: 0, vy: 0 }; // vertical offset (px, negative = up) of the poke / drop hop
  let hopApplied = false;

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

  const modeMq = opts.idleOnlyQuery ? window.matchMedia(opts.idleOnlyQuery) : null;
  let idleOnly = !!(modeMq && modeMq.matches);

  // ---------------------------------------------------------------- geometry
  function resolveContainer() {
    const c = opts.containerSelector;
    container =
      document.querySelector("[data-dos-container]") ||
      (typeof c === "string" ? document.querySelector(c) : c instanceof Element ? c : null);
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
  }

  function cornerPosition() {
    const left = opts.corner.includes("left");
    const top = opts.corner.includes("top");
    return {
      x: left ? bounds.minX + opts.edgeInset : bounds.maxX - opts.edgeInset,
      y: top ? bounds.minY + opts.edgeInset : bounds.maxY - opts.edgeInset,
    };
  }

  function clampToBounds() {
    x = clamp(x, bounds.minX, bounds.maxX);
    y = clamp(y, bounds.minY, bounds.maxY);
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
  function computeTarget() {
    if (idleOnly || !pointer.active) return null;
    const b = bounds;
    const outside =
      pointer.x < b.minX ? "l" : pointer.x > b.maxX ? "r" : pointer.y < b.minY ? "t" : pointer.y > b.maxY ? "b" : null;
    return {
      x: clamp(pointer.x, b.minX, b.maxX),
      y: clamp(pointer.y, b.minY, b.maxY),
      outside, // cursor is beyond the column: run to that wall instead of stopping short
      stop: outside ? 3 : opts.stopDistance,
    };
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

    if (!idleAnim && idleTime > 10) {
      const walls = wallsAvailable();
      const wanted = target && target.outside ? WALL_FOR_SIDE[target.outside] : null;
      if (wanted && walls.includes(wanted)) {
        if (Math.random() < 1 / 10) idleAnim = wanted; // cursor is on the other side of the wall
      } else if (Math.random() < 1 / 150) {
        idleAnim = pick(["sleeping", "scratchSelf", ...walls]);
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
        if (idleAnimFrame > 192) resetIdle();
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
        // Rotating speech bubble: only while he is just hanging around.
        if (bubbleTicks === 0 && --nextSayIn <= 0) {
          say(pendingGreeting || nextMessage());
          pendingGreeting = null;
          nextSayIn = rand(130, 240);
        }
        return;
    }
    idleAnimFrame++;
  }

  function tick() {
    frameCount++;

    if (!container || !container.isConnected) {
      if (frameCount % 20 === 0) resolveContainer();
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

    // Alert pose before bolting off, like oneko.
    if (idleTime > 1) {
      running = false;
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7) - 1;
      return;
    }

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
    const step = Math.min(opts.speed * dt, gap);
    x += (dx / dist) * step;
    y += (dy / dist) * step;
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
    if (hop.y === 0) {
      if (hopApplied) {
        sprite.style.transform = "";
        hopApplied = false;
      }
      return;
    }
    sprite.style.transform = `translateY(${hop.y.toFixed(1)}px)`;
    hopApplied = true;
  }

  // ---------------------------------------------------------------- pointer input
  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    if (drag) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
    } else {
      setHot(!idleOnly && hitTest(e.clientX, e.clientY)); // only catch clicks that land on cat pixels
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
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
    running = false; // a chase in progress must not tug against the hand
    hop.y = 0;
    hop.vy = 0;
    resetIdle();
    idleTime = 0;
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
      // A quick click is a poke: hop and complain.
      hop.vy = -420;
      say(pick(opts.pokeMessages), 28);
    } else {
      // Dropped: a small hop as he lands on his feet.
      hop.vy = -200;
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
    }
  }

  // ---------------------------------------------------------------- main loop
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    refreshBounds();
    if (idleOnly) {
      const c = cornerPosition();
      x = c.x;
      y = c.y;
    } else {
      if (drag) {
        // Carried: he flies up to the cursor and hangs from it by the paws.
        const f = 1 - Math.exp(-dt * opts.dragFollow);
        x += (pointer.x - x) * f;
        y += (pointer.y + HOLD_Y - y) * f;
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

    stepHop(dt);
    applyHop();
    root.style.transform = `translate3d(${Math.round(x - S / 2)}px, ${Math.round(y - S / 2)}px, 0)`;
  }

  function start() {
    if (destroyed) return;
    resolveContainer();
    refreshBounds();
    const c = cornerPosition();
    x = c.x;
    y = c.y;
    setSprite("idle", 0);
    started = true;
    root.hidden = false;
    root.style.transform = `translate3d(${Math.round(x - S / 2)}px, ${Math.round(y - S / 2)}px, 0)`;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
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
