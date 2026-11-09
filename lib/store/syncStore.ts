import { create } from "zustand";
import { AuthUser, SyncStatus } from "../sync/types";

interface SyncState {
  user: AuthUser | null;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  pendingUploadsCount: number;
  isMergeModalOpen: boolean;
  hasPromptedMerge: boolean;
  errorMessage: string | null;

  setUser: (user: AuthUser | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
  setPendingUploadsCount: (count: number) => void;
  setIsMergeModalOpen: (open: boolean) => void;
  setHasPromptedMerge: (prompted: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  user: null,
  syncStatus: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
  lastSyncedAt: null,
  pendingUploadsCount: 0,
  isMergeModalOpen: false,
  hasPromptedMerge: false,
  errorMessage: null,

  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setPendingUploadsCount: (pendingUploadsCount) => set({ pendingUploadsCount }),
  setIsMergeModalOpen: (isMergeModalOpen) => set({ isMergeModalOpen }),
  setHasPromptedMerge: (hasPromptedMerge) => set({ hasPromptedMerge }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
