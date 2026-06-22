import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FZR Rekordbox Exporter — Export to Spotify & Traktor",
  description:
    "Export your Rekordbox playlists and folders to Spotify and Traktor in seconds. Free, offline, open source Windows app. Supports XML, M3U8 and TXT exports.",
  keywords: [
    "rekordbox export",
    "rekordbox to spotify",
    "rekordbox to traktor",
    "dj playlist export",
    "rekordbox xml",
    "pioneer dj",
    "native instruments",
    "traktor nml",
    "fzr",
  ],
  openGraph: {
    title: "FZR Rekordbox Exporter",
    description: "Export your Rekordbox playlists to Spotify & Traktor",
    type: "website",
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
