export type ShiftType = 'early' | 'late' | 'night' | 'school' | 'free' | 'external';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'azubi' | 'admin';
  primaryFacilityId: string;
  ausbildungYear?: 1 | 2 | 3;
  contractedHoursPerWeek: number;
  language: 'de' | 'en' | 'ar' | 'tl' | 'hi';
}

export interface Shift {
  id: string;
  azubiId: string;
  date: string; // ISO: 2026-04-09
  shiftType: ShiftType;
  startTime: string; // 06:00
  endTime: string; // 14:00
  breakMinutes: number;
  facilityId: string | null;
  facilityName: string;
  unitId: string | null;
  unitName: string | null;
  supervisor: string | null;
  notes: string | null;
}

export interface AvailabilityWish {
  id: string;
  azubiId: string;
  date: string;
  wishFree: boolean;
  timeWindows: { start: string; end: string }[];
  status: 'pending' | 'approved' | 'rejected';
}

