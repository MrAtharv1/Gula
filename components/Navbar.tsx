"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  TrendingUp,
  User,
  Plus,
  LogIn,
  ChevronRight,
  Upload,
  Globe,
  Check,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useSyncStore } from "@/lib/store/syncStore";
import { usePreferenceStore } from "@/lib/store/preferenceStore";
import { APP_LANGUAGES, useTranslation } from "@/lib/i18n/translations";
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
  const profile = usePreferenceStore((s) => s.profile);
  const { t, language, setLanguage, currentLangOption } = useTranslation();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Sync <html lang="..."> when language preference changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Close language popover on outside click or Escape
  useEffect(() => {
    if (!langMenuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [langMenuOpen]);

  const navTabs = [
    {
      id: "home" as NavTab,
      label: t.home,
      icon: Home,
      badge: markersCount && markersCount > 0 ? markersCount : undefined,
    },
    {
      id: "trends" as NavTab,
      label: t.trends,
      icon: TrendingUp,
      badge: reportsCount && reportsCount > 0 ? reportsCount : undefined,
    },
    {
      id: "settings" as NavTab,
      label: t.settings,
      icon: User,
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
          "hidden md:flex flex-col relative z-40",
          "w-60 shrink-0",
          "border-r border-[var(--border-subtle)]",
          "bg-[var(--bg-primary)] dark:bg-[#0b0b0e]/90 dark:backdrop-blur-xl",
          "overflow-visible",
          "px-3 py-3.5"
        )}
      >
        {/* Brand header — clickable logo takes user to homepage */}
        <button
          type="button"
          onClick={() => onSelectTab("home")}
          aria-label="Go to homepage"
          className="w-full flex flex-col items-center text-center px-2 pt-1 pb-4 rounded-xl hover:bg-[var(--bg-hover)]/50 transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
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
            {t.tagline}
          </p>
        </button>

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
              <span>{t.uploadReport}</span>
            </span>
            <Plus className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
          </button>
        </div>

        {/* Workspace Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          <p className="px-2.5 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
            {t.workspace}
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

        {/* Bottom Stack:
            1) Language switcher button with sideway up/right menu (above Theme)
            2) Theme Toggle (Light / Auto / Dark)
            3) Log in / Sign up at the very end */}
        <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
          {/* Language Picker — sideway menu */}
          <div ref={langMenuRef} className="relative space-y-1">
            <span className="block px-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
              {t.language}
            </span>
            <button
              type="button"
              onClick={() => setLangMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={langMenuOpen}
              aria-label={`Change app language, current ${currentLangOption.name}`}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2.5 h-8 rounded-lg",
                "bg-[var(--bg-card)] dark:bg-white/[0.04]",
                "border border-[var(--border-subtle)] hover:border-[var(--border-hover)]",
                "hover:bg-[var(--bg-card-subtle)]/70 dark:hover:bg-white/[0.07]",
                "shadow-[var(--shadow-sm)] text-[12px] font-medium text-[var(--text-primary)]",
                "transition-all duration-[100ms] ease-out cursor-pointer select-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Globe className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">
                  {currentLangOption.nativeName}
                  {currentLangOption.code !== "en" && (
                    <span className="text-[var(--text-faint)] font-normal ml-1">
                      ({currentLangOption.name})
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "w-3.5 h-3.5 text-[var(--text-faint)] shrink-0 transition-transform duration-[100ms]",
                  langMenuOpen && "translate-x-0.5 text-[var(--accent)]"
                )}
              />
            </button>

            {/* Sideways upward menu */}
            {langMenuOpen && (
              <div
                role="listbox"
                aria-label="App language"
                className={cn(
                  "absolute left-full bottom-0 ml-2.5 z-50",
                  "w-[260px] rounded-xl p-1.5",
                  "bg-[var(--bg-card)] border border-[var(--border-strong)]",
                  "shadow-[var(--shadow-xl)]",
                  "animate-in fade-in slide-in-from-left-1 duration-[120ms]"
                )}
              >
                <div className="px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                  Select language
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-[280px] overflow-y-auto pt-0.5">
                  {APP_LANGUAGES.map((langOpt) => {
                    const isSelected = langOpt.code === language;
                    return (
                      <button
                        key={langOpt.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setLanguage(langOpt.code);
                          setLangMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-left",
                          "transition-colors duration-[80ms] cursor-pointer select-none",
                          isSelected
                            ? "bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                            : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-[12px] font-medium leading-tight truncate">
                            {langOpt.nativeName}
                          </span>
                          <span className="block text-[10px] text-[var(--text-faint)] leading-tight truncate">
                            {langOpt.name}
                          </span>
                        </span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-[var(--accent)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher (Light / Auto / Dark) */}
          <div className="space-y-1">
            <span className="block px-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
              {t.appearance}
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
                  {profile?.avatarDataUrl || user.avatarUrl ? (
                    <img
                      src={profile?.avatarDataUrl || user.avatarUrl}
                      alt={profile?.fullName || user.email}
                      className="w-7 h-7 rounded-full object-cover border border-[var(--border-subtle)] shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center text-[11px] font-semibold uppercase shrink-0">
                      {(profile?.fullName || user.email).substring(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                      {profile?.fullName || user.email}
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
                      {t.loginSignup}
                    </p>
                    <p className="text-[10.5px] text-[var(--text-faint)] leading-tight mt-0.5 truncate">
                      {t.syncAcrossDevices}
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
          aria-label={t.uploadReport}
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
