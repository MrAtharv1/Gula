"use client";

import React from "react";
import { Skeleton } from "./ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse" aria-busy="true">
      {/* Summary Strip Skeleton */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <div>
          <Skeleton className="h-8 w-16 mb-2 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="border-l border-[var(--border-subtle)] pl-3 sm:pl-5">
          <Skeleton className="h-8 w-16 mb-2 rounded-lg" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <div className="border-l border-[var(--border-subtle)] pl-3 sm:pl-5">
          <Skeleton className="h-8 w-16 mb-2 rounded-lg" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 rounded" />
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))] auto-rows-fr">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-3"
            >
              {/* Row 1: name + badge */}
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              {/* Row 2: value + sparkline */}
              <div className="flex justify-between items-end">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
              {/* Row 3: delta */}
              <Skeleton className="h-3 w-24 rounded" />
              {/* Row 4: range bar */}
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
