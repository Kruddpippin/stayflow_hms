import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stayflow.hms",
  appName: "StayFlow",
  webDir: "dist",
  server: {
    // Live updates: app always loads the latest version from Vercel.
    // Every deployment to stayflow-hms.vercel.app is instantly live in the app.
    url: "https://stayflow-hms.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0F766E",
      showSpinner: false,
      androidSpinnerStyle: "small",
      spinnerColor: "#ffffff",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F766E",
      overlaysWebView: false,
    },
  },
};

export default config;
