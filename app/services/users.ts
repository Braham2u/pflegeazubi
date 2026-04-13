import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}
