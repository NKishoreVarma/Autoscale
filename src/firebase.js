import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { appConfig } from "./config/appConfig";

const firebaseConfig = {
  apiKey: appConfig.firebase.apiKey,
  authDomain: appConfig.firebase.authDomain,
  projectId: appConfig.firebase.projectId,
  storageBucket: appConfig.firebase.storageBucket,
  messagingSenderId: appConfig.firebase.messagingSenderId,
  appId: appConfig.firebase.appId
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

