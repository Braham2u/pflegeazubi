import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DonutChart from '../components/DonutChart';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BRAND, SHIFT_COLORS } from '../constants/colors';
import { getShiftsForMonth } from '../services/shifts';
import { Shift } from '../types';

type Block = { start: string; end: string; breakMins: number; shiftType: string };
type DayEntry = { date: string; blocks: Block[] };

function calcHours(start: string, end: string, breakMins: number) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return (mins - breakMins) / 60;
}

function shiftsToEntries(shifts: Shift[]): DayEntry[] {
  const map: Record<string, Block[]> = {};
  for (const s of shifts) {
    if (s.shiftType === 'free' || s.shiftType === 'school' || !s.startTime || !s.endTime) continue;
    if (!map[s.date]) map[s.date] = [];
    map[s.date].push({ start: s.startTime, end: s.endTime, breakMins: s.breakMinutes, shiftType: s.shiftType });
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, blocks]) => ({ date, blocks }));
}

export default function WorkingTimeScreen() {
  const { t } = useLang();
  const { userProfile } = useAuth();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [allEntries, setAllEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const contractedMonthly = Math.round((userProfile?.contractedHoursPerWeek ?? 40) * 4.33);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const loadMonth = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const shifts = await getShiftsForMonth(userProfile.id, year, month);
      setAllEntries(shiftsToEntries(shifts));
    } catch {
      setAllEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile, year, month]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const visibleEntries = isCurrentMonth
    ? allEntries.filter(e => e.date <= today.toISOString().split('T')[0])
    : allEntries;

  const totalWorked = visibleEntries.reduce(
    (sum, e) => sum + e.blocks.reduce((s, b) => s + calcHours(b.start, b.end, b.breakMins), 0),
    0
  );
  const overtime = Math.max(0, totalWorked - contractedMonthly);

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

        {/* Donut chart card */}
        <View style={styles.chartCard}>
          <DonutChart worked={totalWorked} contracted={contractedMonthly} size={150} />
          <View style={styles.chartMeta}>
            <Text style={styles.chartWorked}>{Math.round(totalWorked * 10) / 10}h</Text>
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
        ) : visibleEntries.length === 0 ? (
          <Text style={styles.noData}>{t.workingTime.noData}</Text>
        ) : (
          visibleEntries.slice().reverse().map(entry => {
            const dayTotal = entry.blocks.reduce((s, b) => s + calcHours(b.start, b.end, b.breakMins), 0);
            const d = new Date(entry.date + 'T12:00:00');
            const dow = d.getDay();
            const label = `${t.days.short[dow === 0 ? 6 : dow - 1]}, ${d.getDate()}.${d.getMonth() + 1}.`;
            return (
              <View key={entry.date} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{label}</Text>
                  <Text style={styles.dayTotal}>{Math.round(dayTotal * 10) / 10}h</Text>
                </View>
                {entry.blocks.map((block, i) => {
                  const bh = calcHours(block.start, block.end, block.breakMins);
                  const color = SHIFT_COLORS[block.shiftType as keyof typeof SHIFT_COLORS]?.text ?? BRAND.primary;
                  return (
                    <View key={i} style={styles.blockRow}>
                      <View style={[styles.blockDot, { backgroundColor: color }]} />
                      <Text style={styles.blockTime}>{block.start} – {block.end}</Text>
                      <Text style={styles.blockHours}>{Math.round(bh * 10) / 10}h</Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: BRAND.primary, fontWeight: '600' },
  monthLabel: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary },
  chartCard: {
    backgroundColor: BRAND.surface, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', columnGap: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chartMeta: { flex: 1 },
  chartWorked: { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary },
  chartSub: { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  chartOf: { fontSize: 12, color: BRAND.textSecondary, marginTop: 6 },
  overtimeBadge: {
    marginTop: 10, backgroundColor: '#DCFCE7',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  overtimeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  noData: { textAlign: 'center', color: BRAND.textSecondary, marginTop: 48, fontSize: 14 },
  dayBlock: { backgroundColor: BRAND.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  dayTitle: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  dayTotal: { fontSize: 14, fontWeight: '700', color: BRAND.primary },
  blockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, columnGap: 10 },
  blockDot: { width: 8, height: 8, borderRadius: 4 },
  blockTime: { flex: 1, fontSize: 13, color: BRAND.textSecondary },
  blockHours: { fontSize: 13, fontWeight: '600', color: BRAND.textPrimary },
});
