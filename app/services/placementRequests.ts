import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Facility, FacilityType, PlacementRequest } from '../types';
import { LOCATIONS } from '../data/sharedPlanStore';

function locationsAsFacilities(): Facility[] {
  return LOCATIONS.map(loc => ({
    id:   loc.id,
    name: `${loc.facility} · ${loc.unit}`,
    type: (loc.isSchool ? 'school'
         : loc.icon === '🏥' ? 'hospital'
         : 'careHome') as FacilityType,
  }));
}

export async function getAllFacilities(): Promise<Facility[]> {
  if (!db) return locationsAsFacilities();
  const snap = await getDocs(collection(db, 'facilities'));
  if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() } as Facility));
  return locationsAsFacilities();
}

export async function getMyRequests(traineeId: string): Promise<PlacementRequest[]> {
  if (!db) return [];
  const q = query(collection(db, 'placementRequests'), where('traineeId', '==', traineeId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PlacementRequest))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function submitPlacementRequest(data: Omit<PlacementRequest, 'id'>): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  await addDoc(collection(db, 'placementRequests'), data);
}

export async function getAllPlacementRequests(): Promise<PlacementRequest[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'placementRequests'));
  const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PlacementRequest))
    .sort((a, b) => {
      const diff = (order[a.status] ?? 1) - (order[b.status] ?? 1);
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    });
}

export async function getRequestsForFacility(facilityId: string): Promise<PlacementRequest[]> {
  if (!db) return [];
  const q = query(collection(db, 'placementRequests'), where('facilityId', '==', facilityId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PlacementRequest))
    .sort((a, b) => a.startMonth.localeCompare(b.startMonth));
}

export async function deleteRequest(requestId: string): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  await deleteDoc(doc(db, 'placementRequests', requestId));
}

export async function respondToRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminResponse?: string,
): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  await updateDoc(doc(db, 'placementRequests', requestId), {
    status,
    respondedAt: Date.now(),
    ...(adminResponse ? { adminResponse } : {}),
  });
}
