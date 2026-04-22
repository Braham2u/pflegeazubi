import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND, SHIFT_COLORS, ADMIN_PURPLE } from '../../constants/colors';
import { ShiftType } from '../../types';
import {
  LOCATIONS, publishPlan, planToShifts,
  DayAssignment, AzubiPlan, CareLocation,
} from '../../data/sharedPlanStore';
import { publishShifts, getWeekShiftsForAzubis } from '../../services/shifts';
import { getAllAzubis } from '../../services/users';
import { User } from '../../types';

// Default location when a shift type is first selected
const DEFAULT_LOCATION: Record<ShiftType, string> = {
  early: 'loc1', late: 'loc2', night: 'loc1',
  school: 'loc4', free: '', external: 'loc3',
};

const SHIFT_OPTIONS: ShiftType[] = ['early', 'late', 'night', 'school', 'free'];

const SHIFT_LABELS: Record<ShiftType, string> = {
  early: 'Frühdienst', late: 'Spätdienst', night: 'Nachtdienst',
  school: 'Berufsschule', free: 'Frei', external: 'Extern',
};
const SHIFT_ABBR: Record<ShiftType, string> = {
  early: 'F', late: 'S', night: 'N', school: 'BS', free: '–', external: 'E',
};
const SHIFT_TIMES: Record<ShiftType, string> = {
  early: '06–14', late: '14–22', night: '22–06',
  school: '08–16', free: '', external: '08–16',
};

const DAY_SHORTS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const START_DEFAULTS: Record<ShiftType, string> = {
  early: '06:00', late: '14:00', night: '22:00', school: '08:00', free: '', external: '08:00',
};
const END_DEFAULTS: Record<ShiftType, string> = {
  early: '14:00', late: '22:00', night: '06:00', school: '16:00', free: '', external: '16:00',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function fmt(d: Date) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }

function initPlan(azubis: { id: string }[], weekStart: Date): Record<string, AzubiPlan> {
  const result: Record<string, AzubiPlan> = {};
  azubis.forEach(az => {
    result[az.id] = {};
    for (let i = 0; i < 7; i++) {
      const iso = toISO(addDays(weekStart, i));
      result[az.id][iso] = { shiftType: 'free', locationId: '' };
    }
  });
  return result;
}

// Locations shown in step 2 of the modal, filtered by shift type
function locationsFor(st: ShiftType): CareLocation[] {
  if (st === 'school') return LOCATIONS.filter(l => l.isSchool);
  return LOCATIONS.filter(l => !l.isSchool);
}

// ─── Component ───────────────────────────────────────────────────────────────

type EditState = {
  azubiId: string;
  iso: string;
  step: 1 | 2 | 3;
  pendingShift: ShiftType | null;
  pendingStart: string;
  pendingEnd: string;
};

