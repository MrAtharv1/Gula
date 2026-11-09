import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthUser, CloudReport, CloudResult } from "./types";
import { ReportStatus } from "../db/schema";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("placeholder") &&
    !SUPABASE_ANON_KEY.includes("placeholder")
  );
};

// Singleton client instance (when configured)
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

/* ==================================================================
 * IN-MEMORY MOCK STORE FOR OFFLINE / TESTING / DEV WITHOUT KEYS
 * ================================================================== */
interface MockStore {
  user: AuthUser | null;
  reports: Map<string, CloudReport>;
  results: Map<string, CloudResult[]>;
  storageFiles: Map<string, Blob>;
  authListeners: Set<(user: AuthUser | null) => void>;
}

const mockStore: MockStore = {
  user: null,
  reports: new Map(),
  results: new Map(),
  storageFiles: new Map(),
  authListeners: new Set(),
};

/** Reset mock store (useful in test teardown) */
export function resetMockCloudStore() {
  mockStore.user = null;
  mockStore.reports.clear();
  mockStore.results.clear();
  mockStore.storageFiles.clear();
}

/** Set test mock user directly */
export function setMockUser(user: AuthUser | null) {
  mockStore.user = user;
  mockStore.authListeners.forEach((fn) => fn(user));
}

/* ==================================================================
 * AUTHENTICATION API
 * ================================================================== */

export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  // Local / Mock fallback (instant test authentication)
  const mockUser: AuthUser = {
    id: "usr_" + Math.random().toString(36).substring(2, 9),
    email,
    createdAt: new Date().toISOString(),
  };
  mockStore.user = mockUser;
  mockStore.authListeners.forEach((fn) => fn(mockUser));
  return { error: null };
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  // Local / Mock fallback
  const mockUser: AuthUser = {
    id: "google_usr_" + Math.random().toString(36).substring(2, 9),
    email: "user@example.com",
    avatarUrl: "https://avatar.vercel.sh/user",
    createdAt: new Date().toISOString(),
  };
  mockStore.user = mockUser;
  mockStore.authListeners.forEach((fn) => fn(mockUser));
  return { error: null };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { error } = await client.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  }

  mockStore.user = null;
  mockStore.authListeners.forEach((fn) => fn(null));
  return { error: null };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getSupabase();
  if (client) {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    return {
      id: user.id,
      email: user.email || "",
      avatarUrl: user.user_metadata?.avatar_url,
      createdAt: user.created_at,
    };
  }

  return mockStore.user;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  const client = getSupabase();
  if (client) {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || "",
          avatarUrl: session.user.user_metadata?.avatar_url,
          createdAt: session.user.created_at,
        });
      } else {
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  }

  mockStore.authListeners.add(callback);
  return () => {
    mockStore.authListeners.delete(callback);
  };
}

/* ==================================================================
 * STORAGE API (Lazy PDF Upload & Download)
 * ================================================================== */

export async function uploadPdfToStorage(
  userId: string,
  cloudId: string,
  fileBlob: Blob
): Promise<{ path: string | null; error: Error | null }> {
  const storagePath = `${userId}/${cloudId}.pdf`;
  const client = getSupabase();

  if (client) {
    const { error } = await client.storage
      .from("healthtrack-reports")
      .upload(storagePath, fileBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      return { path: null, error: new Error(error.message) };
    }
    return { path: storagePath, error: null };
  }

  // Mock Storage
  mockStore.storageFiles.set(storagePath, fileBlob);
  return { path: storagePath, error: null };
}

export async function downloadPdfFromStorage(
  storagePath: string
): Promise<{ blob: Blob | null; error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { data, error } = await client.storage
      .from("healthtrack-reports")
      .download(storagePath);

    if (error || !data) {
      return { blob: null, error: error ? new Error(error.message) : new Error("File not found") };
    }
    return { blob: data, error: null };
  }

  // Mock Storage
  let blob = mockStore.storageFiles.get(storagePath) || null;
  if (blob && !blob.type) {
    blob = new Blob([blob], { type: "application/pdf" });
  }
  return { blob, error: blob ? null : new Error("PDF not found in cloud storage") };
}

export async function deletePdfFromStorage(
  storagePath: string
): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { error } = await client.storage
      .from("healthtrack-reports")
      .remove([storagePath]);
    return { error: error ? new Error(error.message) : null };
  }

  mockStore.storageFiles.delete(storagePath);
  return { error: null };
}

