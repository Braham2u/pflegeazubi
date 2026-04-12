import { ShiftType } from '../types';

export const SHIFT_COLORS: Record<ShiftType, { background: string; text: string; label: string }> = {
  early:    { background: '#E1F5EE', text: '#085041', label: 'Frühdienst' },
  late:     { background: '#EEEDFE', text: '#3C3489', label: 'Spätdienst' },
  night:    { background: '#FAECE7', text: '#712B13', label: 'Nachtdienst' },
  school:   { background: '#FAEEDA', text: '#633806', label: 'Berufsschule' },
  free:     { background: '#F3F4F6', text: '#6B7280', label: 'Frei' },
  external: { background: '#E8F4FD', text: '#1E5C8B', label: 'Extern' },
};

export const BRAND = {
  primary: '#085041',
  primaryLight: '#E1F5EE',
  accent: '#10B981',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};
