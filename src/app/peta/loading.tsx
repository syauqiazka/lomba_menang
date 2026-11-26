import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';

export default function Loading() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="map-heading">
        <div className="container-main">
          <header className="mb-8">
            <h1 id="map-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-3">
              Peta Nasional Bencana
            </h1>
            <p className="text-secondary-text text-lg max-w-2xl">
              Peta interaktif menampilkan sebaran bencana, status akses bantuan per wilayah,
              dan detail statistik dengan sumber terverifikasi.
            </p>
          </header>

          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="aspect-video bg-secondary-background relative" style={{ minHeight: "400px" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary border-t-transparent mb-4" aria-hidden="true" />
                  <p className="text-secondary-text">Memuat peta dan data wilayah...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-secondary-background rounded w-1/4" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-secondary-background rounded" />
                  ))}
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-secondary-background rounded w-3/4" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}