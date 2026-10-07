import { type ComponentType } from "react";
import GithubIcon from "@/components/icons/GithubIcon";

export interface SocialIconProps {
  size?: number;
  className?: string;
}

export type SocialIcon = ComponentType<SocialIconProps>;

export interface SocialItem {
  label: string;
  href: string;
  Icon: SocialIcon;
}

/**
 * The site's social accounts, in one place.
 *
 * This list used to live in Hero.tsx, which was fine while the hero was the only
 * surface showing it. The sidebar footer now shows the same three as a row of
 * icon links, and a second hand-maintained copy of three URLs is three chances to
 * ship a stale handle -- so the list and its marks moved here and both surfaces
 * import it. Same reasoning as `lib/navigation.ts`.
 *
 * The marks are drawn rather than imported: lucide-react 1.0 dropped the
 * trademarked brand icons, so `Github`/`Linkedin`/`Instagram` do not exist in it,
 * and `.clinerules` requires the local SVG. They all render at 24x24 on the same
 * 1.7 stroke, so the three sit on one optical baseline at any size.
 *
 * Order is display order in both surfaces, and it is the reading order a screen
 * reader announces, so it is not reordered casually.
 */
export const SOCIAL_ITEMS: SocialItem[] = [
  { label: "github", href: "https://github.com/ifwian", Icon: GithubIcon },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", Icon: LinkedinIcon },
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", Icon: InstagramIcon },
];

function LinkedinIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8.5V18" />
      <path d="M6 5.5v.01" />
      <path d="M10 18v-5.25a3.25 3.25 0 0 1 6.5 0V18" />
      <path d="M10 12.5V18" />
    </svg>
  );
}

function InstagramIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}
