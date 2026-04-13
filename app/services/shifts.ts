import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Shift } from '../types';

export async function getShiftsForWeek(azubiId: string, weekStart: string): Promise<Shift[]> {
  if (!db) return [];
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split('T')[0];

  // Note: this compound query requires a composite Firestore index on
  // (azubiId ASC, date ASC). Firebase will print a link in the console
  // to create it automatically the first time this runs.
  const q = query(
    collection(db, 'shifts'),
    where('azubiId', '==', azubiId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date'),
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
}

export async function createShift(shift: Omit<Shift, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, 'shifts'), shift);
  return ref.id;
}
