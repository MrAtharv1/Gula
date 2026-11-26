"use client";

import React from "react";
import { Skeleton } from "./ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse animate-fade-up" aria-busy="true">
      {/* Summary strip */}
      <div className="grid grid-cols-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col px-5 py-4 gap-2",
              i > 0 && "border-l border-[var(--border-subtle)]"
            )}
          >
            <Skeleton className="h-7 w-14" rounded="md" />
            <Skeleton className="h-3 w-20" rounded="sm" />
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-28" rounded="md" />
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] auto-rows-fr">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] flex flex-col gap-3"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex justify-between items-start">
                <Skeleton className="h-3.5 w-20" rounded="sm" />
                <Skeleton className="h-5 w-14" rounded="full" />
              </div>
              <div className="flex justify-between items-end">
                <Skeleton className="h-7 w-16" rounded="md" />
                <Skeleton className="h-5 w-14" rounded="sm" />
              </div>
              <Skeleton className="h-3 w-24" rounded="sm" />
              <Skeleton className="h-1 w-full" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
