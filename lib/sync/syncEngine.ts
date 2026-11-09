import { useSyncStore } from "../store/syncStore";
import {
  db,
  getUnsyncedReports,
  getUnsyncedResults,
  markReportSynced,
  markResultSynced,
  upsertReportFromCloud,
  linkLocalDataToUser,
  clearLocalDataKeepAccount,
  deleteAllData,
} from "../db";
import { Report, Result } from "../db/schema";
import {
  getCurrentUser,
  onAuthStateChange,
  pushCloudReport,
  pushCloudResults,
  updateCloudReportStatus,
  fetchCloudReports,
  fetchCloudResults,
  uploadPdfToStorage,
  downloadPdfFromStorage,
  deleteUserCloudData,
  signOut,
} from "./supabaseClient";
import { MergeChoice, AuthUser } from "./types";

let isEngineInitialized = false;

/**
 * Initializes the background synchronization engine, network listeners, and auth watchers
 */
export function initSyncEngine(): () => void {
  if (isEngineInitialized || typeof window === "undefined") {
    return () => {};
  }
  isEngineInitialized = true;

  const store = useSyncStore.getState();

  // 1. Network status listeners
  const handleOnline = () => {
    store.setSyncStatus("syncing");
    syncAll().catch((err) => console.error("Online sync failed:", err));
  };

  const handleOffline = () => {
    store.setSyncStatus("offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // 2. Auth State Listener
  const unsubscribeAuth = onAuthStateChange(async (user) => {
    store.setUser(user);

    if (!user) {
      store.setSyncStatus("synced");
      store.setPendingUploadsCount(0);
      return;
    }

    // Check if device has local unlinked reports
    const localReports = await db.reports.toArray();
    const hasUnlinkedData = localReports.some((r) => !r.userId || r.userId !== user.id);

    if (hasUnlinkedData && !store.hasPromptedMerge) {
      store.setIsMergeModalOpen(true);
    } else {
      syncAll().catch((err) => console.error("Post-auth sync failed:", err));
    }
  });

  // Check initial user
  getCurrentUser().then((user) => {
    if (user) {
      store.setUser(user);
      syncAll().catch((err) => console.error("Initial sync failed:", err));
    }
  });

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    unsubscribeAuth();
    isEngineInitialized = false;
  };
}

/**
 * Executes a full bi-directional sync: pulls remote changes, then pushes pending local mutations
 */
export async function syncAll(): Promise<void> {
  const store = useSyncStore.getState();
  const user = store.user;

  // If signed out, nothing to sync
  if (!user) {
    store.setSyncStatus("synced");
    return;
  }

  // If offline, flag and skip network calls
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    store.setSyncStatus("offline");
    return;
  }

  store.setSyncStatus("syncing");
  store.setErrorMessage(null);

  try {
    /* ------------------------------------------------------------------
     * STEP 1: PULL REMOTE UPDATES (Reports & Results)
     * ------------------------------------------------------------------ */
    const [cloudReportsRes, cloudResultsRes] = await Promise.all([
      fetchCloudReports(user.id),
      fetchCloudResults(user.id),
    ]);

    if (cloudReportsRes.error) {
      throw cloudReportsRes.error;
    }

    const resultsByReportId = new Map<string, typeof cloudResultsRes.results>();
    for (const res of cloudResultsRes.results) {
      const list = resultsByReportId.get(res.report_id) || [];
      list.push(res);
      resultsByReportId.set(res.report_id, list);
    }

    for (const cloudReport of cloudReportsRes.reports) {
      const associatedResults = resultsByReportId.get(cloudReport.id) || [];
      await upsertReportFromCloud(cloudReport, associatedResults);
    }

    /* ------------------------------------------------------------------
     * STEP 2: PUSH LOCAL MUTATIONS (New reports, status changes, PDFs)
     * ------------------------------------------------------------------ */
    const unsyncedReports = await getUnsyncedReports(user.id);
    const allLocalResults = await db.results.toArray();

    for (const report of unsyncedReports) {
      let cloudId = report.cloudId;

      // 2A. Push Report Row if not on cloud
      if (!cloudId) {
        const { data: created, error } = await pushCloudReport({
          user_id: user.id,
          file_name: report.fileName,
          lab_name: report.labName || null,
          report_date: report.reportDate,
          uploaded_at: report.uploadedAt,
          status: report.status,
          pdf_storage_path: report.pdfStoragePath || null,
          parse_warnings: report.parseWarnings || [],
        });

        if (error || !created) {
          console.error("Failed to push report to cloud:", error);
          continue;
        }
        cloudId = created.id;
      } else {
        // Status sync (Undo / Restore across devices)
        await updateCloudReportStatus(
          cloudId,
          report.status,
          new Date(report.updatedAt || Date.now()).toISOString()
        );
      }

      // 2B. Upload original PDF if present and not yet uploaded
      let pdfStoragePath = report.pdfStoragePath;
      if (report.fileBlob && !report.pdfSynced && cloudId) {
        const uploadRes = await uploadPdfToStorage(user.id, cloudId, report.fileBlob);
        if (uploadRes.path) {
          pdfStoragePath = uploadRes.path;
        }
      }

      await markReportSynced(report.id!, cloudId, pdfStoragePath, true);

      // 2C. Push associated Results
      const localResultsForReport = allLocalResults.filter((r) => r.reportId === report.id);
      const unsyncedResults = localResultsForReport.filter((r) => !r.cloudId);

      if (unsyncedResults.length > 0) {
        const payload = unsyncedResults.map((r) => ({
          report_id: cloudId!,
          user_id: user.id,
          metric_key: r.metricKey,
          display_name: r.displayName,
          value: r.value,
          unit: r.unit,
          ref_low: r.refLow !== undefined ? r.refLow : null,
          ref_high: r.refHigh !== undefined ? r.refHigh : null,
          flag: r.flag,
          category: r.category,
        }));

        await pushCloudResults(payload);

        // Mark local results as synced
        for (const r of unsyncedResults) {
          if (r.id) {
            await markResultSynced(r.id, "cloud_" + r.id, cloudId);
          }
        }
      }
    }

    store.setSyncStatus("synced");
    store.setLastSyncedAt(Date.now());
    store.setPendingUploadsCount(0);
  } catch (err: any) {
    console.error("Sync error:", err);
    store.setSyncStatus("error");
    store.setErrorMessage(err.message || "Failed to synchronize");
  }
}

