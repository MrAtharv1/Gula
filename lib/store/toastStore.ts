"use client";

import { create } from "zustand";

export interface ToastItem {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    duration?: number,
    action?: { label: string; onClick: () => void }
  ) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = "info", duration = 3500, action) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration, action }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function toast(
  message: string,
  type?: "success" | "error" | "info",
  options?: { duration?: number; action?: { label: string; onClick: () => void } }
) {
  useToastStore.getState().showToast(message, type, options?.duration, options?.action);
}
