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
          "w-56 shrink-0",
          "border-r border-[var(--border-subtle)]",
          "bg-[var(--bg-primary)]",
          "overflow-hidden",
          "px-2.5 py-3",
        )}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 px-2 mb-6 mt-1">
          <div
            className="w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #5b5bd6 0%, #818cf8 100%)",
              boxShadow: "0 1px 3px rgba(91,91,214,0.3)",
            }}
          >
            <span className="text-white font-bold text-[11px] tracking-tight">G</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
              Gula
            </p>
            <p className="text-[10.5px] text-[var(--text-faint)] flex items-center gap-0.5 leading-none mt-[3px]">
              <ShieldCheck className="w-2.5 h-2.5 text-[var(--status-normal-dot)] shrink-0" />
              Private by default
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
                  "w-full flex items-center gap-2 px-2.5 h-8 rounded-lg",
                  "text-[13px] font-medium",
                  "transition-all duration-[100ms] ease-out",
                  "cursor-pointer select-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                  isActive
                    ? "bg-[var(--bg-card-subtle)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 w-[15px] h-[15px]",
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-faint)]"
                  )}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between px-1">
          <ThemeIconButton />
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
          "pb-[env(safe-area-inset-bottom)]",
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

        {/* FAB — hidden from tab row, shown as central circle */}
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
            "cursor-pointer select-none",
          )}
        >
          <Plus className="w-[18px] h-[18px] stroke-[2]" />
        </button>
      </nav>
    </>
  );
}
