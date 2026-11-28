'use client';

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataSourceIndicator } from "@/components/ui/DataSourceIndicator";

export interface SourceRegistryItem {
  id: string;
  title: string;
  publisher: string | null;
  url: string | null;
  category: "OFFICIAL" | "MEDIA" | "RESEARCH" | "EDITORIAL";
  publicationDate: string | null;
  accessDate: string;
  description: string | null;
  importBatchId: string | null;
}

const categoryFilters: Array<{ value: string; label: string }> = [
  { value: "", label: "Semua" },
  { value: "OFFICIAL", label: "Resmi" },
  { value: "MEDIA", label: "Media" },
  { value: "RESEARCH", label: "Penelitian" },
  { value: "EDITORIAL", label: "Editorial" },
];

const categoryLabels: Record<SourceRegistryItem["category"], string> = {
  OFFICIAL: "Resmi",
  MEDIA: "Media",
  RESEARCH: "Penelitian",
  EDITORIAL: "Editorial",
};

const categoryBadges: Record<SourceRegistryItem["category"], "safe" | "warning" | "neutral" | "default"> = {
  OFFICIAL: "safe",
  MEDIA: "warning",
  RESEARCH: "neutral",
  EDITORIAL: "default",
};

function isSafeHttpUrl(url: string | null): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function SourcesRegistryClient({ sources }: { sources: SourceRegistryItem[] }) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = {
      "": sources.length,
      OFFICIAL: 0,
      MEDIA: 0,
      RESEARCH: 0,
      EDITORIAL: 0,
    };
    for (const src of sources) {
      counts[src.category] = (counts[src.category] ?? 0) + 1;
    }
    return counts;
  }, [sources]);

  const filteredSources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((source) => {
      if (category && source.category !== category) return false;
      if (!q) return true;
      const haystack = [
        source.title,
        source.publisher ?? "",
        source.url ?? "",
        source.description ?? "",
        source.importBatchId ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sources, category, query]);

  const hasFilters = Boolean(category || query.trim());

  return (
    <>
      {/* Category Summary Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5" role="group" aria-label="Ringkasan kategori sumber">
        {categoryFilters.map((f) => {
          const active = category === f.value;
          const count = countsByCategory[f.value] ?? 0;
          return (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setCategory(f.value)}
              aria-pressed={active}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                active
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-primary hover:bg-secondary-background"
              }`}
            >
              <span>{f.label}</span>
              <span className={`font-mono text-xs ${active ? "text-white/80" : "text-secondary-text"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="category-filter" className="block text-sm font-medium text-primary mb-1">
                Filter Kategori
              </label>
              <select
                id="category-filter"
                className="input-field"
                aria-label="Filter kategori sumber"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryFilters.map((f) => (
                  <option key={f.value || "all"} value={f.value}>
                    {f.label === "Semua" ? "Semua Kategori" : f.label} ({countsByCategory[f.value] ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="search-sources" className="block text-sm font-medium text-primary mb-1">
                Cari Sumber
              </label>
              <input
                type="search"
                id="search-sources"
                placeholder="Judul, penerbit, deskripsi, atau URL..."
                className="input-field"
                aria-label="Cari sumber data"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  setQuery("");
                }}
                className="min-h-[44px] px-4 py-2 rounded-md border border-border bg-background text-sm font-medium text-primary hover:bg-secondary-background transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-xs text-secondary-text mt-3" aria-live="polite">
            Menampilkan {filteredSources.length} dari {sources.length} sumber terdaftar.
          </p>
        </CardContent>
      </Card>

      {filteredSources.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-primary font-medium">Tidak ada sumber yang cocok dengan filter.</p>
            <p className="text-secondary-text text-sm">Coba ubah kategori atau kata kunci pencarian.</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  setQuery("");
                }}
                className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-background text-sm font-medium text-primary hover:bg-secondary-background transition-colors"
              >
                Reset Filter
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sources List - Table View (Desktop) */}
          <div className="hidden lg:block mb-8 overflow-x-auto" role="region" aria-label="Daftar sumber data tampilan tabel" tabIndex={0}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Judul / Penerbit</th>
                    <th scope="col">Kategori</th>
                    <th scope="col">Tanggal Terbit</th>
                    <th scope="col">Tanggal Akses</th>
                    <th scope="col">Batch Impor</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map((source) => (
                    <tr key={source.id}>
                      <td className="max-w-md">
                        <div>
                          <p className="font-medium text-primary">{source.title}</p>
                          {source.publisher && (
                            <p className="text-secondary-text text-xs font-medium mt-0.5">{source.publisher}</p>
                          )}
                          {source.description && (
                            <p className="text-secondary-text text-xs mt-1 leading-relaxed">{source.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <Badge variant={categoryBadges[source.category]} size="sm">
                          {categoryLabels[source.category]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap">
                        {source.publicationDate ? (
                          <time dateTime={source.publicationDate}>{formatShortDate(source.publicationDate)}</time>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <time dateTime={source.accessDate}>{formatShortDate(source.accessDate)}</time>
                      </td>
                      <td className="font-mono text-xs text-secondary-text whitespace-nowrap">
                        {source.importBatchId ?? "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        {isSafeHttpUrl(source.url) ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-black text-sm font-medium"
                          >
                            Buka →
                          </a>
                        ) : (
                          <span className="text-secondary-text text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sources List - Card View (Mobile) */}
          <div className="lg:hidden space-y-4 mb-8" role="region" aria-label="Daftar sumber data tampilan kartu" tabIndex={0}>
            {filteredSources.map((source) => (
              <Card key={source.id}>
                <CardContent>
                  <DataSourceIndicator
                    source={{
                      id: source.id,
                      title: source.title,
                      publisher: source.publisher ?? undefined,
                      category: source.category,
                      publicationDate: source.publicationDate ?? undefined,
                      accessDate: source.accessDate,
                      url: isSafeHttpUrl(source.url) ? source.url : undefined,
                    }}
                    compact={false}
                    showCategory={true}
                  />
                  {source.description && (
                    <p className="text-xs text-secondary-text mt-2 leading-relaxed">{source.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="font-mono text-xs text-secondary-text">
                      Batch: {source.importBatchId ?? "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