export default function ShiftPublisherScreen() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [azubis, setAzubis] = useState<User[]>([]);
  const [loadingAzubis, setLoadingAzubis] = useState(true);
  const [plan, setPlan] = useState<Record<string, AzubiPlan>>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [toast, setToast] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);

  useEffect(() => {
    getAllAzubis()
      .then(list => {
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAzubis(list);
        const base = initPlan(list, getMonday(today));
        // Load existing shifts from Firestore for this week
        getWeekShiftsForAzubis(list.map(a => a.id), toISO(getMonday(today)))
          .then(shifts => {
            shifts.forEach(s => {
              if (base[s.azubiId]) {
                base[s.azubiId][s.date] = {
                  shiftType: s.shiftType,
                  locationId: s.facilityId ?? '',
                  startTime: s.startTime,
                  endTime: s.endTime,
                };
              }
            });
            setPlan({ ...base });
          })
          .catch(() => setPlan(base));
      })
      .catch(() => {})
      .finally(() => setLoadingAzubis(false));
  }, []);

  // Reload from Firestore when week changes
  useEffect(() => {
    if (azubis.length === 0) return;
    const base = initPlan(azubis, weekStart);
    getWeekShiftsForAzubis(azubis.map(a => a.id), toISO(weekStart))
      .then(shifts => {
        shifts.forEach(s => {
          if (base[s.azubiId]) {
            base[s.azubiId][s.date] = {
              shiftType: s.shiftType,
              locationId: s.facilityId ?? '',
              startTime: s.startTime,
              endTime: s.endTime,
            };
          }
        });
        setPlan({ ...base });
      })
      .catch(() => setPlan(base));
  }, [weekStart, azubis]);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const editingAzubi = azubis.find(a => a.id === editing?.azubiId);
  const selectedLoc = LOCATIONS.find(l => l.id === selectedLocId) ?? null;
  const currentAssignment = editing ? plan[editing.azubiId]?.[editing.iso] : null;
  const step = editing?.step ?? 1;

  function openEdit(azubiId: string, iso: string) {
    setEditing({ azubiId, iso, step: 1, pendingShift: null, pendingStart: '', pendingEnd: '' });
  }

  function selectShiftType(st: ShiftType) {
    if (!editing) return;
    if (st === 'free') {
      setPlan(p => ({ ...p, [editing.azubiId]: { ...p[editing.azubiId], [editing.iso]: { shiftType: 'free', locationId: '' } } }));
      setEditing(null);
    } else {
      setEditing(e => e ? { ...e, step: 2, pendingShift: st, pendingStart: START_DEFAULTS[st], pendingEnd: END_DEFAULTS[st] } : null);
    }
  }

  function adjustTime(field: 'start' | 'end', delta: number) {
    setEditing(e => {
      if (!e) return e;
      const cur = field === 'start' ? e.pendingStart : e.pendingEnd;
      if (!cur) return e;
      const [h, m] = cur.split(':').map(Number);
      const totalMins = ((h * 60 + m + delta * 30) + 1440) % 1440;
      const nh = Math.floor(totalMins / 60);
      const nm = totalMins % 60;
      const val = `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
      return field === 'start' ? { ...e, pendingStart: val } : { ...e, pendingEnd: val };
    });
  }

  function confirmTime() {
    setEditing(e => e ? { ...e, step: 3 } : null);
  }

  function selectLocation(locationId: string) {
    if (!editing?.pendingShift) return;
    setPlan(p => ({ ...p, [editing.azubiId]: { ...p[editing.azubiId], [editing.iso]: { shiftType: editing.pendingShift!, locationId, startTime: editing.pendingStart, endTime: editing.pendingEnd } } }));
    setEditing(null);
  }

  async function publish() {
    publishPlan(plan);                       // instant local update for same-session views
    publishShifts(planToShifts(plan))        // persist to Firestore (fire-and-forget — errors are silent)
      .catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  function getLocationLabel(locationId: string) {
    const loc = LOCATIONS.find(l => l.id === locationId);
    return loc ? `${loc.facility} · ${loc.unit}` : '';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Dienstplan</Text>

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

        {/* ── Location switcher ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.locSwitcherScroll}
          contentContainerStyle={styles.locSwitcherContent}
        >
          {/* "Alle" chip */}
          <TouchableOpacity
            style={[styles.locChip, selectedLocId === null && styles.locChipActive]}
            onPress={() => setSelectedLocId(null)}
            activeOpacity={0.75}
          >
            <Text style={styles.locChipIcon}>🗂️</Text>
            <Text style={[styles.locChipText, selectedLocId === null && styles.locChipTextActive]}>Alle</Text>
          </TouchableOpacity>

          {LOCATIONS.map(loc => (
            <TouchableOpacity
              key={loc.id}
              style={[styles.locChip, selectedLocId === loc.id && styles.locChipActive]}
              onPress={() => setSelectedLocId(loc.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.locChipIcon}>{loc.icon}</Text>
              <Text style={[styles.locChipText, selectedLocId === loc.id && styles.locChipTextActive]}>
                {loc.short}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active location label */}
        {selectedLoc && (
          <View style={styles.activeLoc}>
            <Text style={styles.activeLocText}>
              {selectedLoc.icon}  {selectedLoc.facility} · {selectedLoc.unit}
            </Text>
          </View>
        )}

        {/* ── Main grid ── */}
        <View style={styles.headerRow}>
          <View style={styles.nameCol} />
          {weekDates.map((d, i) => (
            <View key={i} style={styles.dayCol}>
              <Text style={styles.dayShort}>{DAY_SHORTS[i]}</Text>
              <Text style={styles.dayNum}>{d.getDate()}</Text>
            </View>
          ))}
        </View>

        {loadingAzubis ? (
          <ActivityIndicator color={ADMIN_PURPLE} style={{ marginVertical: 32 }} />
        ) : azubis.length === 0 ? (
          <Text style={{ textAlign: 'center', color: BRAND.textSecondary, marginVertical: 32 }}>
            Noch keine Azubis im System.
          </Text>
        ) : null}

        {azubis.map(az => (
          <View key={az.id} style={styles.azubiRow}>
            <View style={styles.nameCol}>
              <Text style={styles.azubiName} numberOfLines={1}>{az.name.split(' ')[0]}</Text>
            </View>
            {weekDates.map(d => {
              const iso = toISO(d);
              const a = plan[az.id]?.[iso] ?? { shiftType: 'free' as ShiftType, locationId: '' };
              const isFiltered = selectedLocId !== null && a.locationId !== selectedLocId;
              const colors = SHIFT_COLORS[a.shiftType];
              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.dayCol, styles.shiftCell,
                    isFiltered ? styles.shiftCellDimmed : { backgroundColor: colors.background },
                  ]}
                  onPress={() => openEdit(az.id, iso)}
                  activeOpacity={0.7}
                >
                  {isFiltered ? (
                    <Text style={styles.shiftCellDimText}>–</Text>
                  ) : (
                    <>
                      <Text style={[styles.shiftCellText, { color: colors.text }]}>
                        {SHIFT_ABBR[a.shiftType]}
                      </Text>
                      {(a.startTime || SHIFT_TIMES[a.shiftType]) ? (
                        <Text style={[styles.shiftCellTime, { color: colors.text }]}>
                          {a.startTime ? a.startTime.slice(0,5) : SHIFT_TIMES[a.shiftType]}
                        </Text>
                      ) : null}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* ── Location overview (only shown when "Alle" is selected) ── */}
        {selectedLocId === null && <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Standortübersicht</Text>
            <Text style={styles.sectionSub}>Wer arbeitet wo diese Woche</Text>
          </View>

          {LOCATIONS.map(loc => {
          // Only show a location card if at least one azubi is assigned there this week
          const assignedHere = azubis.filter(az =>
            weekDates.some(d => plan[az.id]?.[toISO(d)]?.locationId === loc.id)
          );
          if (assignedHere.length === 0) return null;

          return (
            <View key={loc.id} style={styles.locationCard}>
              {/* Card header */}
              <View style={styles.locationCardHeader}>
                <Text style={styles.locationPin}>📍</Text>
                <View>
                  <Text style={styles.locationFacility}>{loc.facility}</Text>
                  <Text style={styles.locationUnit}>{loc.unit}</Text>
                </View>
              </View>

              {/* Mini day header */}
              <View style={styles.miniHeaderRow}>
                <View style={styles.miniNameCol} />
                {weekDates.map((d, i) => (
                  <View key={i} style={styles.miniDayCol}>
                    <Text style={styles.miniDayText}>{DAY_SHORTS[i]}</Text>
                    <Text style={styles.miniDayNum}>{d.getDate()}</Text>
                  </View>
                ))}
              </View>

              {/* One row per azubi assigned to this location */}
              {(assignedHere as User[]).map(az => (
                <View key={az.id} style={styles.miniAzubiRow}>
                  <View style={styles.miniNameCol}>
                    <Text style={styles.miniAzubiName}>{az.name.split(' ')[0].slice(0, 4)}</Text>
                  </View>
                  {weekDates.map(d => {
                    const iso = toISO(d);
                    const a = plan[az.id]?.[iso];
                    const isHere = a?.locationId === loc.id;
                    const colors = isHere ? SHIFT_COLORS[a!.shiftType] : null;
                    return (
                      <View
                        key={iso}
                        style={[
                          styles.miniDayCol,
                          styles.miniCell,
                          isHere && colors ? { backgroundColor: colors.background } : styles.miniCellEmpty,
                        ]}
                      >
                        {isHere && colors && (
                          <>
                            <Text style={[styles.miniCellAbbr, { color: colors.text }]}>
                              {SHIFT_ABBR[a!.shiftType]}
                            </Text>
                            <Text style={[styles.miniCellTime, { color: colors.text }]}>
                              {SHIFT_TIMES[a!.shiftType]}
                            </Text>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}
        </>}

        {/* Publish */}
        <TouchableOpacity style={styles.publishBtn} onPress={publish} activeOpacity={0.8}>
          <Text style={styles.publishBtnText}>Dienstplan veröffentlichen</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit modal (2-step) ── */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheet}
            keyboardShouldPersistTaps="handled"
            // Stop tap-through to overlay
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />

            {step === 1 && (
              /* ── Step 1: pick shift type ── */
              <>
                <Text style={styles.sheetTitle}>
                  {editingAzubi?.name.split(' ')[0]}
                  {'  ·  '}
                  {editing?.iso
                    ? new Date(editing.iso + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
                    : ''}
                </Text>
                <Text style={styles.stepLabel}>Schritt 1 — Diensttyp wählen</Text>
                {SHIFT_OPTIONS.map(st => {
                  const c = SHIFT_COLORS[st];
                  const isCurrent = currentAssignment?.shiftType === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.optionRow, { backgroundColor: c.background }, isCurrent && styles.optionRowSelected]}
                      onPress={() => selectShiftType(st)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.optionLabel, { color: c.text }]}>{SHIFT_LABELS[st]}</Text>
                      <View style={styles.optionRight}>
                        {SHIFT_TIMES[st] ? <Text style={[styles.optionTime, { color: c.text }]}>{SHIFT_TIMES[st]} Uhr</Text> : null}
                        {isCurrent && <Text style={[styles.optionCheck, { color: c.text }]}>  ✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {step === 2 && (
              /* ── Step 2: pick times ── */
              <>
                <TouchableOpacity style={styles.backBtn} onPress={() => setEditing(e => e ? { ...e, step: 1, pendingShift: null, pendingStart: '', pendingEnd: '' } : null)} activeOpacity={0.7}>
                  <Text style={styles.backBtnText}>‹ Zurück</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>
                  {editingAzubi?.name.split(' ')[0]}{'  ·  '}{SHIFT_LABELS[editing!.pendingShift!]}
                </Text>
                <Text style={styles.stepLabel}>Schritt 2 — Uhrzeit anpassen</Text>

                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Beginn</Text>
                  <View style={styles.timePicker}>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime('start', -1)} activeOpacity={0.7}>
                      <Text style={styles.timeBtnText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{editing!.pendingStart}</Text>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime('start', 1)} activeOpacity={0.7}>
                      <Text style={styles.timeBtnText}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Ende</Text>
                  <View style={styles.timePicker}>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime('end', -1)} activeOpacity={0.7}>
                      <Text style={styles.timeBtnText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{editing!.pendingEnd}</Text>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime('end', 1)} activeOpacity={0.7}>
                      <Text style={styles.timeBtnText}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.timeHint}>‹ › wechselt in 30-Minuten-Schritten</Text>

                <TouchableOpacity style={styles.confirmTimeBtn} onPress={confirmTime} activeOpacity={0.8}>
                  <Text style={styles.confirmTimeBtnText}>Weiter → Standort wählen</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              /* ── Step 3: pick location ── */
              <>
                <TouchableOpacity style={styles.backBtn} onPress={() => setEditing(e => e ? { ...e, step: 2 } : null)} activeOpacity={0.7}>
                  <Text style={styles.backBtnText}>‹ Zurück</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>
                  {editingAzubi?.name.split(' ')[0]}{'  ·  '}{SHIFT_LABELS[editing!.pendingShift!]}
                  {'  '}{editing!.pendingStart?.trim()} – {editing!.pendingEnd?.trim()} Uhr
                </Text>
                <Text style={styles.stepLabel}>Schritt 3 — Standort wählen</Text>
                {locationsFor(editing!.pendingShift!).map(loc => {
                  const isCurrent = currentAssignment?.locationId === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locationOption, isCurrent && styles.locationOptionSelected]}
                      onPress={() => selectLocation(loc.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.locationOptionIcon}>
                        <Text style={styles.locationOptionPin}>📍</Text>
                      </View>
                      <View style={styles.locationOptionInfo}>
                        <Text style={styles.locationOptionFacility}>{loc.facility}</Text>
                        <Text style={styles.locationOptionUnit}>{loc.unit}</Text>
                      </View>
                      {isCurrent && <Text style={styles.locationOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </Modal>

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ Dienstplan veröffentlicht</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 16 },

  // Location switcher
  locSwitcherScroll: { marginBottom: 14 },
  locSwitcherContent: { paddingRight: 8, columnGap: 8, flexDirection: 'row', alignItems: 'center' },
  locChip: {
    flexDirection: 'row', alignItems: 'center', columnGap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  locChipActive: { backgroundColor: ADMIN_PURPLE, borderColor: ADMIN_PURPLE },
  locChipIcon: { fontSize: 14 },
  locChipText: { fontSize: 12, fontWeight: '700', color: BRAND.textSecondary },
  locChipTextActive: { color: '#fff' },
  activeLoc: {
    backgroundColor: '#EEEDFE', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12,
  },
  activeLocText: { fontSize: 13, fontWeight: '600', color: ADMIN_PURPLE },

  // Dimmed cell (not at selected location)
  shiftCellDimmed: { backgroundColor: '#F3F4F6' },
  shiftCellDimText: { fontSize: 12, color: BRAND.border, fontWeight: '600' },

  // Week nav
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: ADMIN_PURPLE, fontWeight: '600' },
  weekLabelBox: { backgroundColor: ADMIN_PURPLE, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  weekLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Main grid
  headerRow: { flexDirection: 'row', marginBottom: 4 },
  azubiRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  nameCol: { width: 58 },
  dayCol: { flex: 1, alignItems: 'center' },
  dayShort: { fontSize: 11, fontWeight: '700', color: BRAND.textSecondary },
  dayNum: { fontSize: 12, color: BRAND.textPrimary, fontWeight: '600' },
  azubiName: { fontSize: 11, fontWeight: '700', color: BRAND.textPrimary },
  shiftCell: { borderRadius: 6, paddingVertical: 6, marginHorizontal: 1, alignItems: 'center' },
  shiftCellText: { fontSize: 12, fontWeight: '800' },
  shiftCellTime: { fontSize: 8, fontWeight: '600', opacity: 0.8, marginTop: 1 },

  // Location overview section
  sectionHeader: { marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary },
  sectionSub: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  locationCard: {
    backgroundColor: BRAND.surface, borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, columnGap: 8 },
  locationPin: { fontSize: 16 },
  locationFacility: { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary },
  locationUnit: { fontSize: 11, color: BRAND.textSecondary, marginTop: 1 },

  // Mini grid inside location card
  miniHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  miniNameCol: { width: 40 },
  miniDayCol: { flex: 1, alignItems: 'center' },
  miniDayText: { fontSize: 9, fontWeight: '700', color: BRAND.textSecondary },
  miniDayNum: { fontSize: 10, color: BRAND.textSecondary },
  miniAzubiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  miniAzubiName: { fontSize: 10, fontWeight: '700', color: BRAND.textPrimary },
  miniCell: { borderRadius: 4, paddingVertical: 4, marginHorizontal: 1, alignItems: 'center' },
  miniCellEmpty: { backgroundColor: '#F3F4F6' },
  miniCellAbbr: { fontSize: 9, fontWeight: '800' },
  miniCellTime: { fontSize: 7, fontWeight: '600', opacity: 0.8 },

  // Publish
  publishBtn: { backgroundColor: BRAND.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  publishBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetScroll: { maxHeight: '85%' },
  sheet: { backgroundColor: BRAND.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48 },
  sheetHandle: { width: 40, height: 4, backgroundColor: BRAND.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Shift type options (step 1)
  optionRow: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionRowSelected: { borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  optionLabel: { fontSize: 15, fontWeight: '700' },
  optionRight: { flexDirection: 'row', alignItems: 'center' },
  optionTime: { fontSize: 13, fontWeight: '600', opacity: 0.75 },
  optionCheck: { fontSize: 14, fontWeight: '700' },

  // Back button
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: ADMIN_PURPLE },

  // Time picker (step 2)
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  timeLabel: { fontSize: 15, fontWeight: '600', color: BRAND.textPrimary, width: 60 },
  timePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.background, borderRadius: 12, borderWidth: 1.5, borderColor: BRAND.border, overflow: 'hidden' },
  timeBtn: { paddingHorizontal: 18, paddingVertical: 12 },
  timeBtnText: { fontSize: 22, color: ADMIN_PURPLE, fontWeight: '700' },
  timeValue: { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, minWidth: 72, textAlign: 'center' },
  timeHint: { fontSize: 11, color: BRAND.textSecondary, textAlign: 'center', marginBottom: 20 },
  confirmTimeBtn: { backgroundColor: ADMIN_PURPLE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  confirmTimeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Location options (step 2)
  locationOption: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5,
    borderColor: BRAND.border, padding: 14, marginBottom: 10,
  },
  locationOptionSelected: { borderColor: ADMIN_PURPLE, backgroundColor: '#EEEDFE' },
  locationOptionIcon: { marginRight: 12 },
  locationOptionPin: { fontSize: 18 },
  locationOptionInfo: { flex: 1 },
  locationOptionFacility: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  locationOptionUnit: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  locationOptionCheck: { fontSize: 16, color: ADMIN_PURPLE, fontWeight: '700' },

  // Toast
  toast: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: '#065F46', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
