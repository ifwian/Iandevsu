import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts (the last one wins).
 * Supports both variadic strings -- cn("a", cond && "b") -- and object maps --
 * cn({ "bg-x": true }) -- because clsx accepts both. twMerge is what lets a
 * caller's `className` actually override a component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
