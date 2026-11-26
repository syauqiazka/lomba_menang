import { HTMLAttributes } from "react";
import { Button } from "./Button";

interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title = "Terjadi Kesalahan", message, code, onRetry, retryLabel = "Coba Lagi", className = "", ...props }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-12 md:py-16 ${className}`} {...props}>
      <div className="mb-6 text-status-danger-bg rounded-full p-4 w-16 h-16 flex items-center justify-center">
        <svg className="w-8 h-8 text-status-danger-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="font-display font-semibold text-xl text-primary mb-2">{title}</h3>
      <p className="text-secondary-text text-base max-w-md mb-4">{message}</p>
      {code && <p className="text-secondary-text text-sm font-mono mb-6">Kode: {code}</p>}
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function InlineError({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 p-3 bg-status-danger-bg border border-status-danger-text/20 rounded-md text-status-danger-text text-sm ${className}`} role="alert">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}