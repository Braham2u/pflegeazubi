import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Shift } from '../types';

export async function getShiftsForWeek(azubiId: string, weekStart: string): Promise<Shift[]> {
  if (!db) return [];
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split('T')[0];

  // Requires composite Firestore index on (azubiId ASC, date ASC).
  // Firebase will print a console link to create it on first run.
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

export async function getShiftsForMonth(
  azubiId: string,
  year: number,
  month: number,
): Promise<Shift[]> {
  if (!db) return [];
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const q = query(
    collection(db, 'shifts'),
    where('azubiId', '==', azubiId),
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd),
    orderBy('date'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
}

/**
 * Batch-write a published shift plan to Firestore.
 * Uses deterministic IDs `{azubiId}_{date}` so re-publishing overwrites.
 */
export async function publishShifts(shifts: Shift[]): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);
  for (const { id: _id, ...shiftData } of shifts) {
    const docId = `${shiftData.azubiId}_${shiftData.date}`;
    batch.set(doc(db, 'shifts', docId), shiftData);
  }
  await batch.commit();
}

export async function createShift(shift: Omit<Shift, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, 'shifts'), shift);
  return ref.id;
}
