"use client";

import { useState, useEffect } from "react";

export const GITHUB_REPO = "https://github.com/AlfonsoCifuentes/fzr-rekordbox-exporter";
const LATEST_RELEASE_API =
  "https://api.github.com/repos/AlfonsoCifuentes/fzr-rekordbox-exporter/releases/latest";

// Permanent GitHub Releases 302-redirect URLs that ALWAYS point to the newest release's binaries
export const ALWAYS_LATEST_EXE_URL = `${GITHUB_REPO}/releases/latest/download/FZR-Rekordbox-Exporter-Setup-x64.exe`;
export const ALWAYS_LATEST_ZIP_URL = `${GITHUB_REPO}/releases/latest/download/FZR-Rekordbox-Exporter-Portable-x64.zip`;

export type ReleaseInfo = {
  tagName: string;
  version: string;
  releaseUrl: string;
  exeUrl: string;
  exeSizeMb: string | null;
  zipUrl: string | null;
  zipSizeMb: string | null;
};

const FALLBACK_RELEASE: ReleaseInfo = {
  tagName: "v2.1.0",
  version: "2.1.0",
  releaseUrl: `${GITHUB_REPO}/releases/latest`,
  exeUrl: ALWAYS_LATEST_EXE_URL,
  exeSizeMb: "~75 MB",
  zipUrl: ALWAYS_LATEST_ZIP_URL,
  zipSizeMb: "~104 MB",
};

function formatMb(bytes: number | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function useLatestRelease(): ReleaseInfo {
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);

  useEffect(() => {
    let active = true;
    fetch(LATEST_RELEASE_API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !data.tag_name) return;
        const assets: Array<{ name: string; browser_download_url: string; size?: number }> =
          Array.isArray(data.assets) ? data.assets : [];

        // Prefer versioned .exe / .zip asset (e.g. FZR-Rekordbox-Exporter-2.1.0-x64.exe), fall back to alias
        const exeAsset =
          assets.find(
            (a) =>
              a.name.toLowerCase().endsWith(".exe") &&
              !a.name.toLowerCase().includes("setup-x64")
          ) ?? assets.find((a) => a.name.toLowerCase().endsWith(".exe"));

        const zipAsset =
          assets.find(
            (a) =>
              a.name.toLowerCase().endsWith(".zip") &&
              !a.name.toLowerCase().includes("portable-x64")
          ) ?? assets.find((a) => a.name.toLowerCase().endsWith(".zip"));

        const tag = String(data.tag_name);
        const version = tag.replace(/^v/i, "");

        setRelease({
          tagName: tag,
          version,
          releaseUrl: data.html_url || `${GITHUB_REPO}/releases/latest`,
          exeUrl: exeAsset?.browser_download_url || ALWAYS_LATEST_EXE_URL,
          exeSizeMb: formatMb(exeAsset?.size) ?? FALLBACK_RELEASE.exeSizeMb,
          zipUrl: zipAsset?.browser_download_url || ALWAYS_LATEST_ZIP_URL,
          zipSizeMb: formatMb(zipAsset?.size),
        });
      })
      .catch(() => {
        // Fallback already points to GitHub's permanent /releases/latest/download/ redirect
      });

    return () => {
      active = false;
    };
  }, []);

  return release;
}
