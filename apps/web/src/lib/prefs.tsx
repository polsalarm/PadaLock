"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DICT, type Lang, type MsgKey } from "./i18n";

/* ───────── Theme ───────── */

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "padalock.theme.v1";
export const LANG_KEY = "padalock.lang.v1";

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Inline boot script. Runs before first paint so a dark-mode user never sees a
 * white flash — the same reason it has to be a raw string rather than a hook.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"system";
var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.dataset.theme=d?"dark":"light";
document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;

/* ───────── Context ───────── */

interface Prefs {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MsgKey) => string;
}

const Ctx = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  // Server render and first client render must agree, so both start at the
  // defaults; the boot script has already painted the right colours, and the
  // effect below syncs React state to the stored choice.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [lang, setLangState] = useState<Lang>("en");
  const [system, setSystem] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeState(storedTheme);
    }
    const storedLang = window.localStorage.getItem(LANG_KEY);
    if (storedLang === "en" || storedLang === "fil") setLangState(storedLang);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystem(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? system : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "fil";
  }, [lang]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    window.localStorage.setItem(THEME_KEY, next);
    if (next === "system") setSystem(systemTheme());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(LANG_KEY, next);
  }, []);

  const t = useCallback((key: MsgKey) => DICT[lang][key], [lang]);

  const value = useMemo<Prefs>(
    () => ({ theme, resolvedTheme, setTheme, lang, setLang, t }),
    [theme, resolvedTheme, setTheme, lang, setLang, t]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}

/** Translator only — the common case, and it keeps call sites short. */
export function useT(): (key: MsgKey) => string {
  return usePrefs().t;
}