/* ==================================================================
 * DATABASE API (Reports & Results Sync)
 * ================================================================== */

export async function pushCloudReport(
  report: Omit<CloudReport, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<{ data: CloudReport | null; error: Error | null }> {
  const client = getSupabase();
  const nowIso = new Date().toISOString();

  if (client) {
    const { data, error } = await client
      .from("reports")
      .upsert({
        ...report,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as CloudReport, error: null };
  }

  // Mock DB
  const id = report.id || "rep_" + Math.random().toString(36).substring(2, 9);
  const cloudReport: CloudReport = {
    ...report,
    id,
    created_at: nowIso,
    updated_at: nowIso,
  };
  mockStore.reports.set(id, cloudReport);
  return { data: cloudReport, error: null };
}

export async function pushCloudResults(
  results: (Omit<CloudResult, "id" | "created_at" | "updated_at"> & { id?: string })[]
): Promise<{ error: Error | null }> {
  if (results.length === 0) return { error: null };
  const client = getSupabase();
  const nowIso = new Date().toISOString();

  if (client) {
    const payload = results.map((r) => ({
      ...r,
      updated_at: nowIso,
    }));
    const { error } = await client.from("results").upsert(payload);
    return { error: error ? new Error(error.message) : null };
  }

  // Mock DB
  for (const res of results) {
    const reportId = res.report_id;
    const existing = mockStore.results.get(reportId) || [];
    const id = res.id || "res_" + Math.random().toString(36).substring(2, 9);
    existing.push({
      ...res,
      id,
      created_at: nowIso,
      updated_at: nowIso,
    });
    mockStore.results.set(reportId, existing);
  }
  return { error: null };
}

export async function updateCloudReportStatus(
  cloudId: string,
  status: ReportStatus,
  updatedAtIso: string
): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { error } = await client
      .from("reports")
      .update({ status, updated_at: updatedAtIso })
      .eq("id", cloudId);
    return { error: error ? new Error(error.message) : null };
  }

  // Mock DB
  const existing = mockStore.reports.get(cloudId);
  if (existing) {
    existing.status = status;
    existing.updated_at = updatedAtIso;
  }
  return { error: null };
}

export async function fetchCloudReports(
  userId: string
): Promise<{ reports: CloudReport[]; error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("report_date", { ascending: false });

    if (error) return { reports: [], error: new Error(error.message) };
    return { reports: (data || []) as CloudReport[], error: null };
  }

  // Mock DB
  const userReports = Array.from(mockStore.reports.values()).filter(
    (r) => r.user_id === userId
  );
  return { reports: userReports, error: null };
}

export async function fetchCloudResults(
  userId: string
): Promise<{ results: CloudResult[]; error: Error | null }> {
  const client = getSupabase();
  if (client) {
    const { data, error } = await client
      .from("results")
      .select("*")
      .eq("user_id", userId);

    if (error) return { results: [], error: new Error(error.message) };
    return { results: (data || []) as CloudResult[], error: null };
  }

  // Mock DB
  const userResults: CloudResult[] = [];
  for (const list of mockStore.results.values()) {
    for (const r of list) {
      if (r.user_id === userId) {
        userResults.push(r);
      }
    }
  }
  return { results: userResults, error: null };
}

/**
 * Permanently deletes all cloud data for a user (reports, results, storage files)
 */
export async function deleteUserCloudData(
  userId: string
): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (client) {
    // 1. Delete storage files
    const { data: files } = await client.storage
      .from("healthtrack-reports")
      .list(userId);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await client.storage.from("healthtrack-reports").remove(paths);
    }

    // 2. Delete database rows (RLS deletes own records)
    await client.from("results").delete().eq("user_id", userId);
    await client.from("reports").delete().eq("user_id", userId);

    return { error: null };
  }

  // Mock DB
  for (const [id, rep] of mockStore.reports.entries()) {
    if (rep.user_id === userId) {
      mockStore.reports.delete(id);
      mockStore.results.delete(id);
    }
  }
  for (const path of Array.from(mockStore.storageFiles.keys())) {
    if (path.startsWith(`${userId}/`)) {
      mockStore.storageFiles.delete(path);
    }
  }
  return { error: null };
}
