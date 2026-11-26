import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant =
  | "default"
  | "safe"
  | "warning"
  | "danger"
  | "neutral"
  | "status-dilaporkan"
  | "status-terisolir"
  | "status-belum-terverifikasi";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary-background text-status-neutral-text",
  safe: "bg-status-safe-bg text-status-safe-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  danger: "bg-status-danger-bg text-status-danger-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
  "status-dilaporkan": "bg-status-warning-bg text-status-warning-text",
  "status-terisolir": "bg-status-danger-bg text-status-danger-text",
  "status-belum-terverifikasi": "bg-status-neutral-bg text-status-neutral-text",
};

const sizeStyles = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", size = "md", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center font-body font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, BadgeVariant> = {
    "Dilaporkan belum menerima bantuan": "status-dilaporkan",
    "Akses terisolir": "status-terisolir",
    "Belum terverifikasi": "status-belum-terverifikasi",
  };

  return <Badge variant={statusMap[status] || "neutral"}>{status}</Badge>;
}