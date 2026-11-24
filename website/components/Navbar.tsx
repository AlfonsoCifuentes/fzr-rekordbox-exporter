"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "./LocaleContext";

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
          ["Online Tool", "#online-tool"],
          ["Features", "#features"],
          ["How it works", "#how-it-works"],
          ["Compatibility", "#compatibility"],
          ["FAQ", "#faq"],
        ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-3 shadow-lg" : "py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="#hero" className="flex items-center gap-2 group">
          <span
            className="text-xl font-black tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #005bff 0%, #e8eaf0 50%, #1db954 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            FZR
          </span>
          <span className="text-white font-semibold text-sm hidden sm:block opacity-80 group-hover:opacity-100 transition-opacity">
            Rekordbox Exporter
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {links.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{ color: "var(--text-muted)" }}
              className="hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleLocale}
            className="px-2.5 py-1 rounded-full text-xs font-semibold glass hover:border-white/25 transition-colors cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            aria-label="Switch language"
          >
            {locale === "en" ? "ES" : "EN"}
          </button>
          <Link
            href="#download"
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 hover:brightness-110"
            style={{
              background: "var(--spotify-green)",
              color: "#000",
            }}
          >
            {locale === "es" ? "Descargar" : "Download"}
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLocale}
            className="px-2.5 py-1 rounded-full text-xs font-semibold glass"
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
        <div className="md:hidden glass mt-2 mx-4 rounded-xl p-4 flex flex-col gap-3">
          {links.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{ color: "var(--text-muted)" }}
              className="hover:text-white transition-colors py-1"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href="#download"
            className="text-center mt-1 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "var(--spotify-green)", color: "#000" }}
            onClick={() => setMenuOpen(false)}
          >
            {locale === "es" ? "Descargar" : "Download"}
          </Link>
        </div>
      )}
    </nav>
  );
}
