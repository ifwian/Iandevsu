export interface DosOptions {
  /** URL of the oneko-layout sprite sheet (8 x 4 frames of 32 px). Default "/assets/kuro/jess.png". */
  spriteUrl?: string;
  /** CSS selector or Element for the column Dos lives in. null = viewport. Default "main". */
  containerSelector?: string | Element | null;
  /** Pixel scale. Default 2. */
  scale?: number;
  /** Run speed in CSS px per second. Default 130. */
  speed?: number;
  /** How close he stops to the cursor, in CSS px. Default 64. */
  stopDistance?: number;
  /** Gap between Dos and his resting corner (idle-only mode). Default 0. */
  edgeInset?: number;
  /** Start / idle-only corner. Default "bottom-left". */
  corner?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** How quickly he flies up to the hand when picked up (higher = snappier). Default 14. */
  dragFollow?: number;
  /** Chance per 100 ms tick that an idle animation (nap, scratch) starts. Default 1/150. */
  idleChance?: number;
  /** Relative odds of each idle animation; 0 switches one off. Default all 1. */
  idleWeights?: { sleeping?: number; scratchSelf?: number; wall?: number };
  /** Nap length in 100 ms ticks. Default 192. */
  sleepLength?: number;
  /** Chance per tick of clawing the wall when the cursor is beyond it. Default 0.1. */
  wallChance?: number;
  /** Min and max ticks between rotating speech bubbles. Default [130, 240]. */
  sayEvery?: [number, number];
  /** How long a rotating speech bubble stays, in ticks. Default 38. */
  sayDuration?: number;
  /** Media query that switches to idle-only mode. Default "(max-width: 767px), (hover: none)". */
  idleOnlyQuery?: string | null;
  zIndex?: number | null;
  /** Turn the speech bubble off entirely. Default true. */
  bubble?: boolean;
  /** Elements the speech bubble tries not to cover. */
  avoidSelector?: string;
  greeting?: string;
  messages?: string[];
  pokeMessages?: string[];
  grabMessages?: string[];
  releaseMessages?: string[];
  wakeMessages?: string[];
  sleepMessages?: string[];
}

export interface DosController {
  /** Remove Dos and all of his listeners. Safe to call more than once. */
  destroy(): void;
  /** Show a speech bubble for `ticks` x 100 ms (default 38). */
  say(text: string, ticks?: number): void;
}

export function initDos(options?: DosOptions): DosController;
