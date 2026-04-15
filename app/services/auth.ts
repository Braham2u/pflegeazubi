import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, firebaseConfig } from './firebase';
import { User } from '../types';

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase not configured.');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (!auth) return;
  return signOut(auth);
}

export async function resetPassword(email: string) {
  if (!auth) throw new Error('Firebase not configured.');
  return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

/**
 * Create a new Azubi account using the Firebase Auth REST API.
 * This approach does NOT require a secondary Firebase app and does NOT
 * sign out the current admin. The Firestore profile is then written using
 * the admin's existing db connection.
 */
export async function createAzubiAccount(
  email: string,
  password: string,
  profile: Omit<User, 'id' | 'email'>,
): Promise<string> {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) throw new Error('Firebase not configured');

  // Step 1: Create the Auth user via REST API
  const res = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await res.json();

  if (data.error) {
    const msg: string = data.error.message ?? 'Unknown error';
    if (msg === 'EMAIL_EXISTS') throw new Error('auth/email-already-in-use');
    if (msg === 'WEAK_PASSWORD : Password should be at least 6 characters') {
      throw new Error('auth/weak-password');
    }
    throw new Error(msg);
  }

  const uid: string = data.localId;

  // Step 2: Write Firestore profile using the admin's db connection
  const { createUserProfile } = await import('./users');
  await createUserProfile(uid, { ...profile, email });

  return uid;
}
