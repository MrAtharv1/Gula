"use client";

import React from "react";
import {
  Home,
  TrendingUp,
  Settings,
  Plus,
  LogIn,
  ChevronRight,
  Upload,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useSyncStore } from "@/lib/store/syncStore";
import { cn } from "@/lib/utils/cn";

export type NavTab = "home" | "trends" | "settings";

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
  onOpenAuth?: () => void;
  markersCount?: number;
  reportsCount?: number;
}

export function Navbar({
  activeTab,
  onSelectTab,
  onOpenUpload,
  onOpenAuth,
  markersCount,
  reportsCount,
}: NavbarProps) {
  const { user, syncStatus } = useSyncStore();

  const navTabs = [
    {
      id: "home" as NavTab,
      label: "Home",
      icon: Home,
      badge: markersCount && markersCount > 0 ? markersCount : undefined,
    },
    {
      id: "trends" as NavTab,
      label: "Trends",
      icon: TrendingUp,
      badge: reportsCount && reportsCount > 0 ? reportsCount : undefined,
    },
    {
      id: "settings" as NavTab,
      label: "Settings",
      icon: Settings,
    },
  ];

  const handleAuthClick = () => {
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      onSelectTab("settings");
    }
  };

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col",
          "w-60 shrink-0",
          "border-r border-[var(--border-subtle)]",
          "bg-[var(--bg-primary)] dark:bg-[#0b0b0e]/90 dark:backdrop-blur-xl",
          "overflow-hidden",
          "px-3 py-3.5"
        )}
      >
        {/* Brand header — logo + minimalist tagline */}
        <div className="flex flex-col items-center text-center px-2 pt-1 pb-4">
          <span className="sr-only">Gula</span>
          <img
            src="/logo.png"
            alt="Gula"
            className="w-[72px] h-[72px] object-contain select-none drop-shadow-[0_2px_10px_rgba(236,72,153,0.16)]"
          />
          <p
            className="mt-1.5 text-[12.5px] font-medium tracking-[0.02em] text-[var(--text-secondary)] leading-snug"
            style={{ fontFamily: "var(--font-karla), var(--font-geist-sans), sans-serif" }}
          >
            Your Privacy Matters
          </p>
        </div>

        {/* Quick upload command button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={onOpenUpload}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2.5 h-8 rounded-lg",
              "bg-[var(--bg-card)] dark:bg-white/[0.04]",
              "border border-[var(--border-subtle)] hover:border-[var(--border-hover)]",
              "hover:bg-[var(--bg-card-subtle)]/70 dark:hover:bg-white/[0.07]",
              "shadow-[var(--shadow-sm)] text-[12.5px] font-medium text-[var(--text-primary)]",
              "transition-all duration-[100ms] ease-out cursor-pointer select-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            )}
          >
            <span className="flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span>Upload report</span>
            </span>
            <Plus className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
          </button>
        </div>

        {/* Workspace Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          <p className="px-2.5 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
            Workspace
          </p>
          <nav className="space-y-0.5" aria-label="Main navigation">
            {navTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative w-full flex items-center justify-between gap-2 px-2.5 h-8.5 rounded-lg",
                    "text-[13px] font-medium",
                    "transition-all duration-[100ms] ease-out",
                    "cursor-pointer select-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                    isActive
                      ? "bg-[var(--bg-card-subtle)] dark:bg-white/[0.06] text-[var(--text-primary)] shadow-[var(--shadow-sm)] border border-[var(--border-subtle)]"
                      : "text-[var(--text-muted)] border border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full bg-[var(--accent)]"
                      />
                    )}
                    <Icon
                      className={cn(
                        "shrink-0 w-[15px] h-[15px] transition-colors",
                        isActive
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-faint)] group-hover:text-[var(--text-secondary)]"
                      )}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10.5px] tabular-nums px-1.5 py-px rounded-md",
                        isActive
                          ? "bg-[var(--bg-card)] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          : "text-[var(--text-faint)]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Stack: 1) Theme Toggle (Light / Auto / Dark)  2) Login / Sign up at the very end */}
        <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
          {/* Theme Switcher (Light / Auto / Dark) */}
          <div className="space-y-1">
            <span className="block px-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
              Appearance
            </span>
            <ThemeToggle compact />
          </div>

          {/* Login / Sign Up (or User Session) at the very end */}
          <button
            type="button"
            onClick={handleAuthClick}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left",
              "bg-[var(--bg-card)] dark:bg-white/[0.04]",
              "border border-[var(--border-subtle)] hover:border-[var(--border-hover)]",
              "hover:bg-[var(--bg-card-subtle)]/70 dark:hover:bg-white/[0.07]",
              "shadow-[var(--shadow-sm)] transition-all duration-[120ms] ease-out",
              "cursor-pointer select-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            )}
          >
            {user ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center text-[11px] font-semibold uppercase shrink-0">
                    {user.email.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                      {user.email}
                    </p>
                    <p className="text-[10.5px] text-[var(--text-faint)] flex items-center gap-1 mt-0.5 leading-tight">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            syncStatus === "synced"
                              ? "var(--status-normal-dot)"
                              : syncStatus === "error"
                              ? "var(--status-abnormal-dot)"
                              : syncStatus === "syncing"
                              ? "var(--accent)"
                              : "var(--text-faint)",
                        }}
                      />
                      <span className="capitalize">{syncStatus}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center shrink-0">
                    <LogIn className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                      Log in / Sign up
                    </p>
                    <p className="text-[10.5px] text-[var(--text-faint)] leading-tight mt-0.5 truncate">
                      Sync across devices
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ─────────────────────────────── */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40",
          "bg-[var(--bg-primary)]/90 backdrop-blur-xl",
          "border-t border-[var(--border-subtle)]",
          "flex items-end justify-around",
          "px-2",
          "pb-[env(safe-area-inset-bottom)]"
        )}
        style={{ backdropFilter: "blur(16px) saturate(180%)" }}
        aria-label="Mobile navigation"
      >
        {navTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "h-14 min-w-[52px] px-3",
                "text-[10.5px] font-medium tracking-wide",
                "transition-all duration-[100ms] ease-out",
                "cursor-pointer select-none",
                isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)]"
              )}
            >
              <Icon
                className={cn("w-[19px] h-[19px] mb-0.5")}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* FAB */}
        <button
          onClick={onOpenUpload}
          aria-label="Add report"
          className={cn(
            "flex flex-col items-center justify-center",
            "-mt-5 mb-1",
            "w-11 h-11 rounded-full",
            "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]",
            "shadow-[0_2px_10px_rgba(0,0,0,0.22)]",
            "active:scale-95 transition-transform duration-[100ms]",
            "cursor-pointer select-none"
          )}
        >
          <Plus className="w-[18px] h-[18px] stroke-[2]" />
        </button>
      </nav>
    </>
  );
}
