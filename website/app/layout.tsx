import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fzr-rekordbox-exporter.pages.dev"),
  title: "FZR Rekordbox Exporter — Rekordbox ⇄ Traktor Pro ⇄ Spotify",
  description:
    "Bidirectional DJ library hub. Convert Rekordbox XML/M3U8/TXT, Traktor NML v19 and Streaming CSV with Hot Cues, Camelot harmonic analysis, BPM curves and Spotify PKCE review. 100% local & open source.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/app-icon.png", type: "image/png" }],
  },
  keywords: [
    "rekordbox export",
    "rekordbox to spotify",
    "rekordbox to traktor",
    "traktor to rekordbox",
    "dj playlist converter",
    "rekordbox xml",
    "traktor nml",
    "camelot harmonic mixing",
    "fzr",
  ],
  openGraph: {
    title: "FZR Rekordbox Exporter — Bidirectional DJ Library Hub",
    description:
      "Convert playlists between Rekordbox, Traktor Pro & Spotify with Hot Cues, Camelot harmonic sorting & online browser converter. 100% local & open source.",
    type: "website",
    url: "https://fzr-rekordbox-exporter.pages.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "FZR Rekordbox Exporter",
    description: "Rekordbox ⇄ Traktor Pro ⇄ Spotify — 100% Local DJ Hub.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
