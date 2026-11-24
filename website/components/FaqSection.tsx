"use client";
import { useState } from "react";
import { useLocale } from "./LocaleContext";

const faqsEn = [
  {
    q: "Will this modify my Rekordbox library or Traktor collection.nml?",
    a: "Never. FZR Rekordbox Exporter only reads your exported file and creates brand-new standalone .nml, .xml, .m3u8, .cue, HTML Booth Prep, CSV and JSON files in a folder you choose. Your original DJ libraries are never touched.",
  },
  {
    q: "Can I import Serato .crate or VirtualDJ libraries too?",
    a: "Yes. Both the Windows desktop app and the 100% browser Online Web Deck natively parse binary Serato .crate files and VirtualDJ database.xml libraries alongside Rekordbox XML, Traktor NML, M3U8, TXT, and CSV.",
  },
  {
    q: "Does the Online Web Deck upload my files to any server?",
    a: "Never. The Online Web Deck runs 100% inside your browser's local memory via client-side JavaScript. Your playlists, metadata, and file paths never leave your computer.",
  },
  {
    q: "How do I connect Spotify without sharing a Client Secret?",
    a: "Create a free app at developer.spotify.com/dashboard, add http://127.0.0.1:7823/callback as a Redirect URI, and paste your Client ID into the desktop app. Authentication uses OAuth 2.0 PKCE directly from your PC.",
  },
  {
    q: "Windows SmartScreen warns when opening the installer — is it safe?",
    a: "Yes. Independent open-source Windows apps without a paid EV code-signing certificate trigger SmartScreen by default. Click 'More info' → 'Run anyway', or inspect and build the full MIT source code yourself from GitHub.",
  },
];

const faqsEs = [
  {
    q: "¿Modifica mi librería de Rekordbox o mi collection.nml de Traktor?",
    a: "Nunca. FZR Rekordbox Exporter solo lee el archivo que exportes y genera archivos .nml, .xml, .m3u8, .cue, Hoja HTML de Cabina, CSV y JSON independientes en la carpeta de destino que elijas. Tus librerías originales no se tocan.",
  },
  {
    q: "¿Puedo importar también archivos .crate de Serato o librerías de VirtualDJ?",
    a: "Sí. Tanto la app de escritorio para Windows como el Web Deck Online en el navegador leen de forma nativa archivos binarios .crate de Serato y database.xml de VirtualDJ, además de Rekordbox XML, Traktor NML, M3U8, TXT y CSV.",
  },
  {
    q: "¿El Web Deck Online sube mis archivos a algún servidor?",
    a: "Nunca. Todo el procesamiento del Web Deck Online ocurre 100% en la memoria local de tu navegador. Tus playlists, metadatos y rutas nunca salen de tu ordenador.",
  },
  {
    q: "¿Cómo conecto Spotify sin usar Client Secret?",
    a: "Crea una app gratuita en developer.spotify.com/dashboard, añade exactamente http://127.0.0.1:7823/callback como Redirect URI y pega tu Client ID en la app de escritorio. Usa OAuth 2.0 PKCE directamente desde tu ordenador.",
  },
  {
    q: "Windows SmartScreen muestra un aviso al instalar, ¿es seguro?",
    a: "Sí. Las apps open-source sin certificado comercial de firma de código muestran ese aviso en Windows. Pulsa «Más información» → «Ejecutar de todas formas», o compila el código fuente directamente desde GitHub.",
  },
];

export default function FaqSection() {
  const { locale } = useLocale();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const items = locale === "es" ? faqsEs : faqsEn;

  return (
    <section
      id="faq"
      className="py-24 relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-12">
          <p
            className="text-xs font-mono font-bold tracking-widest uppercase mb-4"
            style={{ color: "var(--rekordbox-blue)" }}
          >
            {locale === "es" ? "SOPORTE TÉCNICO" : "TECHNICAL FAQ"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight font-display">
            {locale === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, idx) => {
            const isOpen = openIdx === idx;
            const num = String(idx + 1).padStart(2, "0");
            return (
              <div
                key={item.q}
                className="deck-console rounded-2xl overflow-hidden transition-all relative"
                style={{
                  borderColor: isOpen ? "rgba(0,149,255,0.42)" : "rgba(255,255,255,0.07)",
                  boxShadow: isOpen ? "0 8px 28px rgba(0,149,255,0.1)" : "none",
                }}
              >
                {isOpen && (
                  <div
                    className="absolute top-0 bottom-0 left-0 w-[3px]"
                    style={{
                      background: "linear-gradient(180deg, #0095ff, #1db954)",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="font-mono text-xs font-bold flex-shrink-0"
                      style={{ color: isOpen ? "#5ec0ff" : "var(--text-subtle)" }}
                    >
                      {num}
                    </span>
                    <span className="font-semibold text-sm sm:text-base text-white">
                      {item.q}
                    </span>
                  </div>
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 transition-all duration-200"
                    style={{
                      background: isOpen ? "rgba(29,185,84,0.18)" : "rgba(255,255,255,0.05)",
                      color: isOpen ? "#46ee82" : "var(--text-muted)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="pl-12 sm:pl-14 pr-6 pb-5 text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
