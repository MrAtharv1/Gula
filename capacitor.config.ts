import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.gula.health",
  appName: "Gula",
  webDir: "out",
  backgroundColor: "#FFE4EF",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1100,
      launchAutoHide: false,
      backgroundColor: "#FFE4EF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFE4EF",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#FFE4EF",
  },
};

export default config;
