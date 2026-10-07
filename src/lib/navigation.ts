import type { CSSProperties, ReactNode } from "react";
import {
  Coffee,
  FileText,
  FolderGit2,
  GraduationCap,
  Home,
  Layers,
  User,
} from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";

/**
 * The site's section list, in one place.
 *
 * Previously this lived in Sidebar.tsx. It is shared now because three surfaces
 * need the same list and the ordering has to agree between all of them: the
 * sidebar's scroll-spy, the command palette, and the number badges. Two copies
 * would drift, and a palette that jumps to a different order than the nav it
 * replaced is worse than no palette.
 */

/**
 * Structural minimum every icon in this project satisfies.
 *
 * Declared here rather than importing lucide's `LucideIcon` because one entry is
 * `GithubIcon`, the hand-rolled brand mark -- lucide-react 1.0 dropped the
 * trademarked brand icons, so `Github` does not exist and `.clinerules` requires
 * the local SVG. Both satisfy this shape, which is the subset actually passed
 * at the call sites; a wider type would not accept the custom mark.
 */
export interface NavIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export type NavIcon = (props: NavIconProps) => ReactNode;

export interface NavItem {
  /** Bare anchor target, e.g. "#about". Doubles as the scroll-spy key. */
  href: string;
  label: string;
  /** Extra words the palette matches on, so "degree" finds education. */
  keywords: string;
  Icon: NavIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home", keywords: "start intro index", Icon: Home },
  { href: "#about", label: "about", keywords: "bio who background me", Icon: User },
  { href: "#projects", label: "projects", keywords: "work builds apps", Icon: FolderGit2 },
  { href: "#stack", label: "stack", keywords: "tech tools languages", Icon: Layers },
  { href: "#education", label: "education", keywords: "school degree certifications", Icon: GraduationCap },
  { href: "#life", label: "life", keywords: "outside hobbies hobbies ide", Icon: Coffee },
  { href: "#github", label: "github", keywords: "activity commits repos", Icon: GithubIcon },
  { href: "#blog", label: "blog", keywords: "posts writing articles medium", Icon: FileText },
];
