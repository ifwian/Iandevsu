/**
 * Kuro: a desktop pet for the portfolio.
 * Inspired by oneko.js (originally by adryd), rewritten as a self-contained ES module.
 *
 *   import { initKuro } from "./kuro.js";
 *   import "./kuro.css";
 *   const kuro = initKuro();      // returns { destroy(), say(text) }
 *
 * Sprite sheet: oneko layout, 8 x 4 frames of 32 x 32 px (256 x 128).
 * A sheet that is an exact multiple of that size (512 x 256, ...) also works.
 *
 * Markup hooks (all optional):
 *   [data-kuro-container]  the element Kuro lives inside (falls back to `containerSelector`, then the viewport)
 *   [data-kuro-avoid]      extra elements the speech bubble should not cover
 *   [data-kuro-ignore]     elements (or subtrees) the speech bubble may cover
 */

const FRAME = 32; // logical frame size inside the sheet
const SHEET_W = 256; // logical sheet size (8 x 4 frames)
const SHEET_H = 128;
const TICK_MS = 100; // logic tick, same cadence as oneko.js
const ALPHA_MIN = 24; // alpha above this counts as "on the cat" for hit testing

// [column, row] offsets in frames (negative, like oneko.js background-position values)
const SPRITES = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]],
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
  /** CSS selector (or Element) for the content column Kuro lives in. null = viewport. */
  containerSelector: "main",
  scale: 2,
  /** Run speed in CSS px per second. */
  speed: 130,
  /** How close Kuro stops to the cursor, in CSS px. */
  stopDistance: 64,
  /** Gap kept between Kuro and the corner he rests in (idle-only mode). */
  edgeInset: 0,
  /** Where he starts, and where he sits in idle-only mode. */
  corner: "bottom-left",
  /** While dragged he is carried along behind the hand. Higher = tighter follow, lower = more mochi lag. */
  dragFollow: 8,
  /** Matching viewports get idle-only Kuro (no chasing, no dragging). */
  idleOnlyQuery: "(max-width: 767px), (hover: none)",
  zIndex: null,
  bubble: true,
  avoidSelector:
    'h1,h2,h3,h4,h5,h6,p,li,a,button,input,textarea,select,label,img,video,canvas,figcaption,blockquote,pre,summary,[role="button"],[data-kuro-avoid]',
  greeting: "mrrp. hi!",
  messages: [
    "mrrp?",
    "psst... the projects are down there",
    "hire my human :3",
    "i am 90% fur",
    "scroll, hooman",
    "meow (that means hi)",
    "is that a cursor?!",
    "nyaa~",
    "please don't unplug me",
  ],
  pokeMessages: ["nyaa!", "boing!", "hey!", "mochi mode :3", "rude. (nice)"],
  grabMessages: ["mmmf!", "stretchy...", "nyaaa~", "i'm mochi now"],
  releaseMessages: ["boing!", "wheee", "...again?"],
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

