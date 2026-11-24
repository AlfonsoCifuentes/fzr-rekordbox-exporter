"use client";
import { useState } from "react";
import { useLocale } from "./LocaleContext";

const faqsEn = [
  {
    q: "Will this modify my Rekordbox library or Traktor collection.nml?",
    a: "Never. FZR Rekordbox Exporter only reads your exported file and creates brand-new standalone .nml, .m3u8, CSV and JSON files in a folder you choose. Your original libraries are never touched.",
  },
  {
    q: "How do I connect Spotify without sharing a Client Secret?",
    a: "Create a free app at developer.spotify.com/dashboard, add http://127.0.0.1:7823/callback as a Redirect URI, and paste your Client ID into the app. Authentication uses OAuth 2.0 PKCE directly from your PC.",
  },
  {
    q: "Why are some underground tracks or bootlegs not found on Spotify?",
    a: "Private edits, promos, Bandcamp exclusives and bootlegs don't exist in Spotify's streaming catalog. FZR highlights these in the manual review screen so you can search alternate versions or skip them, and logs every unmatched track in your CSV/JSON report.",
  },
  {
    q: "Windows SmartScreen warns when opening the installer — is it safe?",
    a: "Yes. Independent open-source Windows apps without a paid EV code-signing certificate trigger SmartScreen by default. Click 'More info' → 'Run anyway', or inspect and build the full MIT source code yourself from GitHub.",
  },
];

const faqsEs = [
  {
    q: "¿Modifica mi librería de Rekordbox o mi collection.nml de Traktor?",
    a: "Nunca. FZR Rekordbox Exporter solo lee el archivo que exportes y genera archivos .nml, .m3u8, CSV y JSON independientes en la carpeta de destino que elijas.",
  },
  {
    q: "¿Cómo conecto Spotify sin usar Client Secret?",
    a: "Crea una app gratuita en developer.spotify.com/dashboard, añade exactamente http://127.0.0.1:7823/callback como Redirect URI y pega tu Client ID en la app. Usa OAuth 2.0 PKCE directamente desde tu ordenador.",
  },
  {
    q: "¿Por qué algunos bootlegs o promos no aparecen en Spotify?",
    a: "Los edits privados, promos y exclusivos de Bandcamp no están en el catálogo de Spotify. La pantalla de revisión manual te permite buscar versiones alternativas u omitirlos, y todos quedan registrados en el informe CSV/JSON.",
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
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--rekordbox-blue)" }}
          >
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            {locale === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="glass rounded-2xl overflow-hidden transition-all"
                style={{
                  borderColor: isOpen ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-semibold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                    {item.q}
                  </span>
                  <span
                    className="text-lg font-bold flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: "var(--spotify-green)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="px-6 pb-5 text-sm leading-relaxed"
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
