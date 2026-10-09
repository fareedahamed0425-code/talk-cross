import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut as fbSignOut, Auth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

// Default fallback config (fetched dynamically from backend /api/auth/config on initialization)
let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB4G0nS7ZCzW7hWLnBxFjGqmU3NQzbTANY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'talk-cross.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'talk-cross',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'talk-cross.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '236419327612',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:236419327612:web:a826c9e0edcb0291efcbf9',
};

// Asynchronously fetch config from backend if available
fetch(`${API_BASE}/auth/config`)
  .then((res) => res.json())
  .then((backendConfig) => {
    if (backendConfig.apiKey) {
      firebaseConfig = { ...firebaseConfig, ...backendConfig };
    }
  })
  .catch(() => {
    // Keep default fallback
  });

function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth = getFirebaseAuth();
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

export { signInWithPopup, fbSignOut };
