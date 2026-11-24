"use client";

import React, { createContext, useContext, useSyncExternalStore, useCallback } from "react";

export type Locale = "en" | "es";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
};

const STORAGE_KEY = "fzr-locale";
const listeners = new Set<() => void>();

function readClientLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
    if (navigator.language?.toLowerCase().startsWith("es")) return "es";
  } catch {
    // ignore storage errors
  }
  return "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readClientLocale, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    listeners.forEach((cb) => cb());
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "es" : "en");
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
