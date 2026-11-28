import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
import { LinkButton } from "@/components/ui/Button";
import type { CaseStudyDetail } from "@/lib/case-studies";

const typeLabelMap = {
  event: { label: "Kejadian", badge: "danger" as const },
  response: { label: "Respons", badge: "safe" as const },
  issue: { label: "Isu", badge: "warning" as const },
  recovery: { label: "Pemulihan", badge: "default" as const },
};

function isSafeHttpUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function CaseStudyDetailView({ caseStudy }: { caseStudy: CaseStudyDetail }) {
  return (
    <section className="py-12 md:py-16 bg-background" aria-labelledby="case-heading">
      <div className="container-main">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb studi kasus" className="mb-6 text-xs text-secondary-text flex items-center gap-1.5">
          <Link href="/" className="hover:text-primary hover:underline">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/kasus" className="hover:text-primary hover:underline">
            Studi Kasus
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-primary font-medium">{caseStudy.shortTitle}</span>
        </nav>

        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-2 text-sm text-secondary-text mb-4">
            <Badge variant="default">Studi Kasus</Badge>
            <Badge variant={caseStudy.eventType === "geological" ? "warning" : "safe"}>
              {caseStudy.eventType === "geological" ? "Geologis" : "Hidrometeorologis"}
            </Badge>
            <Badge variant={caseStudy.status === "active" ? "safe" : "neutral"}>
              {caseStudy.statusLabel}
            </Badge>
            <time dateTime={caseStudy.isoDate} className="font-mono text-xs px-2 py-0.5 rounded bg-secondary-background border border-border">
              {caseStudy.dateLabel}
            </time>
            <span className="text-xs text-secondary-text">· {caseStudy.region}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 id="case-heading" className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
                {caseStudy.title}
              </h1>
              <p className="text-secondary-text text-lg max-w-3xl leading-relaxed">
                {caseStudy.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <LinkButton href={`/peta?prov=${encodeURIComponent(caseStudy.provinceCode)}`} size="md">
                Buka di Peta Interaktif →
              </LinkButton>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg border border-border bg-secondary-background text-sm text-secondary-text max-w-4xl">
            <strong className="text-primary">Provenansi Data Resmi:</strong> {caseStudy.dataNotice}
          </div>
        </header>

        {/* Official Impact Statistics */}
        <section aria-labelledby="stats-heading" className="mb-16">
          <h2 id="stats-heading" className="font-display font-semibold text-2xl text-primary mb-6">
            Statistik Dampak Resmi
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {caseStudy.stats.map((stat) => (
              <StatisticDisplay key={stat.key} data={stat} variant="featured" />
            ))}
          </div>
        </section>

        {/* Affected Regions Table */}
        <section aria-labelledby="regions-heading" className="mb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 id="regions-heading" className="font-display font-semibold text-2xl text-primary">
              Wilayah Terdampak ({caseStudy.affectedRegions.length} Kab/Kota)
            </h2>
            <Link
              href={`/peta?prov=${encodeURIComponent(caseStudy.provinceCode)}`}
              className="text-sm font-medium text-primary underline hover:text-black"
            >
              Lihat detail wilayah di peta →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <div className="table-container">
              <table role="table">
                <thead>
                  <tr>
                    <th scope="col">Kode BPS</th>
                    <th scope="col">Kabupaten/Kota</th>
                    <th scope="col">Status Akses &amp; Bantuan</th>
                    <th scope="col" className="text-right">Ringkasan Dampak</th>
                    <th scope="col">Catatan Resmi</th>
                  </tr>
                </thead>
                <tbody>
                  {caseStudy.affectedRegions.map((region) => {
                    const summaryParts: string[] = [];
                    if (region.affectedCount > 0) {
                      summaryParts.push(`${region.affectedCount.toLocaleString("id-ID")} terdampak`);
                    }
                    if (region.damagedHouses > 0) {
                      summaryParts.push(`${region.damagedHouses.toLocaleString("id-ID")} rumah rusak`);
                    }
                    if (region.displacedCount > 0) {
                      summaryParts.push(`${region.displacedCount.toLocaleString("id-ID")} mengungsi`);
                    }
                    if ((region.severedAccessPoints ?? 0) > 0) {
                      summaryParts.push(`${region.severedAccessPoints} titik akses putus`);
                    }

                    return (
                      <tr key={region.code}>
                        <td className="font-mono text-sm whitespace-nowrap">{region.code}</td>
                        <td className="font-medium whitespace-nowrap">
                          <Link
                            href={`/peta?prov=${encodeURIComponent(region.code.slice(0, 2))}`}
                            className="hover:underline"
                          >
                            {region.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge status={region.statusLabel} />
                        </td>
                        <td className="text-right font-mono text-xs text-primary whitespace-nowrap">
                          {summaryParts.length > 0 ? summaryParts.join(" · ") : "—"}
                        </td>
                        <td className="text-secondary-text text-xs max-w-md">{region.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section aria-labelledby="timeline-heading" className="mb-16">
          <h2 id="timeline-heading" className="font-display font-semibold text-2xl text-primary mb-8">
            Kronologi Kejadian
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />
            <dl className="space-y-8">
              {caseStudy.timeline.map((item, index) => (
                <div key={index} className="relative flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-background flex items-center justify-center relative z-10">
                    <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 pl-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <time className="text-sm font-medium text-primary font-mono">{item.date}</time>
                      <Badge variant={typeLabelMap[item.type].badge} size="sm">
                        {typeLabelMap[item.type].label}
                      </Badge>
                    </div>
                    <h3 className="font-display font-semibold text-lg text-primary">{item.title}</h3>
                    <p className="text-secondary-text text-sm mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Official Sources */}
        <section aria-labelledby="evidence-heading" className="mb-16">
          <h2 id="evidence-heading" className="font-display font-semibold text-2xl text-primary mb-6">
            Sumber Resmi &amp; Rujukan Data
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {caseStudy.sources.map((src) => (
              <Card key={src.id} className="hover:border-primary transition-colors">
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Badge variant="safe" size="sm" className="flex-shrink-0 mt-0.5">
                      Resmi
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-primary leading-snug">{src.title}</h3>
                      {src.description && (
                        <p className="text-secondary-text text-sm mt-1.5 leading-relaxed">{src.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-text">
                        {src.publisher && <span>Penerbit: {src.publisher}</span>}
                        {src.publicationDate && <span>Terbit: {formatShortDate(src.publicationDate)}</span>}
                        <span>Diakses: {formatShortDate(src.accessDate)}</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs">
                        {isSafeHttpUrl(src.url) && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium underline hover:text-black"
                          >
                            Buka endpoint resmi →
                          </a>
                        )}
                        <Link href="/sumber" className="text-secondary-text underline hover:text-primary">
                          Lihat Registri Sumber
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Case Study Methodology */}
        <section aria-labelledby="case-methodology-heading" className="mb-16">
          <h2 id="case-methodology-heading" className="font-display font-semibold text-2xl text-primary mb-6">
            Metodologi &amp; Keterbatasan Studi Kasus
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent>
                <h3 className="font-display font-semibold text-base text-primary mb-3">Pengumpulan Data</h3>
                <ul className="list-disc list-inside text-secondary-text text-sm space-y-2">
                  {caseStudy.methodology.dataCollection.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="font-display font-semibold text-base text-primary mb-3">Penetapan Status</h3>
                <ul className="list-disc list-inside text-secondary-text text-sm space-y-2">
                  {caseStudy.methodology.validation.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="font-display font-semibold text-base text-primary mb-3">Keterbatasan Diketahui</h3>
                <ul className="list-disc list-inside text-secondary-text text-sm space-y-2">
                  {caseStudy.methodology.limitations.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <LinkButton variant="secondary" href="/kasus">
            ← Semua Studi Kasus
          </LinkButton>
          <LinkButton href={`/peta?prov=${encodeURIComponent(caseStudy.provinceCode)}`}>
            Lihat di Peta Nasional →
          </LinkButton>
          <LinkButton variant="secondary" href="/bantu">
            Saluran Bantuan Resmi →
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
