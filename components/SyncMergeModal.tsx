"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { useSyncStore } from "@/lib/store/syncStore";
import { handleMergeDecision } from "@/lib/sync/syncEngine";
import { ShieldCheck, GitMerge, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/lib/store/toastStore";

interface SyncMergeModalProps {
  onComplete?: () => void;
}

export function SyncMergeModal({ onComplete }: SyncMergeModalProps) {
  const { isMergeModalOpen, setIsMergeModalOpen, user } = useSyncStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isMergeModalOpen) return null;

  const handleChoice = async (choice: "merge" | "fresh") => {
    setIsProcessing(true);
    try {
      await handleMergeDecision(choice);
      toast(
        choice === "merge"
          ? "Local reports merged into your account."
          : "Started fresh with your cloud account.",
        "success"
      );
      if (onComplete) onComplete();
    } catch (err: any) {
      toast("Sync choice failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isMergeModalOpen}
      onClose={() => {
        // Default to merge if user dismisses modal without selecting
        if (!isProcessing) {
          handleChoice("merge");
        }
      }}
      title="Existing Health Data Found"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <p className="text-xs leading-relaxed">
            Signed in as <span className="font-semibold">{user?.email}</span>. We found reports on this device. How would you like to proceed?
          </p>
        </div>

        {/* Choice 1: Merge */}
        <div
          onClick={() => !isProcessing && handleChoice("merge")}
          className="group p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]/50 transition-all cursor-pointer space-y-1.5"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                <GitMerge className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Merge with your account
              </h4>
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Recommended
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9 leading-relaxed">
            Upload your existing reports to your private cloud so they become available across all your phones and computers.
          </p>
        </div>

        {/* Choice 2: Start Fresh */}
        <div
          onClick={() => !isProcessing && handleChoice("fresh")}
          className="group p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-amber-500/50 hover:bg-[var(--bg-secondary)]/50 transition-all cursor-pointer space-y-1.5"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Start fresh
            </h4>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9 leading-relaxed">
            Clear the current device and download only the reports already stored in your cloud account.
          </p>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-[var(--text-muted)] animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Synchronizing health records...</span>
          </div>
        )}

        <div className="pt-2 text-center">
          <p className="text-[11px] text-[var(--text-muted)]">
            Your health records are never overwritten without explicit confirmation.
          </p>
        </div>
      </div>
    </Modal>
  );
}
