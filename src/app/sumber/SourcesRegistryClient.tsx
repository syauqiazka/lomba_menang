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

const categoryFilters = [
  { value: "", label: "Semua Kategori" },
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

  return (
    <>
      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="search-sources" className="block text-sm font-medium text-primary mb-1">
                Cari Sumber
              </label>
              <input
                type="search"
                id="search-sources"
                placeholder="Judul, penerbit, atau URL..."
                className="input-field"
                aria-label="Cari sumber data"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-secondary-text mt-3" aria-live="polite">
            Menampilkan {filteredSources.length} dari {sources.length} sumber terdaftar.
          </p>
        </CardContent>
      </Card>

      {filteredSources.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <p className="text-primary font-medium mb-1">Tidak ada sumber yang cocok dengan filter.</p>
            <p className="text-secondary-text text-sm">Coba ubah kategori atau kata kunci pencarian.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sources List - Table View (Desktop) */}
          <div className="hidden lg:block mb-8" role="region" aria-label="Daftar sumber data tampilan tabel" tabIndex={0}>
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
                      <td>
                        <div>
                          <p className="font-medium text-primary">{source.title}</p>
                          {source.publisher && <p className="text-secondary-text text-sm">{source.publisher}</p>}
                        </div>
                      </td>
                      <td>
                        <Badge variant={categoryBadges[source.category]}>
                          {categoryLabels[source.category]}
                        </Badge>
                      </td>
                      <td>
                        {source.publicationDate ? (
                          <time dateTime={source.publicationDate}>{formatShortDate(source.publicationDate)}</time>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <time dateTime={source.accessDate}>{formatShortDate(source.accessDate)}</time>
                      </td>
                      <td className="font-mono text-sm text-secondary-text">{source.importBatchId ?? "—"}</td>
                      <td>
                        {isSafeHttpUrl(source.url) ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-black text-sm"
                          >
                            Buka
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
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="font-mono text-xs text-secondary-text">{source.importBatchId ?? "—"}</span>
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
