/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import type { FirebaseOptions } from 'firebase/app';

/**
 * 🔥 Load config ONLY from .env
 * KHÔNG fallback localConfig nữa
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ⚠️ Validate config để tránh lỗi ngầm
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Firebase config thiếu. Kiểm tra file .env");
}

/**
 * 🔥 Init app (an toàn khi reload)
 */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * 🔥 Firebase services
 */
export const db = getFirestore(app); // ❌ KHÔNG dùng dbId nữa
export const storage = getStorage(app);
export const auth = getAuth(app);

/**
 * 🔥 Auth providers
 */
export const googleProvider = new GoogleAuthProvider();

/**
 * 🔐 Login
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("❌ Lỗi đăng nhập Google:", error);
    throw error;
  }
};

/**
 * 🔐 Logout
 */
export const logout = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("❌ Lỗi đăng xuất:", error);
    throw error;
  }
};
