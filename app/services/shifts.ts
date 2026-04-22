import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
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

  // Query only by azubiId (no composite index needed), filter dates client-side.
  const q = query(collection(db, 'shifts'), where('azubiId', '==', azubiId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Shift))
    .filter(s => s.date >= weekStart && s.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
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

  // Query only by azubiId (no composite index needed), filter dates client-side.
  const q = query(collection(db, 'shifts'), where('azubiId', '==', azubiId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Shift))
    .filter(s => s.date >= monthStart && s.date <= monthEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
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

export async function getWeekShiftsForAzubis(azubiIds: string[], weekStart: string): Promise<Shift[]> {
  if (!db || azubiIds.length === 0) return [];
  const results = await Promise.all(azubiIds.map(id => getShiftsForWeek(id, weekStart)));
  return results.flat();
}

export async function createShift(shift: Omit<Shift, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, 'shifts'), shift);
  return ref.id;
}
