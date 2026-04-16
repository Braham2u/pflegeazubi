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
  dateOfBirth?: string;   // DD.MM.YYYY
  startDate?: string;     // DD.MM.YYYY — training start date
  phone?: string;
}

export interface Shift {
  id: string;
  azubiId: string;
  date: string; // ISO: 2026-04-09
  shiftType: ShiftType;
  startTime: string; // 06:00
  endTime: string;   // 14:00
  breakMinutes: number;
  facilityId: string | null;
  facilityName: string;
  unitId: string | null;
  unitName: string | null;
  supervisor: string | null;
  notes: string | null;
}

export type WishReason = 'vacation' | 'sick' | 'other';

export interface AvailabilityWish {
  id: string;
  azubiId: string;
  azubiName: string;
  date: string;
  wishFree: boolean;
  reason?: WishReason;
  note?: string;
  timeWindows: { start: string; end: string }[];
  status: 'pending' | 'approved' | 'rejected';
}

// ── Time Clock ──────────────────────────────────────────────────────────────

export type ClockAction = 'start' | 'breakStart' | 'breakEnd' | 'end';

export interface TimeEntry {
  id: string;
  azubiId: string;
  azubiName: string;
  facilityId: string;
  date: string;           // YYYY-MM-DD
  action: ClockAction;
  timestamp: string;      // ISO datetime
  shiftId?: string;
  corrected?: boolean;
  correctedBy?: string;
  createdAt?: string;
}

export interface DailyTimeRecord {
  date: string;
  azubiId: string;
  azubiName: string;
  facilityId: string;
  entries: TimeEntry[];
  startAt?: string;       // ISO datetime
  breakStartAt?: string;
  breakEndAt?: string;
  endAt?: string;
  totalMinutes?: number;  // start → end
  breakMinutes?: number;  // breakStart → breakEnd
  netMinutes?: number;    // totalMinutes − breakMinutes
  isComplete?: boolean;   // has both start and end
  overtimeMinutes?: number;
}

// ── Correction Requests ─────────────────────────────────────────────────────

export interface CorrectionRequest {
  id: string;
  azubiId: string;
  azubiName: string;
  facilityId: string;
  date: string;           // YYYY-MM-DD
  missingAction: ClockAction;
  proposedTime: string;   // HH:MM
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedBy?: string;
  respondedAt?: string;
}
