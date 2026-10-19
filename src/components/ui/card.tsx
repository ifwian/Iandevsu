import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Card primitives with the shadcn/ui API (Card, CardHeader, CardTitle, ...), but
 * dependency-free and styled with this site's own tokens in inbox-ui.css. The
 * real shadcn components are not installed here and expect tokens (bg-card,
 * text-muted-foreground) that this site does not define.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("ui-card", className)} {...props} />;
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("ui-card-header", className)} {...props} />;
});

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle({ className, ...props }, ref) {
  return <h2 ref={ref} className={cn("ui-card-title", className)} {...props} />;
});

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("ui-card-description", className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("ui-card-content", className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn("ui-card-footer", className)} {...props} />;
});
