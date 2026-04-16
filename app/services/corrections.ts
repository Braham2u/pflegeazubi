import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CorrectionRequest, ClockAction } from '../types';

const COL = 'correctionRequests';

/** Azubi submits a correction request for a missed clock action. */
export async function submitCorrectionRequest(
  azubiId: string,
  azubiName: string,
  facilityId: string,
  date: string,
  missingAction: ClockAction,
  proposedTime: string,
  note: string,
): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

  const ref = await addDoc(collection(db, COL), {
    azubiId,
    azubiName,
    facilityId,
    date,
    missingAction,
    proposedTime,
    note,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

/** Azubi: get own correction requests. */
export async function getMyCorrectionRequests(
  azubiId: string,
): Promise<CorrectionRequest[]> {
  if (!db) return [];

  const q = query(
    collection(db, COL),
    where('azubiId', '==', azubiId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CorrectionRequest));
}

/** Admin: get all pending correction requests for a facility. */
export async function getPendingCorrections(
  facilityId: string,
): Promise<CorrectionRequest[]> {
  if (!db) return [];

  const q = query(
    collection(db, COL),
    where('facilityId', '==', facilityId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CorrectionRequest));
}

/** Admin: approve or reject a correction request. */
export async function respondToCorrection(
  correctionId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');

  await updateDoc(doc(db, COL, correctionId), {
    status,
    respondedBy,
    respondedAt: new Date().toISOString(),
  });
}

/** Count pending corrections for a facility (admin dashboard metric). */
export async function countPendingCorrections(facilityId: string): Promise<number> {
  const items = await getPendingCorrections(facilityId);
  return items.length;
}
