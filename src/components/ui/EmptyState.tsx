import { HTMLAttributes } from "react";
import { LinkButton } from "./Button";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    variant?: "primary" | "secondary";
  };
  illustration?: React.ReactNode;
}

export function EmptyState({ title, description, action, illustration, className = "", ...props }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-12 md:py-16 ${className}`} {...props}>
      <div className="mb-6 text-secondary-background rounded-full p-4 w-16 h-16 flex items-center justify-center">
        {illustration || (
          <svg className="w-8 h-8 text-secondary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="font-display font-semibold text-xl text-primary mb-2">{title}</h3>
      {description && <p className="text-secondary-text text-base max-w-md mb-6">{description}</p>}
      {action && (
        <LinkButton variant={action.variant || "primary"} href={action.href}>{action.label}</LinkButton>
      )}
    </div>
  );
}