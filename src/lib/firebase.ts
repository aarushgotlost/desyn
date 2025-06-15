
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDXpHoGCjeavDoJog2gSVj6lfPnVFY5oGs",
  authDomain: "desyn-dcef7.firebaseapp.com",
  projectId: "desyn-dcef7",
  storageBucket: "desyn-dcef7.appspot.com",
  messagingSenderId: "655959843333",
  appId: "1:655959843333:web:950355b7bfa7ec6fb8726c",
  measurementId: "G-K1HYBSY780",
};

// Export VAPID_KEY for use in notification setup
export const VAPID_KEY = "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0";

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging could not be initialized:", error);
  }
}

export { app, auth, db, storage, messaging };
