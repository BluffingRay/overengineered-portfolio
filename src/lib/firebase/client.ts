// Firebase client (Product A shell) — safe to expose, NEXT_PUBLIC_* only.
// Lazy singleton; no hard dependency when Firebase env absent (Product B).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !authDomain || !projectId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export function getFirebaseApp() {
  const config = getFirebaseConfig();
  if (!config) return null;
  if (getApps().length) return getApp();
  return initializeApp(config);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

// Continue with Google provider — caller adds drive.file scope when needed.
export function getGoogleProvider(withDrive = false) {
  const provider = new GoogleAuthProvider();
  if (withDrive) {
    provider.addScope("https://www.googleapis.com/auth/drive.file");
  }
  return provider;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}
