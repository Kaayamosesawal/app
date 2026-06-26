import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage }   from "firebase/storage";
import { getAuth }      from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyAt-TWmA7W2O5VUnaS_y_9soRRV5u_8O8s",
  authDomain:        "slirus.firebaseapp.com",
  projectId:         "slirus",
  storageBucket:     "slirus.firebasestorage.app",
  messagingSenderId: "604437913517",
  appId:             "1:604437913517:web:f72fdc33244dc926440b24",
  measurementId:     "G-83REHT8FMK",
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = getAuth(app);

// Analytics is browser-only — guard it so it never crashes the init chain
// in Node, the Firebase emulator, or SSR environments.
export let analytics = null;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export default app;