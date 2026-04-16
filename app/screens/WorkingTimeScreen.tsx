import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DonutChart from '../components/DonutChart';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BRAND, SHIFT_COLORS } from '../constants/colors';
import { getShiftsForMonth } from '../services/shifts';
import { getMonthlyRecords, checkBreakCompliance } from '../services/timeEntries';
import { submitCorrectionRequest, getMyCorrectionRequests } from '../services/corrections';
import { Shift, DailyTimeRecord, CorrectionRequest, ClockAction } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function minToHStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcShiftHours(start: string, end: string, breakMins: number): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return (mins - breakMins) / 60;
}

const CLOCK_ACTION_LABELS: Record<ClockAction, string> = {
  start:      'Beginn fehlt',
  breakStart: 'Pausen-Beginn fehlt',
  breakEnd:   'Pausen-Ende fehlt',
  end:        'Ende fehlt',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkingTimeScreen() {
  const { t } = useLang();
  const { userProfile } = useAuth();
  const today     = new Date();
  const todayISO  = today.toISOString().slice(0, 10);

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [shifts,   setShifts]   = useState<Shift[]>([]);
  const [records,  setRecords]  = useState<DailyTimeRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [corrModal, setCorrModal] = useState<{ date: string; action: ClockAction } | null>(null);
  const [corrNote, setCorrNote]   = useState('');
  const [corrTime, setCorrTime]   = useState('');
  const [corrSaving, setCorrSaving] = useState(false);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const contractedMonthly = Math.round((userProfile?.contractedHoursPerWeek ?? 40) * 4.33);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const loadMonth = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [s, r, c] = await Promise.all([
        getShiftsForMonth(userProfile.id, year, month),
        getMonthlyRecords(userProfile.id, year, month),
        getMyCorrectionRequests(userProfile.id),
      ]);
      setShifts(s);
      setRecords(r);
      setCorrections(c);
    } catch {
      setShifts([]); setRecords([]); setCorrections([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile, year, month]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // ── Computed ────────────────────────────────────────────────────────────────

  // Total actual clocked net minutes (capped to current month visible days)
  const cutoff = isCurrentMonth ? todayISO : `${year}-${String(month + 2).padStart(2, '0')}-01`;
  const visibleRecords = records.filter(r => r.date < cutoff);
  const totalClockedMins = visibleRecords.reduce((s, r) => s + (r.netMinutes ?? 0), 0);
  const totalClockedHours = totalClockedMins / 60;

  // Shifts as fallback for days without clock entries
  const shiftsByDate = new Map<string, Shift[]>();
  for (const s of shifts) {
    if (s.shiftType === 'free' || s.shiftType === 'school' || !s.startTime || !s.endTime) continue;
    if (s.date >= cutoff) continue;
    if (!shiftsByDate.has(s.date)) shiftsByDate.set(s.date, []);
    shiftsByDate.get(s.date)!.push(s);
  }

  const clockedDates = new Set(visibleRecords.map(r => r.date));
  const onlyShiftDates = [...shiftsByDate.keys()].filter(d => !clockedDates.has(d)).sort();

  // All unique dates that have either clock records or shifts
  const allDates = [...new Set([...visibleRecords.map(r => r.date), ...onlyShiftDates])].sort().reverse();

  const overtime = Math.max(0, totalClockedHours - contractedMonthly);

  // Pending corrections lookup by date+action
  const corrPendingKey = new Set(
    corrections.filter(c => c.status === 'pending').map(c => `${c.date}_${c.missingAction}`)
  );

  // ── Correction submit ───────────────────────────────────────────────────────

  const openCorrModal = (date: string, action: ClockAction) => {
    setCorrModal({ date, action });
    setCorrNote('');
    setCorrTime('');
  };

  const submitCorr = async () => {
    if (!corrModal || !userProfile) return;
    if (!corrTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Ungültige Uhrzeit', 'Bitte im Format HH:MM eingeben, z.B. 08:30');
      return;
    }
    setCorrSaving(true);
    try {
      await submitCorrectionRequest(
        userProfile.id, userProfile.name,
        userProfile.primaryFacilityId,
        corrModal.date, corrModal.action,
        corrTime, corrNote,
      );
      Alert.alert('Gesendet', 'Deine Korrekturanfrage wurde an die Ausbildungsleitung gesendet.');
      setCorrModal(null);
      loadMonth();
    } catch {
      Alert.alert('Fehler', 'Bitte erneut versuchen.');
    } finally {
      setCorrSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.workingTime.title}</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{t.months[month]} {year}</Text>
          <TouchableOpacity
            onPress={() => setViewDate(new Date(year, month + 1, 1))}
            style={[styles.navBtn, { opacity: isCurrentMonth ? 0.3 : 1 }]}
            disabled={isCurrentMonth}
          >
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Donut chart */}
        <View style={styles.chartCard}>
          <DonutChart worked={totalClockedHours} contracted={contractedMonthly} size={150} />
          <View style={styles.chartMeta}>
            <Text style={styles.chartWorked}>{minToHStr(totalClockedMins)}</Text>
            <Text style={styles.chartSub}>{t.workingTime.hoursWorked}</Text>
            <Text style={styles.chartOf}>{t.workingTime.of} {contractedMonthly}h {t.workingTime.contracted}</Text>
            {overtime > 0.5 && (
              <View style={styles.overtimeBadge}>
                <Text style={styles.overtimeText}>+{Math.round(overtime * 10) / 10}h {t.workingTime.overtime}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily breakdown */}
        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 32 }} />
        ) : allDates.length === 0 ? (
          <Text style={styles.noData}>{t.workingTime.noData}</Text>
        ) : (
          allDates.map(date => {
            const rec   = visibleRecords.find(r => r.date === date);
            const dayShifts = shiftsByDate.get(date) ?? [];
            const d     = new Date(date + 'T12:00:00');
            const dow   = d.getDay();
            const label = `${t.days.short[dow === 0 ? 6 : dow - 1]}, ${d.getDate()}.${d.getMonth() + 1}.`;

            // Hours to display
            const clockedH  = rec ? (rec.netMinutes ?? 0) / 60 : null;
            const scheduledH = dayShifts.reduce((s, sh) => s + calcShiftHours(sh.startTime, sh.endTime, sh.breakMinutes), 0);
            const displayH  = clockedH !== null ? clockedH : scheduledH;

            const breakWarn = rec ? checkBreakCompliance(rec) : null;

            return (
              <View key={date} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{label}</Text>
                  <View style={styles.dayRight}>
                    {clockedH !== null ? (
                      <View style={styles.clockedBadge}>
                        <Text style={styles.clockedBadgeText}>gestempelt</Text>
                      </View>
                    ) : (
                      <View style={styles.scheduledBadge}>
                        <Text style={styles.scheduledBadgeText}>geplant</Text>
                      </View>
                    )}
                    <Text style={styles.dayTotal}>{Math.round(displayH * 10) / 10}h</Text>
                  </View>
                </View>

                {/* Clocked rows */}
                {rec && (
                  <View style={styles.clockedRows}>
                    {rec.startAt      && <ClockRow icon="▶" label="Beginn"    val={fmtTime(rec.startAt)} />}
                    {rec.breakStartAt && <ClockRow icon="☕" label="Pause"     val={fmtTime(rec.breakStartAt)} />}
                    {rec.breakEndAt   && <ClockRow icon="▶" label="Weiter"    val={fmtTime(rec.breakEndAt)} />}
                    {rec.endAt        && <ClockRow icon="■" label="Ende"      val={fmtTime(rec.endAt)} />}
                    {rec.breakMinutes !== undefined && rec.breakMinutes > 0 && (
                      <ClockRow icon="⏸" label="Pause gesamt" val={minToHStr(rec.breakMinutes)} subtle />
                    )}
                  </View>
                )}

                {/* Fallback: shift rows (no clock data) */}
                {!rec && dayShifts.map((s, i) => {
                  const color = SHIFT_COLORS[s.shiftType as keyof typeof SHIFT_COLORS]?.text ?? BRAND.primary;
                  return (
                    <View key={i} style={styles.blockRow}>
                      <View style={[styles.blockDot, { backgroundColor: color }]} />
                      <Text style={styles.blockTime}>{s.startTime} – {s.endTime}</Text>
                      <Text style={styles.blockHours}>{Math.round(calcShiftHours(s.startTime, s.endTime, s.breakMinutes) * 10) / 10}h</Text>
                    </View>
                  );
                })}

                {/* Missing clock entries — correction buttons */}
                {dayShifts.length > 0 && rec && !rec.isComplete && (
                  <View style={styles.corrSection}>
                    <Text style={styles.corrTitle}>Stempelung unvollständig</Text>
                    {(['start', 'end'] as ClockAction[]).map(a => {
                      if (rec.entries.some(e => e.action === a)) return null;
                      const key = `${date}_${a}`;
                      const pending = corrPendingKey.has(key);
                      return (
                        <TouchableOpacity
                          key={a}
                          style={[styles.corrBtn, pending && styles.corrBtnPending]}
                          onPress={() => !pending && openCorrModal(date, a)}
                          disabled={pending}
                        >
                          <Text style={styles.corrBtnText}>
                            {pending ? `⏳ ${CLOCK_ACTION_LABELS[a]} — Anfrage läuft` : `⚠ ${CLOCK_ACTION_LABELS[a]} — Korrektur beantragen`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Break compliance warning */}
                {breakWarn && (
                  <View style={styles.warnRow}>
                    <Text style={styles.warnText}>⚠ {breakWarn}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Correction request modal */}
      <Modal visible={!!corrModal} transparent animationType="slide" onRequestClose={() => setCorrModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Korrektur beantragen</Text>
            {corrModal && (
              <Text style={styles.modalSub}>{CLOCK_ACTION_LABELS[corrModal.action]} · {corrModal.date}</Text>
            )}

            <Text style={styles.fieldLabel}>Uhrzeit (HH:MM)</Text>
            <TextInput
              style={styles.fieldInput}
              value={corrTime}
              onChangeText={setCorrTime}
              placeholder="08:30"
              placeholderTextColor={BRAND.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>Anmerkung (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 64, textAlignVertical: 'top' }]}
              value={corrNote}
              onChangeText={setCorrNote}
              placeholder="z.B. Terminal war belegt, vergessen..."
              placeholderTextColor={BRAND.textSecondary}
              multiline
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCorrModal(null)}>
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitCorr} disabled={corrSaving}>
                {corrSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSubmitText}>Senden</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function ClockRow({ icon, label, val, subtle }: { icon: string; label: string; val: string; subtle?: boolean }) {
  return (
    <View style={crStyles.row}>
      <Text style={crStyles.icon}>{icon}</Text>
      <Text style={[crStyles.label, subtle && { color: BRAND.textSecondary }]}>{label}</Text>
      <Text style={[crStyles.val, subtle && { fontWeight: '500', color: BRAND.textSecondary }]}>{val}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 16, paddingBottom: 40 },
  title:    { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn:   { padding: 8 },
  navArrow: { fontSize: 28, color: BRAND.primary, fontWeight: '600' },
  monthLabel: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary },

  chartCard: {
    backgroundColor: BRAND.surface, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', columnGap: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chartMeta:    { flex: 1 },
  chartWorked:  { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary },
  chartSub:     { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  chartOf:      { fontSize: 12, color: BRAND.textSecondary, marginTop: 6 },
  overtimeBadge:{ marginTop: 10, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  overtimeText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  noData:   { textAlign: 'center', color: BRAND.textSecondary, marginTop: 48, fontSize: 14 },

  dayBlock:  { backgroundColor: BRAND.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  dayTitle:  { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  dayRight:  { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  dayTotal:  { fontSize: 14, fontWeight: '700', color: BRAND.primary },

  clockedBadge:   { backgroundColor: BRAND.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  clockedBadgeText: { fontSize: 10, fontWeight: '700', color: BRAND.primary },
  scheduledBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  scheduledBadgeText: { fontSize: 10, fontWeight: '700', color: BRAND.textSecondary },

  clockedRows: { rowGap: 2, marginBottom: 4 },

  blockRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, columnGap: 10 },
  blockDot:  { width: 8, height: 8, borderRadius: 4 },
  blockTime: { flex: 1, fontSize: 13, color: BRAND.textSecondary },
  blockHours:{ fontSize: 13, fontWeight: '600', color: BRAND.textPrimary },

  corrSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FEF3C7' },
  corrTitle:   { fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  corrBtn:     { backgroundColor: '#FEF3C7', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4 },
  corrBtnPending: { backgroundColor: '#F3F4F6' },
  corrBtnText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  warnRow:  { marginTop: 8, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10 },
  warnText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 4 },
  modalSub:     { fontSize: 13, color: BRAND.textSecondary, marginBottom: 20 },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  fieldInput:   { backgroundColor: BRAND.background, borderWidth: 1.5, borderColor: BRAND.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: BRAND.textPrimary, marginBottom: 16 },
  modalBtns:    { flexDirection: 'row', columnGap: 12, marginTop: 4 },
  modalCancel:  { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: BRAND.border, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  modalSubmit:  { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND.primary, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const crStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, columnGap: 8 },
  icon:  { fontSize: 12, width: 18, textAlign: 'center', color: BRAND.textSecondary },
  label: { fontSize: 13, color: BRAND.textPrimary, flex: 1 },
  val:   { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary },
});
