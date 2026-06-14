// Centralized application configuration
// Single source of truth for env variables and external endpoints

export const appConfig = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || "",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
  },
  monitoring: {
    firebaseAnalyticsEnabled: true,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || "",
    logRocketAppId: import.meta.env.VITE_LOGROCKET_APP_ID || ""
  }
};
