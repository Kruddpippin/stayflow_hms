import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stayflow.hms",
  appName: "StayFlow",
  webDir: "dist",
  server: {
    // For production APK, leave this commented out — it will use the bundled dist/
    // For live-reload during development, uncomment and set to your local IP:
    // url: "http://192.168.x.x:5173",
    // cleartext: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true for debug builds
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
