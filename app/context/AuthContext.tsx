import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange } from '../services/auth';
import { getUserProfile } from '../services/users';
import { User } from '../types';

const DEMO_USER: User = {
  id: 'demo',
  name: 'Abraham T. Borbor Jr.',
  email: 'demo@pflegeazubi.de',
  role: 'azubi',
  primaryFacilityId: 'fac1',
  ausbildungYear: 2,
  contractedHoursPerWeek: 40,
  language: 'de',
};

const DEMO_ADMIN: User = {
  id: 'demo-admin',
  name: 'Maria Gruber',
  email: 'admin@pflegeazubi.de',
  role: 'admin',
  primaryFacilityId: 'fac1',
  contractedHoursPerWeek: 40,
  language: 'de',
};

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isDemo: boolean;
  loginAsDemo: () => void;
  loginAsDemoAdmin: () => void;
  loginWithDemoUser: (user: User) => void;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isDemo: false,
  loginAsDemo: () => {},
  loginAsDemoAdmin: () => {},
  loginWithDemoUser: () => {},
  logoutAll: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Only listen to Firebase auth if credentials look configured
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_api_key') {
      setLoading(false);
      return;
    }
    return onAuthChange(async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  function loginAsDemo() {
    setIsDemo(true);
    setUserProfile(DEMO_USER);
    setLoading(false);
  }

  function loginAsDemoAdmin() {
    setIsDemo(true);
    setUserProfile(DEMO_ADMIN);
    setLoading(false);
  }

  function loginWithDemoUser(user: User) {
    setIsDemo(true);
    setUserProfile(user);
    setLoading(false);
  }

  async function logoutAll() {
    if (!isDemo) {
      try {
        const { logout } = await import('../services/auth');
        await logout();
      } catch {}
    }
    setIsDemo(false);
    setFirebaseUser(null);
    setUserProfile(null);
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, isDemo, loginAsDemo, loginAsDemoAdmin, loginWithDemoUser, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
