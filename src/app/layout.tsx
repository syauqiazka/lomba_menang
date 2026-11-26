import type { Metadata, Viewport } from "next";
import { Newsreader, Roboto, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Transparansi Bantuan Bencana Indonesia",
  description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia. Pantau lokasi bencana, status akses bantuan, dan sumber informasi resmi.",
  metadataBase: new URL("https://bismillah-menang.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Transparansi Bantuan Bencana Indonesia",
    description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia.",
    type: "website",
    locale: "id_ID",
    siteName: "Transparansi Bantuan Bencana",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transparansi Bantuan Bencana Indonesia",
    description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${newsreader.variable} ${roboto.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}