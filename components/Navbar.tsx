"use client";

import React from "react";
import {
  Home,
  TrendingUp,
  Settings,
  Plus,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
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
      {/* Desktop Slim Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shrink-0 justify-between">
        <div>
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 mb-7 px-1.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              G
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                Gula
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Local & Private
              </p>
            </div>
          </div>

          {/* Prominent Upload Button */}
          <button
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-6 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer tap-target select-none"
            aria-label="Upload report"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload report</span>
          </button>

          {/* Tab Navigation Links */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer tap-target select-none",
                    isActive
                      ? "bg-[var(--bg-card-subtle)] text-[var(--text-primary)] font-semibold shadow-xs"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    )}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Theme Appearance Switcher */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] px-4 py-1.5 flex items-center justify-around"
        aria-label="Mobile Bottom Navigation"
      >
        {/* Home Tab */}
        <button
          onClick={() => onSelectTab("home")}
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-xl text-[11px] font-medium transition-colors tap-target cursor-pointer select-none",
            activeTab === "home"
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        {/* Trends Tab */}
        <button
          onClick={() => onSelectTab("trends")}
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-xl text-[11px] font-medium transition-colors tap-target cursor-pointer select-none",
            activeTab === "trends"
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span>Trends</span>
        </button>

        {/* Prominent Upload Center Button on Mobile */}
        <button
          onClick={onOpenUpload}
          className="flex flex-col items-center justify-center -mt-5 bg-[var(--accent)] text-white p-3 rounded-full shadow-md active:scale-95 transition-transform tap-target cursor-pointer select-none ring-4 ring-[var(--bg-secondary)]"
          aria-label="Upload report"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => onSelectTab("settings")}
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-xl text-[11px] font-medium transition-colors tap-target cursor-pointer select-none",
            activeTab === "settings"
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
}
