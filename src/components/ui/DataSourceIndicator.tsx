import { HTMLAttributes } from "react";
import { Badge } from "./Badge";

interface SourceInfo {
  id: string;
  title: string;
  publisher?: string;
  category: "OFFICIAL" | "MEDIA" | "RESEARCH" | "EDITORIAL";
  publicationDate?: string | Date;
  accessDate?: string | Date;
  url?: string;
}

interface DataSourceIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  source: SourceInfo;
  compact?: boolean;
  showCategory?: boolean;
}

const categoryLabels: Record<SourceInfo["category"], string> = {
  OFFICIAL: "Resmi",
  MEDIA: "Media",
  RESEARCH: "Penelitian",
  EDITORIAL: "Editorial",
};

const categoryVariants: Record<SourceInfo["category"], "safe" | "warning" | "neutral" | "default"> = {
  OFFICIAL: "safe",
  MEDIA: "warning",
  RESEARCH: "neutral",
  EDITORIAL: "default",
};

function formatDate(date?: string | Date): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DataSourceIndicator({ source, compact = false, showCategory = true, className = "", ...props }: DataSourceIndicatorProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-secondary-text ${className}`} {...props}>
        {showCategory && (
          <Badge variant={categoryVariants[source.category]} size="sm">
            {categoryLabels[source.category]}
          </Badge>
        )}
        <span className="truncate max-w-[200px]">
          {source.publisher || source.title}
        </span>
        {source.publicationDate && (
          <time dateTime={new Date(source.publicationDate).toISOString()}>
            {formatDate(source.publicationDate)}
          </time>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 text-sm ${className}`} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        {showCategory && (
          <Badge variant={categoryVariants[source.category]} size="sm">
            {categoryLabels[source.category]}
          </Badge>
        )}
        <span className="font-medium text-primary">{source.title}</span>
        {source.publisher && <span className="text-secondary-text">{source.publisher}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-secondary-text">
        {source.publicationDate && (
          <time dateTime={new Date(source.publicationDate).toISOString()}>
            Terbit: {formatDate(source.publicationDate)}
          </time>
        )}
        {source.accessDate && (
          <time dateTime={new Date(source.accessDate).toISOString()}>
            Diakses: {formatDate(source.accessDate)}
          </time>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-black text-sm"
          >
            Lihat sumber
          </a>
        )}
      </div>
    </div>
  );
}