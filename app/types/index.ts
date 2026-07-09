export type ShiftType = 'early' | 'late' | 'night' | 'school' | 'free' | 'external';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'azubi' | 'admin' | 'subAdmin';
  primaryFacilityId: string;
  ausbildungYear?: 1 | 2 | 3;
  contractedHoursPerWeek: number;
  language: 'de' | 'en' | 'ar' | 'tl' | 'hi';
  dateOfBirth?: string;
  startDate?: string;
  phone?: string;
}

export interface Shift {
  id: string;
  azubiId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
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

export type ClockAction = 'start' | 'breakStart' | 'breakEnd' | 'end';

export interface TimeEntry {
  id: string;
  azubiId: string;
  azubiName: string;
  facilityId: string;
  date: string;
  action: ClockAction;
  timestamp: string;
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
  startAt?: string;
  breakStartAt?: string;
  breakEndAt?: string;
  endAt?: string;
  totalMinutes?: number;
  breakMinutes?: number;
  netMinutes?: number;
  isComplete?: boolean;
  overtimeMinutes?: number;
}

export type FacilityType = 'hospital' | 'careHome' | 'ambulatory' | 'school' | 'other';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address?: string;
  city?: string;
}

export type PlacementRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PlacementRequest {
  id: string;
  traineeId: string;
  traineeName: string;
  facilityId: string;
  facilityName: string;
  startMonth: string;
  endMonth: string;
  status: PlacementRequestStatus;
  note?: string;
  createdAt: number;
  respondedAt?: number;
  adminResponse?: string;
}

export interface Rotation {
  id: string;
  azubiId: string;
  facilityName: string;
  unitName?: string;
  facilityType: FacilityType;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface CorrectionRequest {
  id: string;
  azubiId: string;
  azubiName: string;
  facilityId: string;
  date: string;
  missingAction: ClockAction;
  proposedTime: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedBy?: string;
  respondedAt?: string;
}
