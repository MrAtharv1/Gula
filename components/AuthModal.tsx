"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { useSyncStore } from "@/lib/store/syncStore";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  signOut,
} from "@/lib/sync/supabaseClient";
import { syncAll } from "@/lib/sync/syncEngine";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import {
  Loader2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
  limitReason?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  onSyncComplete,
  limitReason = false,
}: AuthModalProps) {
  const { user, syncStatus, lastSyncedAt } = useSyncStore();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);

    const email = authEmail.trim();
    if (!email || !authPassword) {
      setFormError("Please enter both email and password.");
      return;
    }
    if (authPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsBusy(true);
    try {
      if (authMode === "signup") {
        const { error, needsConfirmation } = await signUpWithPassword(email, authPassword);
        if (error) {
          setFormError(error.message);
        } else if (needsConfirmation) {
          setAuthMode("signin");
          setInfoMessage(
            "Account created! Check your inbox for the confirmation link before signing in."
          );
          toast("Account created! Check your inbox to confirm your email.", "success");
        } else {
          toast("Account created and signed in.", "success");
          setAuthPassword("");
          onClose();
        }
      } else {
        const { error } = await signInWithPassword(email, authPassword);
        if (error) {
          setFormError(error.message);
        } else {
          toast("Signed in successfully.", "success");
          setAuthPassword("");
          onClose();
        }
      }
    } catch (err: any) {
      setFormError(err.message || "Authentication failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignInGoogle = async () => {
    setFormError(null);
    setIsBusy(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFormError(error.message);
      } else {
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to sign in with Google");
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
      toast("Signed out.", "info");
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
      title={
        user
          ? "Account & Cloud sync"
          : authMode === "signup"
          ? "Create your account"
          : "Log in to Gula"
      }
      description={
        user
          ? "Manage your encrypted cloud sync session"
          : "Encrypted & securely stored. Never sold or used for ads."
      }
      maxWidth="sm"
    >
      {!user ? (
        <div className="space-y-4">
          {limitReason && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-400/10 border border-amber-200/80 dark:border-amber-400/25 text-[12px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Guest mode allows up to <strong>2 reports</strong>. Sign in or create a free account to merge your current reports and upload more.
              </span>
            </div>
          )}

          {/* Mode Toggle: Sign in / Create account */}
          <div className="grid grid-cols-2 p-0.5 rounded-[9px] bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setFormError(null);
                setInfoMessage(null);
              }}
              className={`py-1.5 text-[12px] font-medium rounded-[7px] transition-all cursor-pointer ${
                authMode === "signin"
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setFormError(null);
                setInfoMessage(null);
              }}
              className={`py-1.5 text-[12px] font-medium rounded-[7px] transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-[11.5px] font-medium text-[var(--text-muted)] mb-1">
                Email address
              </label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-[13px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                disabled={isBusy}
                aria-label="Email address"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-[var(--text-muted)] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  className="w-full pl-3 pr-9 py-2 text-[13px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  disabled={isBusy}
                  aria-label="Password"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {infoMessage && (
              <p className="text-[11.5px] text-[var(--status-normal-text)] bg-[var(--status-normal-bg)] border border-[var(--status-normal-border)] rounded-lg px-2.5 py-2 leading-relaxed">
                {infoMessage}
              </p>
            )}

            {formError && (
              <p className="text-[11.5px] text-[var(--status-abnormal-text)] bg-[var(--status-abnormal-bg)] border border-[var(--status-abnormal-border)] rounded-lg px-2.5 py-2 leading-relaxed">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={isBusy || !authEmail.trim() || authPassword.length < 6}
              icon={
                isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )
              }
            >
              {authMode === "signup" ? "Create account" : "Sign in with email"}
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
            icon={
              <img
                src="/google-logo.png"
                alt=""
                aria-hidden="true"
                className="w-4 h-4 object-contain"
              />
            }
          >
            Continue with Google
          </Button>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-[var(--text-faint)] leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-normal-dot)] shrink-0 mt-0.5" />
            <span>
              Your health data uses HTTPS/TLS in transit and Supabase server-side encryption at rest with Row-Level Security.
            </span>
          </div>
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
                    : "Encrypted cloud sync active"}
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
