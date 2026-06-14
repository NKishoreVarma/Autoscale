import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 2. Print active Firebase config during startup
console.log("Active Firebase Config:", firebaseConfig);

// 9. Check if any Firebase keys are empty or undefined
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Firebase Initialization Warning: Key "${key}" is empty or undefined.`);
  }
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 7. Print getAuth().app.options to confirm loaded project
console.log("Active Firebase App Options:", auth.app.options);

// 10. Print Firebase Auth Instance
console.log("Firebase Auth Instance:", auth);

export const db = getFirestore(app);
export const storage = getStorage(app);

