import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../../constants/colors';
import { getTodayAttendance, checkBreakCompliance } from '../../services/timeEntries';
import { getPendingCorrections, respondToCorrection } from '../../services/corrections';
import { useAuth } from '../../context/AuthContext';
import { DailyTimeRecord, CorrectionRequest } from '../../types';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function minToHStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Status of a person right now
function currentStatus(rec: DailyTimeRecord): { label: string; color: string; bg: string } {
  const actions = new Set(rec.entries.map(e => e.action));
  if (actions.has('end'))        return { label: 'Schicht beendet', color: '#6B7280', bg: '#F3F4F6' };
  if (actions.has('breakStart') && !actions.has('breakEnd'))
                                 return { label: 'In Pause', color: '#92400E', bg: '#FEF3C7' };
  if (actions.has('start'))      return { label: 'Im Dienst', color: '#065F46', bg: '#D1FAE5' };
  return                                { label: 'Unbekannt',   color: '#6B7280', bg: '#F3F4F6' };
}

export default function AttendanceScreen() {
  const { userProfile } = useAuth();
  const [records,     setRecords]     = useState<DailyTimeRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tab, setTab] = useState<'live' | 'corrections'>('live');

  const facilityId = userProfile?.primaryFacilityId ?? '';

  const load = useCallback(async (refresh = false) => {
    if (!facilityId) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [r, c] = await Promise.all([
        getTodayAttendance(facilityId),
        getPendingCorrections(facilityId),
      ]);
      setRecords(r);
      setCorrections(c);
    } catch {
      setRecords([]); setCorrections([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [facilityId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCorrection = async (id: string, status: 'approved' | 'rejected') => {
    if (!userProfile) return;
    try {
      await respondToCorrection(id, status, userProfile.name);
      load();
    } catch { /* ignore */ }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Counts
  const active    = records.filter(r => currentStatus(r).label === 'Im Dienst').length;
  const onBreak   = records.filter(r => currentStatus(r).label === 'In Pause').length;
  const done      = records.filter(r => currentStatus(r).label === 'Schicht beendet').length;
  const pendingC  = corrections.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Anwesenheit</Text>
        <Text style={styles.dateStr}>{dateStr}</Text>
      </View>

      {/* Summary chips */}
      <View style={styles.chips}>
        <Chip label="Im Dienst"       count={active}  color="#065F46" bg="#D1FAE5" />
        <Chip label="In Pause"        count={onBreak} color="#92400E" bg="#FEF3C7" />
        <Chip label="Beendet"         count={done}    color="#6B7280" bg="#F3F4F6" />
        <Chip label="Korrekturen"     count={pendingC} color={ADMIN_PURPLE} bg={ADMIN_PURPLE_LIGHT} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'live' && styles.tabActive]} onPress={() => setTab('live')}>
          <Text style={[styles.tabText, tab === 'live' && styles.tabTextActive]}>Live-Übersicht</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'corrections' && styles.tabActive]} onPress={() => setTab('corrections')}>
          <Text style={[styles.tabText, tab === 'corrections' && styles.tabTextActive]}>
            Korrekturen {pendingC > 0 ? `(${pendingC})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BRAND.primary} />}
        >
          {/* ── Live tab ── */}
          {tab === 'live' && (
            records.length === 0 ? (
              <Text style={styles.empty}>Noch niemand hat heute gestempelt.</Text>
            ) : (
              records.map(rec => {
                const status = currentStatus(rec);
                const warn   = checkBreakCompliance(rec);
                return (
                  <View key={rec.azubiId} style={styles.card}>
                    {/* Top row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {rec.azubiName.split(/\s|,/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.azubiName}>{rec.azubiName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                      {rec.netMinutes !== undefined && (
                        <Text style={styles.hoursLabel}>{minToHStr(rec.netMinutes)}</Text>
                      )}
                    </View>

                    {/* Timeline */}
                    <View style={styles.timeline}>
                      {rec.startAt      && <TL icon="▶" label="Beginn"    val={fmtTime(rec.startAt)} />}
                      {rec.breakStartAt && <TL icon="☕" label="Pause"     val={fmtTime(rec.breakStartAt)} />}
                      {rec.breakEndAt   && <TL icon="▶" label="Weiter"    val={fmtTime(rec.breakEndAt)} />}
                      {rec.endAt        && <TL icon="■" label="Ende"      val={fmtTime(rec.endAt)} />}
                    </View>

                    {/* Overtime */}
                    {rec.overtimeMinutes !== undefined && rec.overtimeMinutes > 0 && (
                      <View style={styles.overtimeRow}>
                        <Text style={styles.overtimeText}>+{minToHStr(rec.overtimeMinutes)} Mehrarbeit</Text>
                      </View>
                    )}

                    {/* Break warning */}
                    {warn && (
                      <View style={styles.warnRow}>
                        <Text style={styles.warnText}>⚠ {warn}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )
          )}

          {/* ── Corrections tab ── */}
          {tab === 'corrections' && (
            corrections.length === 0 ? (
              <Text style={styles.empty}>Keine offenen Korrekturanfragen.</Text>
            ) : (
              corrections.map(c => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.corrAzubi}>{c.azubiName}</Text>
                  <Text style={styles.corrDate}>{c.date} · {c.missingAction === 'start' ? 'Beginn fehlt' : c.missingAction === 'end' ? 'Ende fehlt' : c.missingAction === 'breakStart' ? 'Pausen-Beginn fehlt' : 'Pausen-Ende fehlt'}</Text>
                  <Text style={styles.corrProposed}>Vorgeschlagene Uhrzeit: <Text style={{ fontWeight: '700' }}>{c.proposedTime}</Text></Text>
                  {c.note ? <Text style={styles.corrNote}>Anmerkung: {c.note}</Text> : null}
                  <View style={styles.corrBtns}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleCorrection(c.id, 'approved')}>
                      <Text style={styles.approveBtnText}>Genehmigen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleCorrection(c.id, 'rejected')}>
                      <Text style={styles.rejectBtnText}>Ablehnen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function Chip({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <View style={[chipSt.root, { backgroundColor: bg }]}>
      <Text style={[chipSt.count, { color }]}>{count}</Text>
      <Text style={[chipSt.label, { color }]}>{label}</Text>
    </View>
  );
}

function TL({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <View style={tlSt.row}>
      <Text style={tlSt.icon}>{icon}</Text>
      <Text style={tlSt.label}>{label}</Text>
      <Text style={tlSt.val}>{val}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BRAND.background },
  header:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:   { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary },
  dateStr: { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },

  chips:   { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, columnGap: 8 },

  tabs:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3 },
  tab:     { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive:{ backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  tabTextActive: { color: BRAND.textPrimary },

  scroll:  { padding: 16, paddingBottom: 40 },
  empty:   { textAlign: 'center', color: BRAND.textSecondary, marginTop: 40, fontSize: 14 },

  card:    { backgroundColor: BRAND.surface, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', columnGap: 12, marginBottom: 10 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: ADMIN_PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: ADMIN_PURPLE },
  azubiName:  { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 },
  statusBadge:{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  hoursLabel: { fontSize: 16, fontWeight: '800', color: BRAND.primary },

  timeline:  { rowGap: 3 },
  overtimeRow: { marginTop: 8, backgroundColor: '#DCFCE7', borderRadius: 8, padding: 8 },
  overtimeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  warnRow:   { marginTop: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8 },
  warnText:  { fontSize: 12, fontWeight: '600', color: '#92400E' },

  corrAzubi:    { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary },
  corrDate:     { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  corrProposed: { fontSize: 13, color: BRAND.textPrimary, marginTop: 6 },
  corrNote:     { fontSize: 12, color: BRAND.textSecondary, marginTop: 4 },
  corrBtns:     { flexDirection: 'row', columnGap: 10, marginTop: 12 },
  approveBtn:   { flex: 1, backgroundColor: '#D1FAE5', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  rejectBtn:    { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#7F1D1D' },
});

const chipSt = StyleSheet.create({
  root:  { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  count: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
});

const tlSt = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingVertical: 2 },
  icon:  { fontSize: 11, width: 16, textAlign: 'center', color: BRAND.textSecondary },
  label: { fontSize: 12, color: BRAND.textSecondary, flex: 1 },
  val:   { fontSize: 12, fontWeight: '700', color: BRAND.textPrimary },
});
