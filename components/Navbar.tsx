"use client";

import React from "react";
import { Home, TrendingUp, Settings, Plus, ShieldCheck } from "lucide-react";
import { ThemeIconButton } from "./ThemeToggle";
import { cn } from "@/lib/utils/cn";

export type NavTab = "home" | "trends" | "settings";

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
}

/** Desktop sidebar: 240px, 12px padding, 36px items, 14px text, 16px icons.
 *  Bottom: compact theme icon button (no overflow).
 *  Mobile: bottom tab bar with 44px+ tap targets and safe-area padding.
 */
export function Navbar({ activeTab, onSelectTab, onOpenUpload }: NavbarProps) {
  const navTabs = [
    { id: "home" as NavTab, label: "Home", icon: Home },
    { id: "trends" as NavTab, label: "Trends", icon: TrendingUp },
    { id: "settings" as NavTab, label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col",
          "w-60 shrink-0",           /* 240px */
          "border-r border-[var(--border-subtle)]",
          "bg-[var(--bg-primary)]",
          "overflow-hidden",          /* nothing may overflow its container */
          "px-3 py-3",               /* 12px padding */
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-1.5 mb-5 mt-1">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-[13px] shrink-0">
            G
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] leading-tight">
              Gula
            </p>
            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 leading-tight mt-0.5">
              <ShieldCheck className="w-3 h-3 text-[var(--status-normal-dot)] shrink-0" />
              Local &amp; Private
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5" aria-label="Main navigation">
          {navTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg",
                  "text-[14px] font-medium transition-[background-color,color] duration-[120ms] ease-out",
                  "cursor-pointer select-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                  isActive
                    ? "bg-[var(--bg-card-subtle)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)]/60 hover:text-[var(--text-primary)]"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    "w-4 h-4",   /* 16px icons */
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: compact theme icon only — never overflows */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between px-1">
          <span className="text-[11px] text-[var(--text-muted)]">
            {/* intentionally empty label — tooltip on button */}
          </span>
          <ThemeIconButton />
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ─────────────────────────────── */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40",
          "bg-[var(--bg-primary)]/95 backdrop-blur-md",
          "border-t border-[var(--border-subtle)]",
          "flex items-end justify-around",
          "px-2",
          "pb-[env(safe-area-inset-bottom)]",  /* safe-area padding */
        )}
        aria-label="Mobile navigation"
      >
        {/* Home */}
        <button
          onClick={() => onSelectTab("home")}
          className={cn(
            "flex flex-col items-center justify-center gap-1",
            "h-14 min-w-[44px] px-3",    /* 44px+ tap target */
            "text-[11px] font-medium transition-colors duration-[120ms]",
            "cursor-pointer select-none",
            activeTab === "home"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          )}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* Trends */}
        <button
          onClick={() => onSelectTab("trends")}
          className={cn(
            "flex flex-col items-center justify-center gap-1",
            "h-14 min-w-[44px] px-3",
            "text-[11px] font-medium transition-colors duration-[120ms]",
            "cursor-pointer select-none",
            activeTab === "trends"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          )}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Trends</span>
        </button>

        {/* Add — center, elevated */}
        <button
          onClick={onOpenUpload}
          aria-label="Add report"
          className={cn(
            "flex flex-col items-center justify-center",
            "-mt-4 mb-1",
            "w-12 h-12 rounded-full",
            "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]",
            "shadow-[0_2px_8px_rgba(0,0,0,0.18)]",
            "active:scale-95 transition-transform duration-[120ms]",
            "cursor-pointer select-none",
          )}
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectTab("settings")}
          className={cn(
            "flex flex-col items-center justify-center gap-1",
            "h-14 min-w-[44px] px-3",
            "text-[11px] font-medium transition-colors duration-[120ms]",
            "cursor-pointer select-none",
            activeTab === "settings"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
}
