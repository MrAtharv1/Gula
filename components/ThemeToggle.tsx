"use client";

import { useThemeStore, type ThemeMode } from "@/lib/store/themeStore";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Full segmented theme toggle — used on the Settings page. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  const options: {
    mode: ThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "system", label: "Auto", icon: Monitor },
    { mode: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-[10px]",
        "bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]",
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
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
              "text-[13px] font-medium transition-[background-color,color,border-color] duration-[120ms] ease-out",
              "cursor-pointer select-none border",
              isSelected
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact single-button theme cycle: Light → Auto → Dark → Light.
 *  Used in the sidebar bottom to avoid overflow. Shows tooltip.
 */
export function ThemeIconButton({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  const cycle: ThemeMode[] = ["light", "system", "dark"];
  const nextTheme = cycle[(cycle.indexOf(theme) + 1) % cycle.length];

  const icons: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
    light: Sun,
    system: Monitor,
    dark: Moon,
  };

  const labels: Record<ThemeMode, string> = {
    light: "Light theme (click for Auto)",
    system: "Auto theme (click for Dark)",
    dark: "Dark theme (click for Light)",
  };

  const Icon = icons[theme];

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      title={labels[theme]}
      aria-label={labels[theme]}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg",
        "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
        "hover:bg-[var(--bg-card-subtle)]",
        "transition-[background-color,color] duration-[120ms] ease-out",
        "cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        className
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
