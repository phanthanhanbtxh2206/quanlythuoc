/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app instance if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Workspace Scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Flag indicating sign-in flow is active
let isSigningIn = false;
// In-memory access token cache (CRITICAL: never persist to localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;

export const initGoogleAuth = (
  onAuthChange: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentGoogleUser = user;
    if (user) {
      if (cachedAccessToken) {
        onAuthChange(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not available in memory after refresh; user can trigger one-click sign in
        cachedAccessToken = null;
        onAuthChange(user, null);
      }
    } else {
      cachedAccessToken = null;
      currentGoogleUser = null;
      onAuthChange(null, null);
    }
  });
};

export interface GoogleAuthResult {
  user: User | null;
  accessToken: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Sign in with Google using popup and obtain the OAuth Access Token for Sheets & Drive
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được Access Token từ Google Authentication.');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken, cancelled: false };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // User dismissed or closed the login popup
      return { user: null, accessToken: '', cancelled: true };
    }
    if (error?.code === 'auth/popup-blocked') {
      return {
        user: null,
        accessToken: '',
        cancelled: true,
        error: 'Trình duyệt đang chặn cửa sổ đăng nhập Google. Vui lòng cho phép mở popup cho trang này.',
      };
    }
    console.warn('Lỗi kết nối Google OAuth:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return currentGoogleUser;
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  currentGoogleUser = null;
};
