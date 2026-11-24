"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "./LocaleContext";
import { FzrLogoMark } from "./BrandIcons";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, toggleLocale } = useLocale();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links =
    locale === "es"
      ? [
          ["Conversor Online", "#online-tool"],
          ["Características", "#features"],
          ["Cómo funciona", "#how-it-works"],
          ["Compatibilidad", "#compatibility"],
          ["FAQ", "#faq"],
        ]
      : [
          ["Online Deck", "#online-tool"],
          ["Features", "#features"],
          ["How it works", "#how-it-works"],
          ["Compatibility", "#compatibility"],
          ["FAQ", "#faq"],
        ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2.5" : "py-4"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-2.5 rounded-2xl transition-all duration-300 ${
            scrolled ? "glass shadow-2xl" : "bg-transparent border border-transparent"
          }`}
        >
          {/* Brand Logo */}
          <Link href="#hero" className="flex items-center gap-2.5 group">
            <FzrLogoMark size={30} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black tracking-tight gradient-text font-display">
                FZR
              </span>
              <span className="text-white/80 font-semibold text-xs sm:text-sm hidden sm:inline group-hover:text-white transition-colors">
                Rekordbox Exporter
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{ color: "var(--text-muted)" }}
                className="hover:text-white transition-colors font-medium text-[13px]"
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={toggleLocale}
              className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold glass hover:border-white/25 transition-colors cursor-pointer"
              style={{ color: "var(--text-primary)" }}
              aria-label="Switch language"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>
            <Link
              href="#download"
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 hover:brightness-110 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #1db954, #17a348)",
                color: "#021107",
                boxShadow: "0 4px 18px rgba(29,185,84,0.3)",
              }}
            >
              {locale === "es" ? "Descargar App" : "Download App"}
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-bold glass"
              style={{ color: "var(--text-primary)" }}
            >
              {locale === "en" ? "ES" : "EN"}
            </button>
            <button
              type="button"
              className="flex flex-col gap-1 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span
                className={`block h-0.5 w-5 bg-white transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 bg-white transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden glass mt-2 rounded-2xl p-4 flex flex-col gap-3">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{ color: "var(--text-muted)" }}
                className="hover:text-white transition-colors py-1 text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="#download"
              className="text-center mt-1 px-4 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "var(--spotify-green)", color: "#021107" }}
              onClick={() => setMenuOpen(false)}
            >
              {locale === "es" ? "Descargar App" : "Download App"}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
