import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aiAdsGenerator.theme";

// Mirrors the inline blocking script in index.html — that script runs
// before paint to avoid a flash of the wrong theme; this just needs to
// agree with it once React mounts.
function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private browsing etc.) — fall through to
    // the system preference, same as index.html's inline script does.
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme just won't persist across reloads — toggling still works for
    // the current page life.
  }
}

/** [theme, toggleTheme] — 'light' | 'dark', persisted, applied to <html>. */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return [theme, toggleTheme];
}
