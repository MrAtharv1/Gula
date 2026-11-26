"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { useSyncStore } from "@/lib/store/syncStore";
import { signInWithMagicLink, signInWithGoogle, signOut } from "@/lib/sync/supabaseClient";
import { syncAll } from "@/lib/sync/syncEngine";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import { Mail, Loader2, LogOut, RotateCcw, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function AuthModal({ isOpen, onClose, onSyncComplete }: AuthModalProps) {
  const { user, syncStatus, lastSyncedAt } = useSyncStore();
  const [authEmail, setAuthEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setIsBusy(true);
    try {
      const { error } = await signInWithMagicLink(authEmail.trim());
      if (error) {
        toast(error.message, "error");
      } else {
        toast("Check your email for the magic sign-in link.", "success");
        setAuthEmail("");
        onClose();
      }
    } catch (err: any) {
      toast(err.message || "Failed to send magic link", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignInGoogle = async () => {
    setIsBusy(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast(error.message, "error");
    } catch (err: any) {
      toast(err.message || "Failed to sign in with Google", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setIsBusy(true);
    try {
      await syncAll();
      onSyncComplete?.();
      toast("Sync complete.", "success");
    } catch (err: any) {
      toast("Sync failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    try {
      await signOut();
      toast("Signed out. Local records remain on this device.", "info");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Account & Cloud sync" : "Log in or sign up"}
      description={
        user
          ? "Manage your cloud sync session"
          : "Optional private cloud backup & multi-device sync"
      }
      maxWidth="sm"
    >
      {!user ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[var(--status-normal-dot)] shrink-0 mt-0.5" />
            <span>
              Your health data always stays stored locally on your device first. Sign in only if you want encrypted sync across devices.
            </span>
          </div>

          <form onSubmit={handleSendMagicLink} className="space-y-2.5">
            <label className="block text-[11.5px] font-medium text-[var(--text-muted)]">
              Continue with email
            </label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 text-[13px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              disabled={isBusy}
              aria-label="Email address"
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={isBusy || !authEmail.trim()}
              icon={
                isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )
              }
            >
              Send magic link
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-[var(--border-subtle)]" />
            <span className="text-[10.5px] text-[var(--text-faint)] uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 border-t border-[var(--border-subtle)]" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full justify-center"
            onClick={handleSignInGoogle}
            disabled={isBusy}
          >
            Continue with Google
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-muted)] flex items-center justify-center font-semibold text-xs uppercase shrink-0">
              {user.email.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {user.email}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
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
                <span>
                  {syncStatus === "syncing"
                    ? "Syncing..."
                    : syncStatus === "offline"
                    ? "Offline"
                    : lastSyncedAt
                    ? `Synced ${formatDate(new Date(lastSyncedAt).toISOString().split("T")[0])}`
                    : "Connected"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1 justify-center"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleSyncNow}
              disabled={isBusy || syncStatus === "syncing"}
            >
              Sync now
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="flex-1 justify-center"
              icon={<LogOut className="w-3.5 h-3.5" />}
              onClick={handleSignOut}
              disabled={isBusy}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
