"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary-background border-t border-border mt-auto" role="contentinfo">
      <div className="container-main py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Transparansi Bantuan Bencana</h3>
            <p className="text-secondary-text text-sm leading-relaxed">
              Platform transparansi informasi bencana dan distribusi bantuan di Indonesia.
              Membantu masyarakat memahami lokasi bencana, status akses bantuan, dan sumber informasi resmi.
            </p>
          </div>

          <nav aria-label="Navigasi halaman">
            <h4 className="font-semibold mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-secondary-text hover:text-primary transition-colors">Beranda</Link></li>
              <li><Link href="/peta" className="text-secondary-text hover:text-primary transition-colors">Peta Nasional</Link></li>
              <li><Link href="/kasus/ntt-2026" className="text-secondary-text hover:text-primary transition-colors">Kasus Flores NTT 2026</Link></li>
              <li><Link href="/metodologi" className="text-secondary-text hover:text-primary transition-colors">Metodologi</Link></li>
              <li><Link href="/sumber" className="text-secondary-text hover:text-primary transition-colors">Sumber Data</Link></li>
              <li><Link href="/bantu" className="text-secondary-text hover:text-primary transition-colors">Saluran Bantuan Resmi</Link></li>
            </ul>
          </nav>

          <div>
            <h4 className="font-semibold mb-4">Informasi Penting</h4>
            <ul className="space-y-2 text-sm text-secondary-text">
              <li>Platform ini <strong className="text-primary">tidak mengumpulkan donasi</strong>.</li>
              <li>Data bersumber dari instansi resmi, media terpercaya, dan penelitian.</li>
              <li>Setiap statistik menampilkan tanggal data dan sumbernya.</li>
              <li>Lokasi korban tidak ditampilkan secara detail demi privasi.</li>
            </ul>
            <p className="mt-4 text-xs text-secondary-text">
              © {currentYear} Transparansi Bantuan Bencana Indonesia. Hak cipta dilindungi.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-xs text-secondary-text">
          <p>
            Dibangun untuk transparansi dan akuntabilitas informasi bencana.
            <Link href="/metodologi" className="ml-2 underline hover:text-primary">Lihat metodologi</Link>
            {" | "}
            <Link href="/sumber" className="underline hover:text-primary">Lihat sumber data</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}