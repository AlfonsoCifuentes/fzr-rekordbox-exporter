"use client";

import { useState, useEffect } from "react";

export const GITHUB_REPO = "https://github.com/AlfonsoCifuentes/fzr-rekordbox-exporter";
const LATEST_RELEASE_API =
  "https://api.github.com/repos/AlfonsoCifuentes/fzr-rekordbox-exporter/releases/latest";

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
  tagName: "v1.1.0",
  version: "1.1.0",
  releaseUrl: `${GITHUB_REPO}/releases/latest`,
  exeUrl: `${GITHUB_REPO}/releases/download/v1.1.0/FZR-Rekordbox-Exporter-1.1.0-x64.exe`,
  exeSizeMb: "~90 MB",
  zipUrl: `${GITHUB_REPO}/releases/download/v1.1.0/FZR-Rekordbox-Exporter-1.1.0-x64.zip`,
  zipSizeMb: null,
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
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !data.tag_name) return;
        const assets: Array<{ name: string; browser_download_url: string; size?: number }> =
          Array.isArray(data.assets) ? data.assets : [];

        const exeAsset = assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
        const zipAsset = assets.find((a) => a.name.toLowerCase().endsWith(".zip"));
        const tag = String(data.tag_name);
        const version = tag.replace(/^v/i, "");

        setRelease({
          tagName: tag,
          version,
          releaseUrl: data.html_url || `${GITHUB_REPO}/releases/tag/${tag}`,
          exeUrl: exeAsset?.browser_download_url || `${GITHUB_REPO}/releases/latest`,
          exeSizeMb: formatMb(exeAsset?.size),
          zipUrl: zipAsset?.browser_download_url || null,
          zipSizeMb: formatMb(zipAsset?.size),
        });
      })
      .catch(() => {
        // Keep fallback release silently
      });

    return () => {
      active = false;
    };
  }, []);

  return release;
}
