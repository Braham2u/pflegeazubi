import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { BRAND } from '../constants/colors';
import {
  getAzubiByPin, getEntriesForDay, clockAction,
  nextAction, buildDailyRecord,
} from '../services/timeEntries';
import { TimeEntry, ClockAction } from '../types';

interface Props {
  facilityId: string;
  facilityName: string;
}

const AUTO_CLOSE_SECS = 15;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function useTicker() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

type Screen = 'pin' | 'action' | 'confirm';

export default function KioskScreen({ facilityId, facilityName }: Props) {
  const now = useTicker();
  const [pin, setPin]       = useState('');
  const [screen, setScreen] = useState<Screen>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [azubi, setAzubi]   = useState<{ id: string; name: string } | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [lastAction, setLastAction] = useState<ClockAction | null>(null);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECS);
  const countRef = useRef(AUTO_CLOSE_SECS);

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  // Auto-reset countdown on confirm screen
  useEffect(() => {
    if (screen !== 'confirm') return;
    countRef.current = AUTO_CLOSE_SECS;
    setCountdown(AUTO_CLOSE_SECS);
    const t = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) reset();
    }, 1000);
    return () => clearInterval(t);
  }, [screen]);

  function reset() {
    setScreen('pin');
    setPin('');
    setAzubi(null);
    setEntries([]);
    setLastAction(null);
    setError('');
  }

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    setError('');
    setPin(p => p + d);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const found = await getAzubiByPin(facilityId, pin);
      if (!found) {
        setError('PIN ungültig. Bitte erneut versuchen.');
        setPin('');
        return;
      }
      const today = await getEntriesForDay(found.id);
      setAzubi(found);
      setEntries(today);
      setScreen('action');
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [pin, facilityId]);

  useEffect(() => {
    if (pin.length === 6) handlePinSubmit();
  }, [pin, handlePinSubmit]);

  const handleClock = async (action: ClockAction) => {
    if (!azubi) return;
    setLoading(true);
    try {
      await clockAction(azubi.id, azubi.name, facilityId, action);
      const updated = await getEntriesForDay(azubi.id);
      setEntries(updated);
      setLastAction(action);
      setScreen('confirm');
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  // ── PIN Screen ──────────────────────────────────────────────────────────────
  if (screen === 'pin') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <View style={styles.pinHeader}>
          <Text style={styles.pinFacility}>{facilityName}</Text>
          <Text style={styles.pinClock}>{timeStr}</Text>
          <Text style={styles.pinDate}>{dateStr}</Text>
        </View>

        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>PIN eingeben</Text>
          <View style={styles.dots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </View>
          {error ? <Text style={styles.pinError}>{error}</Text> : null}

          <View style={styles.pad}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <TouchableOpacity key={d} style={styles.key} onPress={() => handleDigit(d)} activeOpacity={0.6}>
                <Text style={styles.keyText}>{d}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.keyEmpty} />
            <TouchableOpacity style={styles.key} onPress={() => handleDigit('0')} activeOpacity={0.6}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyDel} onPress={handleDelete} activeOpacity={0.6}>
              <Text style={styles.keyDelText}>⌫</Text>
            </TouchableOpacity>
          </View>

          {pin.length >= 4 && (
            <TouchableOpacity style={styles.confirmPinBtn} onPress={handlePinSubmit} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmPinBtnText}>Bestätigen</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.kioskBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.kioskBadgeText}>Stempeluhr · Online</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Action Screen ───────────────────────────────────────────────────────────
  if (screen === 'action' && azubi) {
    const next = nextAction(entries);
    const rec  = buildDailyRecord(entries);
    const done = !next;

    const BUTTONS: { action: ClockAction; label: string; icon: string; color: string; bg: string; darkBg: string }[] = [
      { action: 'start',      label: 'Schicht beginnen', icon: '→',  color: '#fff', bg: '#2563EB', darkBg: '#1D4ED8' },
      { action: 'end',        label: 'Schicht beenden',  icon: '⌂',  color: '#fff', bg: '#D97706', darkBg: '#B45309' },
      { action: 'breakStart', label: 'Pause beginnen',   icon: '☕', color: '#fff', bg: '#374151', darkBg: '#1F2937' },
      { action: 'breakEnd',   label: 'Pause beenden',    icon: '→',  color: '#fff', bg: '#374151', darkBg: '#1F2937' },
    ];

    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

        <View style={styles.actionHeader}>
          <Text style={styles.actionClock}>{timeStr}</Text>
          <View style={styles.actionUserRow}>
            <View style={styles.actionAvatar}>
              <Text style={styles.actionAvatarText}>
                {azubi.name.split(/\s|,/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.actionUserName}>{azubi.name}</Text>
          </View>
        </View>

        {/* Today's time log */}
        {rec && (rec.startAt || rec.breakStartAt || rec.endAt) && (
          <View style={styles.logTable}>
            <View style={styles.logRow}>
              <Text style={styles.logHeader}>Start</Text>
              <Text style={styles.logHeader}>Ende</Text>
            </View>
            {rec.startAt && (
              <View style={styles.logRow}>
                <Text style={styles.logCell}>{fmtTime(rec.startAt)}</Text>
                <Text style={styles.logCell}>{rec.endAt ? fmtTime(rec.endAt) : '–'}</Text>
              </View>
            )}
            {rec.breakStartAt && (
              <View style={styles.logRow}>
                <Text style={[styles.logCell, { color: '#D97706' }]}>{fmtTime(rec.breakStartAt)} (Pause)</Text>
                <Text style={[styles.logCell, { color: '#D97706' }]}>{rec.breakEndAt ? fmtTime(rec.breakEndAt) : '–'}</Text>
              </View>
            )}
          </View>
        )}

        {done ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>Schicht vollständig erfasst</Text>
          </View>
        ) : (
          <View style={styles.buttonGrid}>
            {BUTTONS.map(({ action, label, icon, color, bg, darkBg }) => {
              const isDone = entries.some(e => e.action === action);
              const isNext = action === next;
              return (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.gridBtn,
                    { backgroundColor: isDone ? '#9CA3AF' : bg },
                    isNext && styles.gridBtnNext,
                  ]}
                  onPress={() => !isDone && handleClock(action)}
                  disabled={loading || isDone}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.gridBtnIcon, { color }]}>{icon}</Text>
                  <Text style={[styles.gridBtnLabel, { color }]}>{label}</Text>
                  {isDone && <Text style={styles.gridBtnDone}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {error ? <Text style={styles.actionError}>{error}</Text> : null}

        <TouchableOpacity style={styles.actionCancelBtn} onPress={reset} activeOpacity={0.7}>
          <Text style={styles.actionCancelText}>Abbrechen</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Confirm Screen ──────────────────────────────────────────────────────────
  if (screen === 'confirm' && lastAction) {
    const rec = buildDailyRecord(entries);
    const ACTION_LABELS: Record<ClockAction, string> = {
      start:      'Schicht begonnen',
      end:        'Schicht beendet',
      breakStart: 'Pause begonnen',
      breakEnd:   'Pause beendet',
    };

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#1F2937' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <View style={styles.confirmHeader}>
          <Text style={styles.confirmAction}>
            {ACTION_LABELS[lastAction]}  {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>

        <View style={styles.confirmCard}>
          <View style={styles.confirmSuccess}>
            <Text style={styles.confirmSuccessText}>Zeit erfasst für {azubi?.name}</Text>
            <Text style={styles.confirmCountdown}>Schließt automatisch in {countdown} Sekunden</Text>
          </View>

          <View style={styles.logTable}>
            <View style={styles.logRow}>
              <Text style={styles.logHeader}>Start</Text>
              <Text style={styles.logHeader}>Ende</Text>
            </View>
            {rec?.startAt && (
              <View style={styles.logRow}>
                <Text style={styles.logCell}>{fmtTime(rec.startAt)}</Text>
                <Text style={styles.logCell}>{rec.endAt ? fmtTime(rec.endAt) : '–'}</Text>
              </View>
            )}
            {rec?.breakStartAt && (
              <View style={styles.logRow}>
                <Text style={[styles.logCell, { color: '#D97706' }]}>{fmtTime(rec.breakStartAt)} (Pause)</Text>
                <Text style={[styles.logCell, { color: '#D97706' }]}>{rec.breakEndAt ? fmtTime(rec.breakEndAt) : '–'}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>Schließen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kioskBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.kioskBadgeText}>Stempeluhr · Online</Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1F2937' },

  // PIN screen
  pinHeader: { alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  pinFacility: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' },
  pinClock: { fontSize: 56, fontWeight: '700', color: '#fff', lineHeight: 64, marginTop: 8 },
  pinDate: { fontSize: 15, color: '#9CA3AF', marginTop: 4 },
  pinCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 24, alignItems: 'center' },
  pinTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },
  dots: { flexDirection: 'row', columnGap: 14, marginBottom: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BRAND.border },
  dotFilled: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pinError: { fontSize: 13, color: '#DC2626', fontWeight: '600', marginTop: 8, marginBottom: 4 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, rowGap: 12, columnGap: 12, justifyContent: 'center', width: '100%' },
  key: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  keyText: { fontSize: 26, fontWeight: '600', color: BRAND.textPrimary },
  keyEmpty: { width: 78, height: 78 },
  keyDel: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  keyDelText: { fontSize: 22, color: BRAND.textSecondary },
  confirmPinBtn: { marginTop: 20, width: '100%', backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmPinBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Action screen
  actionHeader: { backgroundColor: '#111827', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  actionClock: { fontSize: 42, fontWeight: '700', color: '#fff' },
  actionUserRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, columnGap: 12 },
  actionAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  actionAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  actionUserName: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // 2x2 button grid
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, rowGap: 12, columnGap: 12 },
  gridBtn: { width: '47%', borderRadius: 16, paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 110 },
  gridBtnNext: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  gridBtnIcon: { fontSize: 24, marginBottom: 8 },
  gridBtnLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  gridBtnDone: { fontSize: 18, color: '#fff', marginTop: 6 },

  doneBox: { margin: 20, backgroundColor: '#065F46', borderRadius: 14, padding: 24, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Time log table
  logTable: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  logRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logHeader: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280', padding: 10, backgroundColor: '#F9FAFB' },
  logCell: { flex: 1, fontSize: 14, fontWeight: '600', color: BRAND.textPrimary, padding: 10 },

  actionError: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8, marginHorizontal: 20 },
  actionCancelBtn: { marginTop: 'auto' as any, paddingVertical: 20, alignItems: 'center' },
  actionCancelText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  // Confirm screen
  confirmHeader: { backgroundColor: '#374151', paddingVertical: 20, paddingHorizontal: 20 },
  confirmAction: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  confirmCard: { backgroundColor: '#fff', margin: 20, borderRadius: 16, overflow: 'hidden' },
  confirmSuccess: { backgroundColor: '#D1FAE5', padding: 16, alignItems: 'center' },
  confirmSuccessText: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  confirmCountdown: { fontSize: 12, color: '#065F46', marginTop: 4 },
  closeBtn: { margin: 16, backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Badge
  kioskBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, columnGap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  kioskBadgeText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});
