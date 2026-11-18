interface IconProps {
  size?: number;
  strokeWidth?: number; // accepted for drop-in compatibility with lucide icons, unused (this is a filled mark, not a stroke icon)
  style?: React.CSSProperties;
  className?: string;
}

/**
 * lucide-react 1.0 removed all trademarked brand icons (GitHub,
 * Figma, Slack, etc.) for legal reasons -- see
 * https://lucide.dev/guide/react/migration for the full list and
 * their own recommendation to use a plain SVG instead. This is that
 * plain SVG, sized/typed to drop in anywhere `Github` from
 * lucide-react was used before.
 */
export default function GithubIcon({ size = 16, style, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style} className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55v-2.15c-3.16.34-3.98-1.37-4.24-1.97-.14-.36-.75-1.48-1.28-1.78-.44-.24-1.06-.82-.02-.84.98-.01 1.68.9 1.91 1.28 1.12 1.88 2.91 1.35 3.62 1.02.11-.79.44-1.35.8-1.66-2.79-.32-5.7-1.4-5.7-6.19 0-1.36.49-2.48 1.28-3.36-.14-.32-.6-1.61.13-3.35 0 0 1.05-.34 3.44 1.28a11.86 11.86 0 0 1 6.26 0c2.39-1.62 3.44-1.28 3.44-1.28.73 1.74.27 3.03.13 3.35.8.88 1.28 1.99 1.28 3.36 0 4.8-2.92 5.87-5.71 6.18.45.39.84 1.15.84 2.33v3.45c0 .3.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}
