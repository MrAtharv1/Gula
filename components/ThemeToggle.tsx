"use client";

import { useThemeStore, type ThemeMode } from "@/lib/store/themeStore";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  const options: { mode: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "system", label: "Auto", icon: Monitor },
    { mode: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className={cn(
        "inline-flex items-center p-1 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-xs font-medium",
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            onClick={() => setTheme(opt.mode)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer tap-target select-none",
              isSelected
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
