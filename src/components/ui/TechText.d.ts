import type { CSSProperties, FC } from "react";

export interface TechTextProps {
  text?: string;
  /** Leave empty to inherit the container's font. */
  fontFamily?: string;
  fontWeight?: number;
  /** Largest font size in px; the wordmark shrinks to fit narrower containers. */
  fontSize?: number;
  /** Extra space between letters, in em. */
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  align?: "left" | "center" | "right";
  reveal?: "area" | "letter" | "off";
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  lineStyle?: "dashed" | "solid";
  strokeWidth?: number;
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  bounce?: number;
  clickKick?: boolean;
  intro?: "none" | "type" | "assemble" | "metrics";
  introDuration?: number;
  guides?: boolean;
  sweep?: boolean;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

declare const TechText: FC<TechTextProps>;
export default TechText;
