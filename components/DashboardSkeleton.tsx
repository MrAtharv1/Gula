"use client";

import React from "react";
import { Skeleton } from "./ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse" aria-busy="true">
      {/* Summary Strip Skeleton */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex justify-between items-end">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
