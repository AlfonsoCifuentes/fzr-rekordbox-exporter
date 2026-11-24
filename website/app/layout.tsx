import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fzr-rekordbox-exporter.pages.dev"),
  title: "FZR Rekordbox Exporter — Export to Traktor & Spotify",
  description:
    "Export your Rekordbox playlists and folders to Traktor Pro (NML v19 with cue points, BPM & Open Key) and Spotify (fuzzy matching & manual review). Free, local, open source Windows app.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  keywords: [
    "rekordbox export",
    "rekordbox to spotify",
    "rekordbox to traktor",
    "dj playlist export",
    "rekordbox xml",
    "traktor nml",
    "pioneer dj",
    "native instruments",
    "fzr",
  ],
  openGraph: {
    title: "FZR Rekordbox Exporter — Export to Traktor & Spotify",
    description:
      "Convert Rekordbox XML, M3U8 & TXT playlists to native Traktor Pro NML v19 and Spotify playlists. 100% local & open source.",
    type: "website",
    url: "https://fzr-rekordbox-exporter.pages.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "FZR Rekordbox Exporter",
    description: "Export Rekordbox playlists to Traktor Pro & Spotify in one click.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