/**
 * Handles the first sign-in conflict resolution:
 * - "merge": links local reports to user and pushes them to cloud
 * - "fresh": clears local data and pulls existing account records from cloud
 */
export async function handleMergeDecision(choice: MergeChoice): Promise<void> {
  const store = useSyncStore.getState();
  const user = store.user;

  if (!user) return;

  if (choice === "merge") {
    await linkLocalDataToUser(user.id);
  } else if (choice === "fresh") {
    await clearLocalDataKeepAccount();
  }

  store.setHasPromptedMerge(true);
  store.setIsMergeModalOpen(false);

  // Trigger sync immediately with the chosen strategy
  await syncAll();
}

/**
 * Lazy-loads the PDF blob for viewing:
 * 1. Checks local IndexedDB fileBlob
 * 2. If absent and cloud pdfStoragePath exists, downloads lazily from storage and caches in IndexedDB
 */
export async function getLazyPdfBlob(report: Report): Promise<Blob | null> {
  if (report.fileBlob) {
    return report.fileBlob;
  }

  if (report.pdfStoragePath && report.id) {
    const { blob, error } = await downloadPdfFromStorage(report.pdfStoragePath);
    if (blob) {
      // Cache downloaded blob locally in IndexedDB
      await db.reports.update(report.id, { fileBlob: blob });
      return blob;
    }
    console.error("Could not download cloud PDF:", error);
  }

  return null;
}

/**
 * Completely wipes user's cloud data and local data, then signs out
 */
export async function deleteAccountAndCloudData(): Promise<{ success: boolean; error?: string }> {
  const store = useSyncStore.getState();
  const user = store.user;

  try {
    if (user) {
      // 1. Delete all remote cloud data (tables and storage)
      const res = await deleteUserCloudData(user.id);
      if (res.error) throw res.error;
    }

    // 2. Wipe local storage
    await deleteAllData();

    // 3. Sign out auth session
    await signOut();

    // 4. Reset store
    store.setUser(null);
    store.setSyncStatus("synced");
    store.setLastSyncedAt(null);
    store.setHasPromptedMerge(false);

    return { success: true };
  } catch (err: any) {
    console.error("Account wipe failed:", err);
    return { success: false, error: err.message || "Failed to delete account" };
  }
}
