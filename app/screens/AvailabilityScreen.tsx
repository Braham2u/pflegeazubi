import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../context/LanguageContext';
import { BRAND } from '../constants/colors';

type TimeWindow = { id: string; start: string; end: string };
type DayWish = { wishFree: boolean; timeWindows: TimeWindow[] };
type WeekWishes = Record<string, DayWish>;

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function fmt(d: Date) { return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; }

// Module-level store so wishes survive tab navigation
const persistedWishes = new Map<string, WeekWishes>();
const STORE_KEY = 'azubi-wishes';

export default function AvailabilityScreen() {
  const { t } = useLang();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [wishes, setWishes] = useState<WeekWishes>({});
  const [editing, setEditing] = useState<{ date: string; windowId: string | null } | null>(null);
  const [editStart, setEditStart] = useState('07:00');
  const [editEnd, setEditEnd] = useState('14:00');

  // Load persisted wishes on mount
  useEffect(() => {
    const saved = persistedWishes.get(STORE_KEY);
    if (saved) setWishes(saved);
  }, []);

  // Save wishes whenever they change
  useEffect(() => {
    persistedWishes.set(STORE_KEY, wishes);
  }, [wishes]);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getDayWish(iso: string): DayWish {
    return wishes[iso] ?? { wishFree: false, timeWindows: [] };
  }

  function toggleWishFree(iso: string) {
    const curr = getDayWish(iso);
    setWishes(w => ({ ...w, [iso]: { ...curr, wishFree: !curr.wishFree } }));
  }

  function openAdd(iso: string) {
    setEditStart('07:00');
    setEditEnd('14:00');
    setEditing({ date: iso, windowId: null });
  }

  function openEdit(iso: string, windowId: string) {
    const tw = getDayWish(iso).timeWindows.find(w => w.id === windowId);
    if (tw) { setEditStart(tw.start); setEditEnd(tw.end); setEditing({ date: iso, windowId }); }
  }

  function saveEdit() {
    if (!editing) return;
    const { date, windowId } = editing;
    const curr = getDayWish(date);
    if (windowId === null) {
      const newTw: TimeWindow = { id: Date.now().toString(), start: editStart, end: editEnd };
      setWishes(w => ({ ...w, [date]: { ...curr, timeWindows: [...curr.timeWindows, newTw] } }));
    } else {
      setWishes(w => ({
        ...w,
        [date]: { ...curr, timeWindows: curr.timeWindows.map(tw => tw.id === windowId ? { ...tw, start: editStart, end: editEnd } : tw) },
      }));
    }
    setEditing(null);
  }

  function submitWeek() {
    Alert.alert(
      t.availability.submitWeek,
      'Deine Wünsche für diese Woche wurden eingereicht.',
      [{ text: 'OK' }]
    );
  }

  function deleteWindow(iso: string, windowId: string) {
    const curr = getDayWish(iso);
    setWishes(w => ({ ...w, [iso]: { ...curr, timeWindows: curr.timeWindows.filter(tw => tw.id !== windowId) } }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.availability.title}</Text>

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.weekLabelBox}>
            <Text style={styles.weekLabel}>{fmt(weekStart)} – {fmt(addDays(weekStart, 6))}</Text>
          </View>
          <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day cards */}
        {weekDates.map((date, i) => {
          const iso = toISO(date);
          const dw = getDayWish(iso);
          const isToday = iso === toISO(today);
          return (
            <View key={iso} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayLabelBox}>
                  <View style={[styles.dayDot, isToday && styles.dayDotToday]} />
                  <View>
                    <Text style={[styles.dayName, isToday && { color: BRAND.primary }]}>
                      {t.days.long[i]}
                    </Text>
                    <Text style={[styles.dayDate, isToday && { color: BRAND.primary }]}>{fmt(date)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => toggleWishFree(iso)}
                  style={[styles.wishFreeBtn, dw.wishFree && styles.wishFreeBtnActive]}
                >
                  <Text style={[styles.wishFreeBtnText, dw.wishFree && styles.wishFreeBtnTextActive]}>
                    {t.availability.wishFree}
                  </Text>
                </TouchableOpacity>
              </View>

              {dw.wishFree ? (
                <View style={styles.wishFreeTag}>
                  <Text style={styles.wishFreeTagText}>{t.availability.wishFreeSet}</Text>
                </View>
              ) : (
                <View style={styles.timeWindowArea}>
                  {dw.timeWindows.map(tw => (
                    <View key={tw.id} style={styles.timeRow}>
                      <View style={styles.timeBar} />
                      <TouchableOpacity style={styles.timeInfo} onPress={() => openEdit(iso, tw.id)}>
                        <Text style={styles.timeText}>{tw.start} – {tw.end}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteWindow(iso, tw.id)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => openAdd(iso)} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>{t.availability.addTimeframe}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Submit week button */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitWeek} activeOpacity={0.8}>
          <Text style={styles.submitBtnText}>{t.availability.submitWeek}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit / Add modal */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.availability.editTimeframe}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.availability.from}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={editStart}
                  onChangeText={setEditStart}
                  placeholder="HH:MM"
                  keyboardType="numbers-and-punctuation"
                  selectTextOnFocus
                />
              </View>
              <View style={[styles.inputGroup, { marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>{t.availability.to}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={editEnd}
                  onChangeText={setEditEnd}
                  placeholder="HH:MM"
                  keyboardType="numbers-and-punctuation"
                  selectTextOnFocus
                />
              </View>
            </View>
            <View style={styles.sheetBtns}>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.sheetBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>{t.availability.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.sheetBtn, styles.saveBtn]}>
                <Text style={styles.saveBtnText}>{t.availability.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: BRAND.primary, fontWeight: '600' },
  weekLabelBox: {
    backgroundColor: BRAND.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  weekLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dayCard: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayLabelBox: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.border },
  dayDotToday: { backgroundColor: BRAND.primary },
  dayName: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  dayDate: { fontSize: 12, color: BRAND.textSecondary, marginTop: 1 },
  wishFreeBtn: {
    borderWidth: 1.5, borderColor: BRAND.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  wishFreeBtnActive: { backgroundColor: BRAND.primary },
  wishFreeBtnText: { fontSize: 12, fontWeight: '600', color: BRAND.primary },
  wishFreeBtnTextActive: { color: '#fff' },
  wishFreeTag: {
    backgroundColor: BRAND.primaryLight, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  wishFreeTagText: { fontSize: 13, fontWeight: '600', color: BRAND.primary },
  timeWindowArea: { marginTop: 4 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, columnGap: 8,
  },
  timeBar: { width: 3, height: 28, borderRadius: 2, backgroundColor: BRAND.primary },
  timeInfo: { flex: 1 },
  timeText: { fontSize: 14, fontWeight: '600', color: BRAND.textPrimary },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 20, color: '#DC2626', fontWeight: '400', lineHeight: 22 },
  addBtn: { marginTop: 4, paddingVertical: 6 },
  addBtnText: { fontSize: 13, color: BRAND.primary, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BRAND.surface, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: BRAND.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 24 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 6 },
  timeInput: {
    backgroundColor: BRAND.background, borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, textAlign: 'center',
  },
  sheetBtns: { flexDirection: 'row', columnGap: 12 },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: BRAND.background, borderWidth: 1, borderColor: BRAND.border },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  saveBtn: { backgroundColor: BRAND.primary },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  submitBtn: {
    backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
