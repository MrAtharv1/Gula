"use client";

import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  resolvedTheme: "light",

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("healthtrack-theme", theme);
    }
    const resolved = theme === "system" ? getSystemTheme() : theme;
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },

  initTheme: () => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem("healthtrack-theme") as ThemeMode) || "system";
    const resolved = stored === "system" ? getSystemTheme() : stored;
    applyTheme(resolved);
    set({ theme: stored, resolvedTheme: resolved });

    // Listen to OS theme changes if on system
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (get().theme === "system") {
        const currentSystem = getSystemTheme();
        applyTheme(currentSystem);
        set({ resolvedTheme: currentSystem });
      }
    };

    mediaQuery.addEventListener("change", handleChange);
  },
}));
