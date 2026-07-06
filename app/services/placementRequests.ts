import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Facility, PlacementRequest } from '../types';

const DEMO_FACILITIES: Facility[] = [
  { id: 'demo_fac_1', name: 'Caritas St. Konrad',           type: 'careHome',   address: 'Konradstraße 12',    city: 'München' },
  { id: 'demo_fac_2', name: 'Klinikum Großhadern',          type: 'hospital',   address: 'Marchioninistr. 15', city: 'München' },
  { id: 'demo_fac_3', name: 'Ambulanter Pflegedienst Nord', type: 'ambulatory', address: 'Nordring 8',         city: 'München' },
  { id: 'demo_fac_4', name: 'Berufsfachschule für Pflege',  type: 'school',     address: 'Schulstraße 3',      city: 'München' },
  { id: 'demo_fac_5', name: 'Seniorenheim Am Park',         type: 'careHome',   address: 'Parkweg 21',         city: 'Augsburg' },
  { id: 'demo_fac_6', name: 'AWO Pflegeheim Westend',       type: 'careHome',   address: 'Westendstraße 44',   city: 'München' },
];

export async function getAllFacilities(): Promise<Facility[]> {
  if (!db) return DEMO_FACILITIES;
  const snap = await getDocs(collection(db, 'facilities'));
  if (snap.empty) return DEMO_FACILITIES;
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Facility));
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

export async function respondToRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminResponse?: string,
): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  const update: Record<string, unknown> = { status, respondedAt: Date.now() };
  if (adminResponse) update.adminResponse = adminResponse;
  await updateDoc(doc(db, 'placementRequests', requestId), update);
}
