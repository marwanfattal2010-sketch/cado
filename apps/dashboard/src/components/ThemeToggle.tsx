"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type ThemeName = "midnight" | "paper";
export const THEME_STORAGE_KEY = "cado-theme";

/**
 * Theme toggle. Midnight is the default; the choice is remembered per browser.
 *
 * The actual first paint is set by a tiny inline script in the root layout, not
 * here — a React effect runs after hydration, which would show one frame of the
 * wrong theme on every load. That flash is the whole reason theme switches feel
 * cheap, so it is handled before the page renders and this component only deals
 * with the change.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>("paper");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "paper" || current === "midnight") setTheme(current);
  }, []);

  const flip = () => {
    const next: ThemeName = theme === "midnight" ? "paper" : "midnight";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode: the toggle still works for this session */
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "midnight" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "midnight" ? "Light theme" : "Dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-card text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
    >
      {theme === "midnight" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
