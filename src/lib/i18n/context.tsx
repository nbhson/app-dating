"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { dictionaries, type Locale, type Dictionary } from "./dictionaries";

const STORAGE_KEY = "lumen_locale";
const COOKIE_KEY = "NEXT_LOCALE";
const DEFAULT_LOCALE: Locale = "vi";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
  trans: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getNested(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // hydrate from storage/cookie
  useEffect(() => {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith(COOKIE_KEY + "="))
        ?.split("=")[1] as Locale | undefined;
      const stored = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? cookie;
      if (stored === "vi" || stored === "en") {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      } else {
        // default vi: persist
        localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
        document.cookie = `${COOKIE_KEY}=${DEFAULT_LOCALE}; path=/; max-age=31536000`;
        document.documentElement.lang = DEFAULT_LOCALE;
      }
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000`;
      document.documentElement.lang = l;
    } catch {}
  }, []);

  const dict = dictionaries[locale] as Dictionary;

  // also keep html lang in sync
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const trans = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const raw = getNested(dict as any, key);
      if (raw == null) return key;
      return interpolate(raw, params);
    },
    [dict]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t: dict, trans }), [locale, setLocale, dict, trans]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
