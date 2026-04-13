import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/auth';
import { getUserProfile } from '../services/users';
import { User } from '../types';

interface AuthContextValue {
  userProfile: User | null;
  loading: boolean;
  loginWithDemoUser: (user: User) => void;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  userProfile: null,
  loading: true,
  loginWithDemoUser: () => {},
  logoutAll: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_api_key') {
      setLoading(false);
      return;
    }
    return onAuthChange(async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

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
    setUserProfile(null);
  }

  return (
    <AuthContext.Provider value={{ userProfile, loading, loginWithDemoUser, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
