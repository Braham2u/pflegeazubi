import { ShiftType, Shift } from '../types';

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

export const ADMIN_AZUBIS = [
  { id: 'demo-a1', name: 'Abraham T. Borbor Jr.' },
  { id: 'demo-a2', name: 'Fatima Al-Hassan' },
  { id: 'demo-a3', name: 'Jana Müller' },
];

export type DayAssignment = { shiftType: ShiftType; locationId: string; startTime?: string; endTime?: string };
export type AzubiPlan = Record<string, DayAssignment>;

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

export const sharedPlanStore: Record<string, AzubiPlan> = {};

export function publishPlan(plan: Record<string, AzubiPlan>): void {
  Object.keys(plan).forEach(azubiId => {
    sharedPlanStore[azubiId] = { ...plan[azubiId] };
  });
}

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

export function hasPlan(azubiId: string): boolean {
  return !!sharedPlanStore[azubiId] && Object.keys(sharedPlanStore[azubiId]).length > 0;
}

export function planToShifts(plan: Record<string, AzubiPlan>): Shift[] {
  const shifts: Shift[] = [];
  Object.entries(plan).forEach(([azubiId, azubiPlan]) => {
    Object.entries(azubiPlan).forEach(([iso, assignment]) => {
      shifts.push(assignmentToShift(azubiId, iso, assignment));
    });
  });
  return shifts;
}
