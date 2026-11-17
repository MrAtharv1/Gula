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
      title="Existing health data found"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--status-normal-bg)] border border-[var(--status-normal-border)] text-[var(--status-normal-text)]">
          <ShieldCheck className="w-5 h-5 shrink-0 text-[var(--status-normal-dot)]" />
          <p className="text-[12px] leading-relaxed">
            Signed in as <span className="font-semibold">{user?.email}</span>. We found reports on this device. How would you like to proceed?
          </p>
        </div>

        {/* Choice 1: Merge */}
        <div
          onClick={() => !isProcessing && handleChoice("merge")}
          className="group p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]/50 transition-all cursor-pointer space-y-1"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                <GitMerge className="w-4 h-4" />
              </div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Merge with your account
              </h4>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--status-normal-bg)] text-[var(--status-normal-text)]">
              Recommended
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] pl-9 leading-relaxed">
            Upload your existing reports to your private cloud so they become available across all your phones and computers.
          </p>
        </div>

        {/* Choice 2: Start Fresh */}
        <div
          onClick={() => !isProcessing && handleChoice("fresh")}
          className="group p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]/50 transition-all cursor-pointer space-y-1"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Start fresh
            </h4>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] pl-9 leading-relaxed">
            Clear the current device and download only the reports already stored in your cloud account.
          </p>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-[var(--text-muted)] animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
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
