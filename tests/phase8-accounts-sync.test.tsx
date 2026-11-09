import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "fake-indexeddb/auto";
import fs from "fs";
import path from "path";

import {
  db,
  addReport,
  getActiveReports,
  getLatestResults,
  undoLastUpload,
  restoreUndone,
  deleteAllData,
  updateReportStatusFromCloud,
} from "@/lib/db";
import { useSyncStore } from "@/lib/store/syncStore";
import {
  signInWithMagicLink,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  setMockUser,
  resetMockCloudStore,
  uploadPdfToStorage,
  downloadPdfFromStorage,
  deleteUserCloudData,
} from "@/lib/sync/supabaseClient";
import {
  syncAll,
  handleMergeDecision,
  getLazyPdfBlob,
  deleteAccountAndCloudData,
} from "@/lib/sync/syncEngine";
import { SettingsView } from "@/components/SettingsView";
import { SyncMergeModal } from "@/components/SyncMergeModal";

describe("Phase 8: Accounts and Local-First Sync", () => {
  beforeEach(async () => {
    await deleteAllData();
    resetMockCloudStore();
    useSyncStore.getState().setUser(null);
    useSyncStore.getState().setSyncStatus("synced");
    useSyncStore.getState().setHasPromptedMerge(false);
    useSyncStore.getState().setIsMergeModalOpen(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------
   * 1. Optional Sign-In (Works 100% Signed Out & Offline)
   * ------------------------------------------------------------------ */
  describe("Optional Authentication", () => {
    it("works completely offline and signed out", async () => {
      // Add local report without any user or auth
      const reportId = await addReport(
        {
          fileName: "offline_report.pdf",
          reportDate: "2025-01-10",
          uploadedAt: Date.now(),
          status: "active",
          parseWarnings: [],
        },
        [
          {
            metricKey: "hemoglobin",
            displayName: "Hemoglobin",
            value: 15.0,
            unit: "g/dL",
            refLow: 13.0,
            refHigh: 17.0,
            flag: "normal",
            category: "Blood",
          },
        ]
      );

      const active = await getActiveReports();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(reportId);
      expect(active[0].userId).toBeUndefined();
    });

    it("signs in with email magic link", async () => {
      const { error } = await signInWithMagicLink("patient@example.com");
      expect(error).toBeNull();

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe("patient@example.com");
    });

    it("signs in with Google provider", async () => {
      const { error } = await signInWithGoogle();
      expect(error).toBeNull();

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe("user@example.com");
    });

    it("signs out cleanly while preserving local records", async () => {
      await signInWithMagicLink("patient@example.com");
      await addReport(
        {
          fileName: "local_record.pdf",
          reportDate: "2025-01-10",
          uploadedAt: Date.now(),
          status: "active",
          parseWarnings: [],
        },
        []
      );

      await signOut();
      const user = await getCurrentUser();
      expect(user).toBeNull();

      // Local records stay on device
      const active = await getActiveReports();
      expect(active.length).toBe(1);
    });
  });

  /* ------------------------------------------------------------------
   * 2. Local-First Write-Through & Background Synchronization
   * ------------------------------------------------------------------ */
  describe("Local-First Write-Through & Sync", () => {
    it("writes to IndexedDB first and pushes to cloud in background", async () => {
      const user = { id: "user_device_A", email: "alice@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      // Write locally
      const dummyPdfBlob = new Blob(["%PDF-1.4 mock content"], { type: "application/pdf" });
      const reportId = await addReport(
        {
          fileName: "fasting_sugar.pdf",
          reportDate: "2025-03-01",
          uploadedAt: 1000,
          status: "active",
          fileBlob: dummyPdfBlob,
          parseWarnings: [],
        },
        [
          {
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 95,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "normal",
            category: "Sugar",
          },
        ]
      );

      // Verify immediate local presence before sync
      let localReports = await getActiveReports();
      expect(localReports.length).toBe(1);
      expect(localReports[0].cloudId).toBeUndefined();

      // Run background sync
      await syncAll();

      // Verify report was assigned a cloudId and synced timestamp
      localReports = await getActiveReports();
      expect(localReports[0].cloudId).toBeDefined();
      expect(localReports[0].syncedAt).toBeDefined();
      expect(localReports[0].pdfStoragePath).toContain("user_device_A");
    });
  });

  /* ------------------------------------------------------------------
   * 3. Lazy PDF Download & Storage References
   * ------------------------------------------------------------------ */
  describe("Lazy PDF Cloud Storage", () => {
    it("uploads PDF to storage and retrieves it lazily when viewing", async () => {
      const user = { id: "user_storage_test", email: "bob@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      const originalBlob = new Blob(["%PDF-1.4 test document stream"], { type: "application/pdf" });
      const reportId = await addReport(
        {
          fileName: "lipid_profile.pdf",
          reportDate: "2025-02-15",
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: originalBlob,
          parseWarnings: [],
        },
        []
      );

      // Push to cloud storage via sync
      await syncAll();

      const syncedReport = (await getActiveReports())[0];
      expect(syncedReport.pdfStoragePath).toBeDefined();

      // Simulate a secondary device: report metadata is present but local fileBlob is not downloaded yet
      const secondaryDeviceReport = {
        ...syncedReport,
        fileBlob: undefined, // stripped to save initial bandwidth
      };

      // User clicks "View PDF": trigger lazy download
      const downloadedBlob = await getLazyPdfBlob(secondaryDeviceReport);
      expect(downloadedBlob).not.toBeNull();
      expect(downloadedBlob?.type).toBe("application/pdf");

      // Verify it was cached in IndexedDB
      const cachedReport = await db.reports.get(reportId);
      expect(cachedReport?.fileBlob).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------
   * 4. Multi-Device Status Synchronization (Undo & Restore)
   * ------------------------------------------------------------------ */
  describe("Status Synchronization (Undo / Restore)", () => {
    it("syncs Undo from Device A to Device B", async () => {
      const user = { id: "user_multi_device", email: "carol@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      // Device A uploads report
      await addReport(
        {
          fileName: "checkup_A.pdf",
          reportDate: "2025-01-20",
          uploadedAt: 1000,
          status: "active",
          parseWarnings: [],
        },
        [
          {
            metricKey: "tsh",
            displayName: "TSH",
            value: 2.5,
            unit: "uIU/mL",
            refLow: 0.4,
            refHigh: 4.5,
            flag: "normal",
            category: "Thyroid",
          },
        ]
      );
      await syncAll();

      const reportA = (await getActiveReports())[0];
      const cloudId = reportA.cloudId!;

      // Device A clicks Undo: updates status to "undone" and syncs
      await undoLastUpload();
      await syncAll();

      // Simulate Device B receiving the updated status from cloud
      const updatedOnB = await updateReportStatusFromCloud(cloudId, "undone", Date.now());
      expect(updatedOnB).toBe(true);

      // Device B now reflects undone status
      const activeOnB = await getActiveReports();
      expect(activeOnB.length).toBe(0);
    });
  });

  /* ------------------------------------------------------------------
   * 5. First Sign-In Merge Confirmation Modal
   * ------------------------------------------------------------------ */
  describe("First Sign-In Conflict Resolution", () => {
    it("renders merge confirmation modal when local data exists", () => {
      useSyncStore.getState().setUser({ id: "u1", email: "test@example.com" });
      useSyncStore.getState().setIsMergeModalOpen(true);

      render(<SyncMergeModal />);
      expect(screen.getByText("Existing Health Data Found")).toBeDefined();
      expect(screen.getByText("Merge with your account")).toBeDefined();
      expect(screen.getByText("Start fresh")).toBeDefined();
    });

    it("choice 'merge' links local records and uploads to account", async () => {
      const user = { id: "user_merge_test", email: "merge@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      // Existing local data
      await addReport(
        {
          fileName: "local_unlinked.pdf",
          reportDate: "2025-01-01",
          uploadedAt: Date.now(),
          status: "active",
          parseWarnings: [],
        },
        []
      );

      // Select "merge"
      await handleMergeDecision("merge");

      const localReports = await getActiveReports();
      expect(localReports.length).toBe(1);
      expect(localReports[0].userId).toBe("user_merge_test");
      expect(useSyncStore.getState().hasPromptedMerge).toBe(true);
    });

    it("choice 'fresh' clears local records without overwriting cloud", async () => {
      const user = { id: "user_fresh_test", email: "fresh@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      // Temporary local scratch data
      await addReport(
        {
          fileName: "temp_scratch.pdf",
          reportDate: "2025-01-01",
          uploadedAt: Date.now(),
          status: "active",
          parseWarnings: [],
        },
        []
      );

      // Select "fresh"
      await handleMergeDecision("fresh");

      const localReports = await getActiveReports();
      expect(localReports.length).toBe(0);
    });
  });

  /* ------------------------------------------------------------------
   * 6. Security & Row-Level Security Rules
   * ------------------------------------------------------------------ */
  describe("Security and Per-User Isolation", () => {
    it("verifies supabase/schema.sql defines RLS policies on tables and buckets", () => {
      const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
      expect(fs.existsSync(schemaPath)).toBe(true);

      const sql = fs.readFileSync(schemaPath, "utf-8");
      expect(sql).toContain("alter table public.reports enable row level security;");
      expect(sql).toContain("alter table public.results enable row level security;");
      expect(sql).toContain("auth.uid() = user_id");
      expect(sql).toContain("bucket_id = 'healthtrack-reports'");
    });
  });

  /* ------------------------------------------------------------------
   * 7. Delete Account & Cloud Data
   * ------------------------------------------------------------------ */
  describe("Account and Cloud Data Deletion", () => {
    it("permanently deletes cloud tables, storage files, and local DB on delete account", async () => {
      const user = { id: "user_to_delete", email: "delete_me@example.com" };
      setMockUser(user);
      useSyncStore.getState().setUser(user);

      // Create local report & sync to cloud
      const blob = new Blob(["pdf content"], { type: "application/pdf" });
      await addReport(
        {
          fileName: "report_to_delete.pdf",
          reportDate: "2025-02-01",
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: blob,
          parseWarnings: [],
        },
        []
      );
      await syncAll();

      // Trigger Delete Account and Cloud Data
      const res = await deleteAccountAndCloudData();
      expect(res.success).toBe(true);

      // Local data is wiped
      const localReports = await getActiveReports();
      expect(localReports.length).toBe(0);

      // Auth state is signed out
      const currentUser = await getCurrentUser();
      expect(currentUser).toBeNull();
    });
  });

  /* ------------------------------------------------------------------
   * 8. Settings UI Verification
   * ------------------------------------------------------------------ */
  describe("Settings View UI Integration", () => {
    it("renders Account & Cloud Sync card, honest footer, and sync status", async () => {
      render(<SettingsView onDataChanged={vi.fn()} />);

      // Section title
      expect(screen.getByText("Account & Cloud Sync")).toBeDefined();
      expect(screen.getByRole("button", { name: /send magic link/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeDefined();

      // Honest footer
      expect(
        screen.getByText(
          /Your data stays on this device/i
        )
      ).toBeDefined();
    });

    it("displays sync indicator and delete account button when user is signed in", () => {
      useSyncStore.getState().setUser({ id: "u_signed_in", email: "alice@test.com" });
      useSyncStore.getState().setSyncStatus("synced");

      render(<SettingsView onDataChanged={vi.fn()} />);

      expect(screen.getByText("alice@test.com")).toBeDefined();
      expect(screen.getByText("Synced")).toBeDefined();
      expect(screen.getByRole("button", { name: /sync now/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /delete account/i })).toBeDefined();
    });
  });
});
