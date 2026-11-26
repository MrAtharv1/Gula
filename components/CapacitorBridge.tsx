"use client";

import { useEffect } from "react";

/**
 * Native Capacitor Android integration:
 * - Configures pink status bar tint
 * - Handles OAuth deep link callback (`com.gula.health://auth-callback`)
 * - Handles Android hardware back button navigation
 */
export function CapacitorBridge() {
  useEffect(() => {
    let cleanupUrl: (() => void) | undefined;
    let cleanupBack: (() => void) | undefined;

    async function setup() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // 1. Style Android status bar to match pink splash/brand theme
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setBackgroundColor({ color: "#FFE4EF" });
          await StatusBar.setStyle({ style: Style.Light });
        } catch {
          // StatusBar plugin optional
        }

        // 2. Listen for OAuth deep-link callback from Chrome Custom Tabs
        const { App } = await import("@capacitor/app");
        const urlHandle = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url.startsWith("com.gula.health://")) return;

          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close().catch(() => {});

            const { getSupabase } = await import("@/lib/sync/supabaseClient");
            const client = getSupabase();
            if (!client) return;

            const parsed = new URL(url);
            const code = parsed.searchParams.get("code");
            if (code) {
              await client.auth.exchangeCodeForSession(code);
              return;
            }

            if (parsed.hash) {
              const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
              const accessToken = hashParams.get("access_token");
              const refreshToken = hashParams.get("refresh_token");
              if (accessToken && refreshToken) {
                await client.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              }
            }
          } catch (err) {
            console.error("Capacitor deep-link auth error:", err);
          }
        });
        cleanupUrl = () => {
          urlHandle.remove();
        };

        // 3. Hardware back button navigates back cleanly before exiting
        const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanupBack = () => {
          backHandle.remove();
        };
      } catch {
        // Running on web browser
      }
    }

    setup();

    return () => {
      cleanupUrl?.();
      cleanupBack?.();
    };
  }, []);

  return null;
}
