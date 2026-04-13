import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shift } from '../types';
import ShiftCard from '../components/ShiftCard';
import WeekBanner from '../components/WeekBanner';
import { BRAND, SHIFT_COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getShiftsForWeek, hasPlan } from '../data/sharedPlanStore';
const DUMMY_SHIFTS: Shift[] = [
  { id: '1', azubiId: 'demo', date: '', shiftType: 'early', startTime: '06:00', endTime: '14:00', breakMinutes: 30, facilityId: 'fac1', facilityName: 'Caritas St. Konrad', unitId: 'u1', unitName: 'Wohnbereich 2', supervisor: 'Fr. Maier', notes: 'Ausbildungsnachweis mitbringen' },
  { id: '2', azubiId: 'demo', date: '', shiftType: 'school', startTime: '08:00', endTime: '15:30', breakMinutes: 45, facilityId: null, facilityName: 'Berufsschule Pfarrkirchen', unitId: null, unitName: 'Raum 12', supervisor: null, notes: null },
  { id: '3', azubiId: 'demo', date: '', shiftType: 'late', startTime: '14:00', endTime: '22:00', breakMinutes: 30, facilityId: 'fac1', facilityName: 'Caritas St. Konrad', unitId: 'u2', unitName: 'Demenzstation', supervisor: 'Hr. Schmidt', notes: null },
  { id: '4', azubiId: 'demo', date: '', shiftType: 'early', startTime: '06:00', endTime: '14:00', breakMinutes: 30, facilityId: 'fac1', facilityName: 'Caritas St. Konrad', unitId: 'u1', unitName: 'Wohnbereich 2', supervisor: 'Fr. Maier', notes: null },
  { id: '5', azubiId: 'demo', date: '', shiftType: 'free', startTime: '', endTime: '', breakMinutes: 0, facilityId: null, facilityName: '', unitId: null, unitName: null, supervisor: null, notes: null },
  { id: '6', azubiId: 'demo', date: '', shiftType: 'night', startTime: '22:00', endTime: '06:00', breakMinutes: 45, facilityId: 'fac1', facilityName: 'Caritas St. Konrad', unitId: 'u1', unitName: 'Wohnbereich 2', supervisor: 'Fr. Maier', notes: 'Nachtdienstprotokoll ausfüllen' },
  { id: '7', azubiId: 'demo', date: '', shiftType: 'free', startTime: '', endTime: '', breakMinutes: 0, facilityId: null, facilityName: '', unitId: null, unitName: null, supervisor: null, notes: null },
];

// Day names are now sourced from useLang() inside the component

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
}

function calcHours(shifts: Shift[]): number {
  return shifts
    .filter(s => s.shiftType !== 'free' && s.shiftType !== 'school' && s.startTime && s.endTime)
    .reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60; // overnight
      return sum + (mins - s.breakMinutes) / 60;
    }, 0);
}

export default function ShiftPlanScreen() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [selected, setSelected] = useState<Shift | null>(null);
  const { userProfile } = useAuth();
  const { t } = useLang();
  const DAY_NAMES = t.days.short;
  const DAY_NAMES_FULL = t.days.long;

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Use the published plan from the admin if available; otherwise fall back to demo shifts
  const azubiId = userProfile?.id ?? 'demo';
  let weekShifts: (Shift | null)[];
  if (hasPlan(azubiId)) {
    weekShifts = getShiftsForWeek(azubiId, weekStart);
  } else {
    const shifts: Shift[] = DUMMY_SHIFTS.map((s, i) => ({ ...s, date: toISO(weekDates[i]) }));
    weekShifts = weekDates.map(d => shifts.find(s => s.date === toISO(d)) ?? null);
  }

  const allShifts = weekShifts.filter((s): s is Shift => s !== null);

  const workedHours = Math.round(calcHours(allShifts));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dienstplan</Text>
          <Text style={styles.subtitle}>KW {getKW(weekStart)} · {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}</Text>
        </View>

        {/* Week navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(addDays(weekStart, -7))}>
            <Text style={styles.navText}>{t.shiftPlan.prevWeek}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(getMonday(new Date()))}>
            <Text style={[styles.navText, { color: BRAND.primary }]}>{t.shiftPlan.today}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(addDays(weekStart, 7))}>
            <Text style={styles.navText}>{t.shiftPlan.nextWeek}</Text>
          </TouchableOpacity>
        </View>

        {/* Hours banner */}
        <WeekBanner workedHours={workedHours} contractedHours={40} />

        {/* Day rows */}
        {weekDates.map((date, i) => {
          const iso = toISO(date);
          const shift = weekShifts[i];
          const isToday = iso === toISO(today);
          return (
            <View key={iso} style={[styles.dayRow, isToday && styles.todayRow]}>
              <View style={styles.dayLabel}>
                <Text style={[styles.dayName, isToday && styles.todayText]}>{DAY_NAMES[i]}</Text>
                <Text style={[styles.dayDate, isToday && styles.todayText]}>{formatDate(date)}</Text>
              </View>
              <View style={styles.cardArea}>
                {shift ? (
                  <ShiftCard shift={shift} onPress={setSelected} />
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Kein Dienst</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          {selected && (
            <View style={styles.sheet}>
              <View style={[styles.sheetHandle]} />
              <Text style={styles.sheetTitle}>
                {DAY_NAMES_FULL[new Date(selected.date).getDay() === 0 ? 6 : new Date(selected.date).getDay() - 1]},{' '}
                {formatDate(new Date(selected.date))}
              </Text>
              <View style={[styles.sheetBadge, { backgroundColor: SHIFT_COLORS[selected.shiftType].background }]}>
                <Text style={[styles.sheetBadgeText, { color: SHIFT_COLORS[selected.shiftType].text }]}>
                  {SHIFT_COLORS[selected.shiftType].label}
                </Text>
              </View>
              {selected.startTime ? (
                <DetailRow label="Zeit" value={`${selected.startTime} – ${selected.endTime}`} />
              ) : null}
              {selected.breakMinutes > 0 ? (
                <DetailRow label="Pause" value={`${selected.breakMinutes} min`} />
              ) : null}
              <DetailRow label="Einrichtung" value={selected.facilityName} />
              {selected.unitName ? <DetailRow label="Bereich" value={selected.unitName} /> : null}
              {selected.supervisor ? <DetailRow label="Praxisanleiter" value={selected.supervisor} /> : null}
              {selected.notes ? <DetailRow label="Hinweis" value={selected.notes} /> : null}
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getKW(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary },
  subtitle: { fontSize: 14, color: BRAND.textSecondary, marginTop: 2 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  navText: { fontSize: 14, color: BRAND.textSecondary, fontWeight: '500' },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, borderRadius: 12, padding: 4 },
  todayRow: { backgroundColor: '#F0FBF7' },
  dayLabel: { width: 44, paddingTop: 16, alignItems: 'center' },
  dayName: { fontSize: 13, fontWeight: '700', color: BRAND.textSecondary },
  dayDate: { fontSize: 11, color: BRAND.textSecondary, marginTop: 2 },
  todayText: { color: BRAND.primary },
  cardArea: { flex: 1 },
  emptyCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.border,
  },
  emptyText: { fontSize: 13, color: BRAND.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: BRAND.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 12 },
  sheetBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 16 },
  sheetBadgeText: { fontSize: 14, fontWeight: '600' },
  detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  detailLabel: { width: 120, fontSize: 14, color: BRAND.textSecondary },
  detailValue: { flex: 1, fontSize: 14, color: BRAND.textPrimary, fontWeight: '500' },
});
