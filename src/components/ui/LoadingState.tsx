import { HTMLAttributes } from "react";

interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "spinner" | "skeleton" | "page";
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingState({ variant = "spinner", size = "md", text, className = "", ...props }: LoadingStateProps) {
  const sizeStyles = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  if (variant === "page") {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`} {...props}>
        <div
          className="animate-spin rounded-full border-4 border-primary border-t-transparent"
          style={{ width: "48px", height: "48px" }}
          role="status"
          aria-label={text || "Memuat..."}
        >
          <span className="sr-only">{text || "Memuat..."}</span>
        </div>
        {text && <p className="mt-4 text-secondary-text text-base">{text}</p>}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={`animate-pulse ${className}`} {...props}>
        <div className="h-4 bg-secondary-background rounded w-3/4 mb-2" />
        <div className="h-4 bg-secondary-background rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      <div
        className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeStyles[size]}`}
        role="status"
        aria-label={text || "Memuat..."}
      >
        <span className="sr-only">{text || "Memuat..."}</span>
      </div>
      {text && <span className="ml-2 text-secondary-text text-sm">{text}</span>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-6 bg-secondary-background rounded w-3/4 mb-4" />
      <div className="h-4 bg-secondary-background rounded w-1/2 mb-2" />
      <div className="h-4 bg-secondary-background rounded w-5/6 mb-2" />
      <div className="h-4 bg-secondary-background rounded w-1/3" />
    </div>
  );
}

export function SkeletonStatistic() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-6 bg-secondary-background rounded w-1/4" />
      <div className="h-10 bg-secondary-background rounded w-1/2" />
      <div className="h-4 bg-secondary-background rounded w-3/4" />
    </div>
  );
}

export function SkeletonTable(rows = 5) {
  return (
    <div className="table-container animate-pulse">
      <table>
        <thead>
          <tr>
            <th className="h-10 bg-secondary-background" />
            <th className="h-10 bg-secondary-background" />
            <th className="h-10 bg-secondary-background" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="h-10 bg-secondary-background" />
              <td className="h-10 bg-secondary-background" />
              <td className="h-10 bg-secondary-background" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}