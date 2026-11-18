import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  children?: ReactNode;
}

/** Centred "there is nothing here, and here is why" for a pane. */
export default function EmptyState({ icon, title, hint, children }: EmptyStateProps) {
  return (
    <div className="inbox-empty">
      {icon}
      <p className="inbox-empty-title">{title}</p>
      {hint ? <p className="inbox-empty-hint">{hint}</p> : null}
      {children}
    </div>
  );
}
