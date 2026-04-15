import {
  doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function createUserProfile(uid: string, profile: Omit<User, 'id'>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, 'users', uid), profile);
}

export async function updateUserProfile(uid: string, updates: Partial<Omit<User, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'users', uid), updates as Record<string, unknown>);
}

export async function listAzubis(): Promise<User[]> {
  if (!db) return [];
  const q = query(collection(db, 'users'), where('role', '==', 'azubi'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}

export async function getAllAzubis(): Promise<User[]> {
  return listAzubis();
}

export async function listAdmins(): Promise<User[]> {
  if (!db) return [];
  const q = query(collection(db, 'users'), where('role', '==', 'admin'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}
