import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

/** Returns all users with role 'azubi'. Admin-only. */
export async function getAllAzubis(): Promise<User[]> {
  if (!db) return [];
  const q = query(collection(db, 'users'), where('role', '==', 'azubi'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}
