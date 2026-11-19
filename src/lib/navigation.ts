import type { CSSProperties, ReactNode } from "react";
import {
  Camera,
  FileText,
  FolderGit2,
  GraduationCap,
  Home,
  Layers,
} from "lucide-react";

/**
 * The site's section list, in one place.
 *
 * Previously this lived in Sidebar.tsx. It is shared now so the sidebar's
 * scroll-spy and its numbered rows always agree on the same order.
 */

/**
 * Structural minimum every icon in this project satisfies.
 *
 * Declared here rather than importing lucide's `LucideIcon` because the sidebar
 * also renders the hand-rolled brand marks (`GithubIcon`, `LinkedinIcon`) --
 * lucide-react 1.0 dropped the trademarked brand icons. Both satisfy this
 * shape, which is the subset actually passed at the call sites.
 */
export interface NavIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export type NavIcon = (props: NavIconProps) => ReactNode;

export interface NavItem {
  /** Bare anchor target, e.g. "#projects". Doubles as the scroll-spy key. */
  href: string;
  label: string;
  Icon: NavIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home", Icon: Home },
  { href: "#projects", label: "projects", Icon: FolderGit2 },
  { href: "#stack", label: "tech stack", Icon: Layers },
  { href: "#education", label: "education", Icon: GraduationCap },
  { href: "#life", label: "outside the IDE", Icon: Camera },
  { href: "#blog", label: "blog", Icon: FileText },
];
