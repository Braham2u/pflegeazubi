import {
  collection, query, where, getDocs, doc, updateDoc,
  orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { AvailabilityWish } from '../types';

/** All wishes for a single Azubi, sorted by date. */
export async function getWishesForAzubi(azubiId: string): Promise<AvailabilityWish[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'wishes'),
    where('azubiId', '==', azubiId),
    orderBy('date'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilityWish));
}

/** Wishes for a specific Azubi within a single week. */
export async function getWishesForWeek(azubiId: string, weekStart: string): Promise<AvailabilityWish[]> {
  if (!db) return [];
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split('T')[0];

  const q = query(
    collection(db, 'wishes'),
    where('azubiId', '==', azubiId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilityWish));
}

/**
 * Submit / update wishes for a week.
 * Uses deterministic IDs `{azubiId}_{date}` so re-submitting overwrites.
 */
export async function submitWishes(wishes: Omit<AvailabilityWish, 'id'>[]): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);
  for (const wish of wishes) {
    const docId = `${wish.azubiId}_${wish.date}`;
    const ref   = doc(db, 'wishes', docId);
    batch.set(ref, { ...wish, createdAt: Date.now() });
  }
  await batch.commit();
}

/** All wishes (admin view). Optionally filtered by status. */
export async function getAllWishes(
  status?: 'pending' | 'approved' | 'rejected',
): Promise<AvailabilityWish[]> {
  if (!db) return [];
  const q = status
    ? query(collection(db, 'wishes'), where('status', '==', status), orderBy('date'))
    : query(collection(db, 'wishes'), orderBy('date'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilityWish));
}

/** Approve or reject a wish (admin). */
export async function updateWishStatus(
  wishId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'wishes', wishId), {
    status,
    respondedBy,
    respondedAt: Date.now(),
  });
}

/** Count wishes by status — used for dashboard metrics. */
export async function countWishesByStatus(): Promise<{ pending: number; approved: number; rejected: number }> {
  if (!db) return { pending: 0, approved: 0, rejected: 0 };
  const snap = await getDocs(collection(db, 'wishes'));
  const result = { pending: 0, approved: 0, rejected: 0 };
  snap.docs.forEach(d => {
    const s = d.data().status as 'pending' | 'approved' | 'rejected';
    if (s in result) result[s]++;
  });
  return result;
}
