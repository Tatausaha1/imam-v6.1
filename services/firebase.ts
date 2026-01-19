
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyACaFuJPIvj8urf5ZSDaw_pvgZNkx1mQLM",
  authDomain: "edusync-manager.firebaseapp.com",
  databaseURL: "https://edusync-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "edusync-manager",
  storageBucket: "edusync-manager.firebasestorage.app",
  messagingSenderId: "776387068593",
  appId: "1:776387068593:web:aa562f6f9d62c14ff09890",
  measurementId: "G-WDB4WFXBLZ"
};

// Mode simulasi aktif jika variabel env NEXT_PUBLIC_MOCK_AUTH disetel 'true'
export const isMockMode = typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_MOCK_AUTH === 'true';

let app: firebase.app.App | undefined;
let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;
let analytics: firebase.analytics.Analytics | undefined;

try {
  if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
  } else {
      app = firebase.app();
  }

  auth = firebase.auth();
  db = firebase.firestore();
  
  if (typeof window !== 'undefined') {
      // Mengaktifkan sinkronisasi data offline lintas tab browser
      db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn("Firestore: Multiple tabs open, persistence limited.");
            } else if (err.code === 'unimplemented') {
                console.warn("Firestore: Browser doesn't support persistence.");
            }
        });
  }

  if (typeof window !== 'undefined' && firebase.analytics.isSupported()) {
     analytics = firebase.analytics();
  }
  
  console.log("IMAM Database Connection: " + (isMockMode ? "SIMULATION MODE" : "LIVE CLOUD CONNECTED"));

} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, auth, db, analytics };
