import {
  collection, doc, addDoc, getDocs, deleteDoc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Rotation } from '../types';

const COL = 'rotations';

export async function getRotationsForAzubi(azubiId: string): Promise<Rotation[]> {
  if (!db) return [];
  const q = query(collection(db, COL), where('azubiId', '==', azubiId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Rotation))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function addRotation(data: Omit<Rotation, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function deleteRotation(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COL, id));
}

export function rotationStatus(r: Rotation): 'completed' | 'current' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0];
  if (today > r.endDate)   return 'completed';
  if (today < r.startDate) return 'upcoming';
  return 'current';
}
