import { HTMLAttributes } from "react";
import { DataSourceIndicator } from "./DataSourceIndicator";

interface StatisticData {
  key: string;
  label: string;
  value: string;
  unit?: string;
  asOfDate: string | Date;
  source: {
    id: string;
    title: string;
    publisher?: string;
    category: "OFFICIAL" | "MEDIA" | "RESEARCH" | "EDITORIAL";
    publicationDate?: string | Date;
    accessDate?: string | Date;
    url?: string;
  };
}

interface StatisticDisplayProps extends HTMLAttributes<HTMLDivElement> {
  data: StatisticData;
  variant?: "default" | "compact" | "featured";
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function StatisticDisplay({ data, variant = "default", className = "", ...props }: StatisticDisplayProps) {
  const { label, value, unit, asOfDate, source } = data;

  if (variant === "compact") {
    return (
      <div className={`flex items-baseline gap-2 ${className}`} {...props}>
        <span className="font-display font-bold text-2xl text-primary">{value}</span>
        {unit && <span className="text-secondary-text text-sm">{unit}</span>}
        <span className="text-secondary-text text-sm font-medium">{label}</span>
        <DataSourceIndicator source={source} compact />
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <article className={`card p-6 md:p-8 text-center ${className}`} {...props}>
        <div className="mb-4">
          <span className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-primary">
            {value}
          </span>
          {unit && <span className="ml-2 text-secondary-text text-lg">{unit}</span>}
        </div>
        <h3 className="font-display font-semibold text-xl md:text-2xl text-primary mb-2">{label}</h3>
        <p className="text-secondary-text text-sm mb-4">
          Data per {formatDate(asOfDate)}
        </p>
        <DataSourceIndicator source={source} />
      </article>
    );
  }

  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`} {...props}>
      <div className="font-medium text-secondary-text">{label}</div>
      <div className="font-display font-bold text-2xl md:text-3xl text-primary">
        {value}{unit && <span className="font-body font-normal text-lg text-secondary-text ml-1">{unit}</span>}
      </div>
      <div className="md:col-span-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-text">
          <time dateTime={new Date(asOfDate).toISOString()}>Data per: {formatDate(asOfDate)}</time>
          <DataSourceIndicator source={source} compact />
        </div>
      </div>
    </div>
  );
}