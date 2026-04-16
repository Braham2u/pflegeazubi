import {
  collection, doc, setDoc, getDocs, query,
  where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TimeEntry, DailyTimeRecord, ClockAction } from '../types';

const COL = 'timeEntries';

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build a DailyTimeRecord from raw TimeEntry array (sorted by timestamp). */
export function buildDailyRecord(entries: TimeEntry[]): DailyTimeRecord | null {
  if (!entries.length) return null;

  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first  = sorted[0];

  const rec: DailyTimeRecord = {
    date:       first.date,
    azubiId:    first.azubiId,
    azubiName:  first.azubiName,
    facilityId: first.facilityId,
    entries:    sorted,
  };

  for (const e of sorted) {
    if (e.action === 'start')      rec.startAt      = e.timestamp;
    if (e.action === 'breakStart') rec.breakStartAt = e.timestamp;
    if (e.action === 'breakEnd')   rec.breakEndAt   = e.timestamp;
    if (e.action === 'end')        rec.endAt        = e.timestamp;
  }

  if (rec.startAt && rec.endAt) {
    rec.totalMinutes = Math.round(
      (new Date(rec.endAt).getTime() - new Date(rec.startAt).getTime()) / 60000
    );
    rec.isComplete = true;
  }

  if (rec.breakStartAt && rec.breakEndAt) {
    rec.breakMinutes = Math.round(
      (new Date(rec.breakEndAt).getTime() - new Date(rec.breakStartAt).getTime()) / 60000
    );
  }

  if (rec.totalMinutes !== undefined) {
    rec.netMinutes = rec.totalMinutes - (rec.breakMinutes ?? 0);
  }

  return rec;
}

/** Determine which action is next for an azubi today given existing entries. */
export function nextAction(entries: TimeEntry[]): ClockAction | null {
  const actions = new Set(entries.map(e => e.action));
  if (!actions.has('start'))      return 'start';
  if (!actions.has('breakStart')) return 'breakStart';
  if (!actions.has('breakEnd'))   return 'breakEnd';
  if (!actions.has('end'))        return 'end';
  return null; // day complete
}

/** Check German ArbZG break requirement: ≥30 min break if shift > 6h. */
export function checkBreakCompliance(rec: DailyTimeRecord): string | null {
  if (!rec.isComplete) return null;
  const worked = rec.totalMinutes ?? 0;
  const brk    = rec.breakMinutes ?? 0;
  if (worked > 360 && brk < 30) {
    return `Pflichtpause fehlt (${brk} min statt mind. 30 min bei ${Math.round(worked / 60 * 10) / 10}h Arbeitszeit)`;
  }
  return null;
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Record a clock action for an azubi.
 * Document ID: {azubiId}_{date}_{action}
 */
export async function clockAction(
  azubiId: string,
  azubiName: string,
  facilityId: string,
  action: ClockAction,
  date = todayISO(),
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');

  const now = new Date().toISOString();
  const id  = `${azubiId}_${date}_${action}`;

  const entry: TimeEntry = {
    id, azubiId, azubiName, facilityId, date, action,
    timestamp: now,
    createdAt: now,
  };

  await setDoc(doc(db, COL, id), entry);
}

// ── Read ─────────────────────────────────────────────────────────────────────

/** Get all time entries for an azubi on a specific date. */
export async function getEntriesForDay(
  azubiId: string,
  date = todayISO(),
): Promise<TimeEntry[]> {
  if (!db) return [];

  const q = query(
    collection(db, COL),
    where('azubiId', '==', azubiId),
    where('date', '==', date),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as TimeEntry);
}

/** Get all entries for an azubi in a given month — returns one DailyTimeRecord per day. */
export async function getMonthlyRecords(
  azubiId: string,
  year: number,
  month: number, // 0-indexed (JS Date convention)
): Promise<DailyTimeRecord[]> {
  if (!db) return [];

  const pad   = (n: number) => String(n).padStart(2, '0');
  const from  = `${year}-${pad(month + 1)}-01`;
  const toY   = month === 11 ? year + 1 : year;
  const toM   = month === 11 ? 0 : month + 1;
  const to    = `${toY}-${pad(toM + 1)}-01`;

  const q = query(
    collection(db, COL),
    where('azubiId', '==', azubiId),
    where('date', '>=', from),
    where('date', '<',  to),
    orderBy('date'),
    orderBy('timestamp'),
  );

  const snap = await getDocs(q);
  const entries = snap.docs.map(d => d.data() as TimeEntry);

  // Group by date
  const byDate = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const records: DailyTimeRecord[] = [];
  for (const [, dayEntries] of byDate) {
    const rec = buildDailyRecord(dayEntries);
    if (rec) records.push(rec);
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

/** Admin: get today's attendance across a facility — all azubis who clocked in. */
export async function getTodayAttendance(
  facilityId: string,
): Promise<DailyTimeRecord[]> {
  if (!db) return [];

  const today = todayISO();
  const q = query(
    collection(db, COL),
    where('facilityId', '==', facilityId),
    where('date', '==', today),
    orderBy('timestamp'),
  );

  const snap = await getDocs(q);
  const entries = snap.docs.map(d => d.data() as TimeEntry);

  const byAzubi = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    if (!byAzubi.has(e.azubiId)) byAzubi.set(e.azubiId, []);
    byAzubi.get(e.azubiId)!.push(e);
  }

  const records: DailyTimeRecord[] = [];
  for (const [, azubiEntries] of byAzubi) {
    const rec = buildDailyRecord(azubiEntries);
    if (rec) records.push(rec);
  }
  return records;
}

/** Lookup an azubi by their numeric PIN stored in Firestore users collection. */
export async function getAzubiByPin(
  facilityId: string,
  pin: string,
): Promise<{ id: string; name: string } | null> {
  if (!db) return null;

  const q = query(
    collection(db, 'users'),
    where('primaryFacilityId', '==', facilityId),
    where('clockPin', '==', pin),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { id: snap.docs[0].id, name: data.name as string };
}
