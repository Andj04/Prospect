import { useCallback, useEffect, useSyncExternalStore } from "react";

// Préférences propres à ce navigateur (thème, favoris). Stockées en
// localStorage : pratiques mais jamais indispensables — tout fonctionne sans.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la préférence ne sera simplement pas mémorisée */
  }
  window.dispatchEvent(new CustomEvent("prefs-change", { detail: key }));
}

function subscribe(cb: () => void) {
  const onStorage = () => cb();
  window.addEventListener("prefs-change", onStorage);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("prefs-change", onStorage);
    window.removeEventListener("storage", onStorage);
  };
}

/* ---------------------------- Thème ---------------------------- */

export type ThemeChoice = "light" | "dark" | "system";
const THEME_KEY = "ab-theme";

function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

let themeSnapshot: ThemeChoice = "system";
function getTheme(): ThemeChoice {
  const next = read<ThemeChoice>(THEME_KEY, "system");
  if (next !== themeSnapshot) themeSnapshot = next;
  return themeSnapshot;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "system" as ThemeChoice);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => write(THEME_KEY, t), []);
  return { theme, setTheme };
}

/* --------------------------- Favoris --------------------------- */

const favKey = (userId: string) => `ab-favoris-${userId}`;
const favCache = new Map<string, { raw: string; value: string[] }>();

function getFavorites(userId: string): string[] {
  let raw = "[]";
  try {
    raw = localStorage.getItem(favKey(userId)) ?? "[]";
  } catch {
    /* ignoré */
  }
  const cached = favCache.get(userId);
  if (cached && cached.raw === raw) return cached.value;
  const value = read<string[]>(favKey(userId), []);
  favCache.set(userId, { raw, value });
  return value;
}

const EMPTY: string[] = [];

export function useFavorites(userId: string | undefined) {
  const favorites = useSyncExternalStore(
    subscribe,
    () => (userId ? getFavorites(userId) : EMPTY),
    () => EMPTY,
  );

  const toggle = useCallback(
    (companyId: string) => {
      if (!userId) return;
      const current = getFavorites(userId);
      write(
        favKey(userId),
        current.includes(companyId)
          ? current.filter((id) => id !== companyId)
          : [...current, companyId],
      );
    },
    [userId],
  );

  return { favorites, isFavorite: (id: string) => favorites.includes(id), toggle };
}
