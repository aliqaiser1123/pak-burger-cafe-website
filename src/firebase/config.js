import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
    apiKey: "AIzaSyAiLp70B8aJKX34rOc3AJGSouvz3MDJ0sU",
    authDomain: "pak-burger.firebaseapp.com",
    projectId: "pak-burger",
    storageBucket: "pak-burger.firebasestorage.app",
    messagingSenderId: "698103044148",
    appId: "1:698103044148:web:bc580b779beaa43d14d261",
    measurementId: "G-F3Y4CSF0XG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable multi-tab offline data persistence
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore persistence failed: Browser not supported.");
    } else {
      console.error("Firestore persistence error: ", err);
    }
  });
}

const auth = getAuth(app);
const storage = getStorage(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, db, auth, storage, analytics };
