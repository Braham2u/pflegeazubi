/**
 * sharedPlanStore — in-memory bridge between the admin ShiftPublisher and the Azubi ShiftPlan.
 * No Firebase needed: the admin writes here on "Veröffentlichen", the Azubi reads here on load.
 * Lives at module scope so it survives tab navigation within the same session.
 */

import { ShiftType, Shift } from '../types';

// ─── Shared location data ────────────────────────────────────────────────────

export interface CareLocation {
  id: string;
  facility: string;
  unit: string;
  icon: string;
  short: string;
  isSchool?: boolean;
}

export const LOCATIONS: CareLocation[] = [
  { id: 'loc1', facility: 'Caritas St. Konrad', unit: 'Wohnbereich 2',       icon: '🏠', short: 'CSK · WB2' },
  { id: 'loc2', facility: 'Caritas St. Konrad', unit: 'Demenzstation',        icon: '🏥', short: 'CSK · Demenz' },
  { id: 'loc3', facility: 'AWO Sonnenhof',       unit: 'Pflegestation 1',     icon: '🏡', short: 'AWO' },
  { id: 'loc4', facility: 'Berufsschule Pfarrkirchen', unit: 'Raum 12',       icon: '🎓', short: 'Berufsschule', isSchool: true },
];

// ─── Shared Azubi roster — IDs match the demo account IDs in demoAccounts.ts ─

export const ADMIN_AZUBIS = [
  { id: 'demo-a1', name: 'Abraham T. Borbor Jr.' },
  { id: 'demo-a2', name: 'Fatima Al-Hassan' },
  { id: 'demo-a3', name: 'Jana Müller' },
];

// ─── Plan types ──────────────────────────────────────────────────────────────

export type DayAssignment = { shiftType: ShiftType; locationId: string; startTime?: string; endTime?: string };
export type AzubiPlan = Record<string, DayAssignment>; // ISO-date → assignment

// ─── Shift time defaults ─────────────────────────────────────────────────────

const START: Record<ShiftType, string> = {
  early: '06:00', late: '14:00', night: '22:00',
  school: '08:00', free: '', external: '08:00',
};
const END: Record<ShiftType, string> = {
  early: '14:00', late: '22:00', night: '06:00',
  school: '16:00', free: '', external: '16:00',
};
const BREAK: Record<ShiftType, number> = {
  early: 30, late: 30, night: 45, school: 45, free: 0, external: 30,
};

// ─── The store ───────────────────────────────────────────────────────────────

// azubiId → (ISO-date → DayAssignment)
export const sharedPlanStore: Record<string, AzubiPlan> = {};

/** Called by the admin when pressing "Dienstplan veröffentlichen". */
export function publishPlan(plan: Record<string, AzubiPlan>): void {
  Object.keys(plan).forEach(azubiId => {
    sharedPlanStore[azubiId] = { ...plan[azubiId] };
  });
}

// ─── Helpers for ShiftPlanScreen ─────────────────────────────────────────────

function assignmentToShift(azubiId: string, iso: string, a: DayAssignment): Shift {
  const loc: CareLocation | undefined = LOCATIONS.find(l => l.id === a.locationId);
  return {
    id: `plan-${azubiId}-${iso}`,
    azubiId,
    date: iso,
    shiftType: a.shiftType,
    startTime: a.startTime ?? START[a.shiftType],
    endTime: a.endTime ?? END[a.shiftType],
    breakMinutes: BREAK[a.shiftType],
    facilityId: loc?.id ?? null,
    facilityName: loc?.facility ?? '',
    unitId: loc?.id ?? null,
    unitName: loc?.unit ?? null,
    supervisor: null,
    notes: null,
  };
}

/**
 * Returns an array of 7 Shift|null values for the week starting on weekStart.
 * Returns null for any day that has no assignment in the store.
 */
export function getShiftsForWeek(azubiId: string, weekStart: Date): (Shift | null)[] {
  const plan = sharedPlanStore[azubiId];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const a = plan?.[iso];
    return a ? assignmentToShift(azubiId, iso, a) : null;
  });
}

/** True if the admin has published at least one plan this session. */
export function hasPlan(azubiId: string): boolean {
  return !!sharedPlanStore[azubiId] && Object.keys(sharedPlanStore[azubiId]).length > 0;
}

/** Converts the full plan map to a flat Shift[] suitable for Firestore batch-write. */
export function planToShifts(plan: Record<string, AzubiPlan>): Shift[] {
  const shifts: Shift[] = [];
  Object.entries(plan).forEach(([azubiId, azubiPlan]) => {
    Object.entries(azubiPlan).forEach(([iso, assignment]) => {
      shifts.push(assignmentToShift(azubiId, iso, assignment));
    });
  });
  return shifts;
}
