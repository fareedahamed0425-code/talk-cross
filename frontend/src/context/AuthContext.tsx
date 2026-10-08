import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, fbSignOut } from '../config/firebase.js';
import { api } from '../services/api.js';
import { User, UserStats } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  stats: UserStats | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isNewUserModalOpen: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDemoUser: (customName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; username?: string; bio?: string; profileImage?: string | null }) => Promise<void>;
  closeNewUserModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState<boolean>(false);

  // Sync token and profile with backend
  const syncWithBackend = async (idToken: string, fbUser?: FirebaseUser | null) => {
    try {
      api.setToken(idToken);
      setToken(idToken);

      const syncRes = await api.syncUser({
        displayName: fbUser?.displayName || undefined,
        email: fbUser?.email || undefined,
        profileImage: fbUser?.photoURL || undefined,
      });

      setUser(syncRes.user);

      if (syncRes.isNew) {
        setIsNewUserModalOpen(true);
      }

      // Fetch stats
      const meRes = await api.getMe();
      setStats(meRes.stats);
      setError(null);
    } catch (err: any) {
      console.error('Failed to sync with backend:', err);
      setError(err.message || 'Failed to sync with database');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const idToken = await fbUser.getIdToken();
          await syncWithBackend(idToken, fbUser);
        } catch (err: any) {
          console.error('Auth token fetch failed:', err);
          setError(err.message);
        }
      } else {
        // Check if demo token exists in localStorage
        const demoToken = localStorage.getItem('talk_cross_demo_token');
        if (demoToken) {
          try {
            await syncWithBackend(demoToken);
          } catch {
            localStorage.removeItem('talk_cross_demo_token');
            setUser(null);
            setToken(null);
            api.setToken(null);
          }
        } else {
          setUser(null);
          setToken(null);
          api.setToken(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      await syncWithBackend(idToken, cred.user);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant developer demo user sign in (for rapid local preview)
  const signInWithDemoUser = async (customName: string = 'Fareed') => {
    try {
      setIsLoading(true);
      setError(null);
      const clean = customName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mockUid = `demo_uid_${clean}`;
      // Construct a valid base64 payload JWT for demo
      const payload = {
        user_id: mockUid,
        uid: mockUid,
        name: customName,
        email: `${clean}@talk-cross.app`,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${clean}`,
      };
      const demoToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('talk_cross_demo_token', demoToken);
      await syncWithBackend(demoToken);
    } catch (err: any) {
      console.error('Demo Sign-In Error:', err);
      setError(err.message || 'Demo Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('talk_cross_demo_token');
      await fbSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setToken(null);
      api.setToken(null);
    } catch (err: any) {
      console.error('Sign-Out Error:', err);
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  const updateUserProfile = async (updates: {
    displayName?: string;
    username?: string;
    bio?: string;
    profileImage?: string | null;
  }) => {
    const res = await api.updateMe(updates);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        stats,
        token,
        isLoading,
        error,
        isNewUserModalOpen,
        signInWithGoogle,
        signInWithDemoUser,
        signOut,
        refreshProfile,
        updateUserProfile,
        closeNewUserModal: () => setIsNewUserModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
