import type { CSSProperties, ReactNode } from "react";
import {
  Coffee,
  FileText,
  FolderGit2,
  Home,
  Layers,
  User,
} from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";

/**
 * The site's section list, in one place.
 *
 * Previously this lived in Sidebar.tsx. It is shared now so the sidebar's
 * scroll-spy and its numbered rows always agree on the same order.
 */

/**
 * Structural minimum every icon in this project satisfies.
 *
 * Declared here rather than importing lucide's `LucideIcon` because one entry is
 * `GithubIcon`, the hand-rolled brand mark -- lucide-react 1.0 dropped the
 * trademarked brand icons, so `Github` does not exist. Both satisfy this shape,
 * which is the subset actually passed at the call sites; a wider type would not
 * accept the custom mark.
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
  Icon: NavIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home", Icon: Home },
  { href: "#about", label: "about", Icon: User },
  { href: "#projects", label: "projects", Icon: FolderGit2 },
  { href: "#stack", label: "stack", Icon: Layers },
  { href: "#life", label: "life", Icon: Coffee },
  { href: "#github", label: "github", Icon: GithubIcon },
  { href: "#blog", label: "blog", Icon: FileText },
];