export function initKuro(userOptions = {}) {
  const opts = { ...DEFAULTS, ...userOptions };
  const inert = { destroy() {}, say() {} };

  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) return inert;

  // Accessibility: no animated pet for people who asked for less motion.
  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMq.matches) return inert;
  if (document.querySelector(".kuro")) return inert; // already mounted

  const S = FRAME * opts.scale; // on-screen sprite size
  const ac = new AbortController();
  const on = (target, type, fn, o = {}) => target.addEventListener(type, fn, { ...o, signal: ac.signal });

  // ---------------------------------------------------------------- DOM
  const root = document.createElement("div");
  root.className = "kuro";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.style.setProperty("--kuro-size", `${S}px`);
  if (opts.zIndex != null) root.style.zIndex = String(opts.zIndex);
  const sprite = document.createElement("div");
  sprite.className = "kuro__sprite";
  const bubble = document.createElement("div");
  bubble.className = "kuro__bubble";
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
  const spring = { x: 0, y: 0, vx: 0, vy: 0 }; // mochi stretch offset (px) and velocity
  const xf = { tx: 0, ty: 0, theta: 0, sx: 1, sy: 1 }; // transform currently applied to the sprite
  let stretched = false;

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
      document.querySelector("[data-kuro-container]") ||
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
    const hop = name === "alert";
    if (hop !== isHop) {
      isHop = hop;
      sprite.classList.toggle("is-alert", hop);
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

  /** True when the viewport point is on an opaque pixel of the (possibly stretched) cat. */
  function hitTest(px, py) {
    if (!started) return false;
    let vx = px - (x + xf.tx);
    let vy = py - (y + xf.ty);
    // invert: translate * rotate(theta) * scale(sx, sy) * rotate(-theta)
    const c = Math.cos(xf.theta);
    const s = Math.sin(xf.theta);
    let a = (vx * c + vy * s) / xf.sx;
    let b = (-vx * s + vy * c) / xf.sy;
    vx = a * c - b * s;
    vy = a * s + b * c;
    const lx = vx + S / 2;
    const ly = vy + S / 2;
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
      if (root.contains(node) || node.closest("[data-kuro-ignore]")) return;
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
    const gap = 6;
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
    bubble.style.setProperty("--kuro-tail", `${tail}px`);
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

  function springActive() {
    return Math.abs(spring.x) + Math.abs(spring.y) > 0.6 || Math.abs(spring.vx) + Math.abs(spring.vy) > 8;
  }

  /** Clears the current idle animation. Returns true if Kuro was properly asleep. */
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

    // Being held, or still wobbling after being let go.
    if (drag || springActive()) {
      running = false;
      idleTime = 0;
      resetIdle();
      setSprite("alert", 0);
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

  // ---------------------------------------------------------------- mochi physics
  function softLimit(px, py) {
    const m = Math.hypot(px, py);
    if (m < 0.001) return [0, 0];
    const max = S * 2.2; // rubber band: the further you pull, the harder it resists
    const k = (max * Math.tanh(m / max)) / m;
    return [px * k, py * k];
  }

  function stepSpring(dt) {
    let tx = 0;
    let ty = 0;
    if (drag) [tx, ty] = softLimit(pointer.x - x - drag.gx, pointer.y - y - drag.gy);

    const resting =
      !drag &&
      Math.abs(spring.x) + Math.abs(spring.y) < 0.15 &&
      Math.abs(spring.vx) + Math.abs(spring.vy) < 3;
    if (resting) {
      spring.x = spring.y = spring.vx = spring.vy = 0;
      return;
    }

    // Underdamped spring: low damping once released gives the wobble.
    const K = 260;
    const zeta = drag ? 0.38 : 0.16;
    const c = 2 * zeta * Math.sqrt(K);
    const n = Math.max(1, Math.ceil(dt * 120));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      spring.vx += (K * (tx - spring.x) - c * spring.vx) * h;
      spring.vy += (K * (ty - spring.y) - c * spring.vy) * h;
      spring.x += spring.vx * h;
      spring.y += spring.vy * h;
    }
  }

  function applyStretch() {
    const m = Math.hypot(spring.x, spring.y);
    if (m < 0.4) {
      if (stretched) {
        sprite.style.transform = "";
        stretched = false;
      }
      xf.tx = xf.ty = xf.theta = 0;
      xf.sx = xf.sy = 1;
      return;
    }
    const theta = Math.atan2(spring.y, spring.x);
    const sx = Math.min(1 + m / S, 4); // stretch toward the hand
    const sy = 1 / Math.sqrt(sx); // keep the volume: thinner as it gets longer
    const len = (sx - 1) * S;
    xf.theta = theta;
    xf.sx = sx;
    xf.sy = sy;
    xf.tx = (Math.cos(theta) * len) / 2; // keep the far end pinned, only the head follows
    xf.ty = (Math.sin(theta) * len) / 2;
    sprite.style.transform =
      `translate(${xf.tx.toFixed(2)}px, ${xf.ty.toFixed(2)}px) ` +
      `rotate(${theta.toFixed(4)}rad) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${(-theta).toFixed(4)}rad)`;
    stretched = true;
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
    drag = {
      id: e.pointerId,
      gx: e.clientX - x, // where on the cat he was grabbed
      gy: e.clientY - y,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      moved: false,
    };
    running = false; // a chase in progress must not tug against the hand
    resetIdle();
    idleTime = 0;
    sprite.classList.add("is-dragging");
    document.documentElement.classList.add("kuro-dragging");
  }

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    sprite.classList.remove("is-dragging");
    document.documentElement.classList.remove("kuro-dragging");
    try {
      sprite.releasePointerCapture(d.id);
    } catch {
      /* already released */
    }
    const pulled = Math.hypot(spring.x, spring.y);
    if (!d.moved && performance.now() - d.t0 < 400) {
      // A quick click is a poke: hop and complain.
      spring.vy = -420;
      spring.vx = (Math.random() - 0.5) * 120;
      say(pick(opts.pokeMessages), 28);
    } else if (pulled > S * 0.8) {
      say(pick(opts.releaseMessages), 24);
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
        // Carry him along with the hand, trailing a little behind it. The gap between
        // him and the hand is what stretches the mochi (see stepSpring).
        const f = 1 - Math.exp(-dt * opts.dragFollow);
        x += (pointer.x - drag.gx - x) * f;
        y += (pointer.y - drag.gy - y) * f;
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

    stepSpring(dt);
    applyStretch();
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
    document.documentElement.classList.remove("kuro-dragging");
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
    console.warn("[kuro] could not load the sprite sheet:", opts.spriteUrl);
    destroy();
  };
  img.src = opts.spriteUrl;

  return { destroy, say };
}
