import { MainLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <MainLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <EmptyState
          title="Halaman Tidak Ditemukan"
          description="Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan. Silakan kembali ke beranda atau gunakan navigasi di atas."
          action={{
            label: "Kembali ke Beranda",
            href: "/",
            variant: "primary",
          }}
        />
      </div>
    </MainLayout>
  );
}