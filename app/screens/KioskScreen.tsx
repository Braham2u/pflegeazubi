import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '../constants/colors';
import {
  getAzubiByPin, getEntriesForDay, clockAction, buildDailyRecord,
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

type Screen = 'pin' | 'action' | 'preview' | 'success';

const ACTION_CONFIG: Record<ClockAction, { label: string; sublabel: string; icon: string; color: string; bg: string }> = {
  start:      { label: 'Einstempeln',    sublabel: 'Schicht beginnen',   icon: '▶',  color: '#fff', bg: '#16A34A' },
  end:        { label: 'Ausstempeln',    sublabel: 'Schicht beenden',    icon: '⏹',  color: '#fff', bg: '#DC2626' },
  breakStart: { label: 'Pause starten',  sublabel: 'Arbeitsunterbrechung', icon: '⏸', color: '#fff', bg: '#D97706' },
  breakEnd:   { label: 'Pause beenden', sublabel: 'Weiterarbeiten',      icon: '▶',  color: '#fff', bg: '#2563EB' },
};

function currentStatusLabel(entries: TimeEntry[]): { text: string; color: string } {
  const actions = new Set(entries.map(e => e.action));
  if (actions.has('end'))        return { text: 'Schicht beendet',        color: '#6B7280' };
  if (actions.has('breakStart') && !actions.has('breakEnd'))
                                  return { text: 'In Pause',               color: '#D97706' };
  if (actions.has('start'))      return { text: 'Im Dienst',               color: '#16A34A' };
  return                                { text: 'Noch nicht eingestempelt', color: '#9CA3AF' };
}

export default function KioskScreen({ facilityId, facilityName }: Props) {
  const now = useTicker();
  const [pin, setPin]             = useState('');
  const [screen, setScreen]       = useState<Screen>('pin');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [azubi, setAzubi]         = useState<{ id: string; name: string } | null>(null);
  const [entries, setEntries]     = useState<TimeEntry[]>([]);
  const [pending, setPending]     = useState<ClockAction | null>(null);
  const [lastAction, setLastAction] = useState<ClockAction | null>(null);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECS);
  const countRef                  = useRef(AUTO_CLOSE_SECS);

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    if (screen !== 'success') return;
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
    setScreen('pin'); setPin(''); setAzubi(null);
    setEntries([]); setPending(null); setLastAction(null); setError('');
  }

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    setError('');
    setPin(p => p + d);
  };
  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setLoading(true); setError('');
    try {
      const found = await getAzubiByPin(facilityId, pin);
      if (!found) { setError('PIN ungültig. Bitte erneut versuchen.'); setPin(''); return; }
      const today = await getEntriesForDay(found.id);
      setAzubi(found); setEntries(today); setScreen('action');
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.'); setPin('');
    } finally {
      setLoading(false);
    }
  }, [pin, facilityId]);

  useEffect(() => {
    if (pin.length === 6) handlePinSubmit();
  }, [pin, handlePinSubmit]);

  function selectAction(action: ClockAction) {
    setPending(action);
    setScreen('preview');
  }

  async function confirmAction() {
    if (!azubi || !pending) return;
    setLoading(true);
    try {
      await clockAction(azubi.id, azubi.name, facilityId, pending);
      const updated = await getEntriesForDay(azubi.id);
      setEntries(updated);
      setLastAction(pending);
      setScreen('success');
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.');
      setScreen('action');
    } finally {
      setLoading(false);
    }
  }

  if (screen === 'pin') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
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

  if (screen === 'action' && azubi) {
    const status = currentStatusLabel(entries);
    const rec    = buildDailyRecord(entries);

    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <ScrollView contentContainerStyle={styles.actionScroll}>

          <View style={styles.actionHeader}>
            <Text style={styles.actionClock}>{timeStr}</Text>
            <View style={styles.actionUserRow}>
              <View style={styles.actionAvatar}>
                <Text style={styles.actionAvatarText}>
                  {azubi.name.split(/\s|,/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.actionUserName}>{azubi.name}</Text>
                <Text style={[styles.actionStatus, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>
          </View>

          {rec && (rec.startAt || rec.breakStartAt || rec.endAt) && (
            <View style={styles.logTable}>
              <View style={styles.logRow}>
                <Text style={styles.logHeader}>Ereignis</Text>
                <Text style={styles.logHeader}>Uhrzeit</Text>
              </View>
              {rec.startAt && (
                <View style={styles.logRow}>
                  <Text style={styles.logCell}>Eingestempelt</Text>
                  <Text style={styles.logCell}>{fmtTime(rec.startAt)}</Text>
                </View>
              )}
              {rec.breakStartAt && (
                <View style={styles.logRow}>
                  <Text style={[styles.logCell, { color: '#D97706' }]}>Pause begonnen</Text>
                  <Text style={[styles.logCell, { color: '#D97706' }]}>{fmtTime(rec.breakStartAt)}</Text>
                </View>
              )}
              {rec.breakEndAt && (
                <View style={styles.logRow}>
                  <Text style={styles.logCell}>Pause beendet</Text>
                  <Text style={styles.logCell}>{fmtTime(rec.breakEndAt)}</Text>
                </View>
              )}
              {rec.endAt && (
                <View style={styles.logRow}>
                  <Text style={[styles.logCell, { color: '#DC2626' }]}>Ausgestempelt</Text>
                  <Text style={[styles.logCell, { color: '#DC2626' }]}>{fmtTime(rec.endAt)}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.actionPrompt}>Was möchtest du tun?</Text>
          <View style={styles.actionGrid}>
            {(Object.keys(ACTION_CONFIG) as ClockAction[]).map(action => {
              const cfg = ACTION_CONFIG[action];
              return (
                <TouchableOpacity
                  key={action}
                  style={[styles.actionBtn, { backgroundColor: cfg.bg }]}
                  onPress={() => selectAction(action)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnIcon}>{cfg.icon}</Text>
                  <Text style={styles.actionBtnLabel}>{cfg.label}</Text>
                  <Text style={styles.actionBtnSub}>{cfg.sublabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? <Text style={styles.actionError}>{error}</Text> : null}

          <TouchableOpacity style={styles.cancelBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (screen === 'preview' && pending && azubi) {
    const cfg = ACTION_CONFIG[pending];
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: cfg.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={cfg.bg} />
        <View style={styles.previewWrap}>
          <Text style={styles.previewIcon}>{cfg.icon}</Text>
          <Text style={styles.previewLabel}>{cfg.label}</Text>
          <Text style={styles.previewName}>{azubi.name}</Text>
          <Text style={styles.previewTime}>{timeStr}</Text>

          <TouchableOpacity
            style={styles.previewConfirmBtn}
            onPress={confirmAction}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={cfg.bg} />
              : <Text style={[styles.previewConfirmText, { color: cfg.bg }]}>Ja, bestätigen</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewBackBtn} onPress={() => setScreen('action')} activeOpacity={0.7}>
            <Text style={styles.previewBackText}>← Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'success' && lastAction) {
    const cfg = ACTION_CONFIG[lastAction];
    const rec = buildDailyRecord(entries);

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#111827' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.successWrap}>
          <View style={[styles.successIconBox, { backgroundColor: cfg.bg }]}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successLabel}>{cfg.label}</Text>
          <Text style={styles.successName}>{azubi?.name}</Text>
          <Text style={styles.successTime}>
            {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {rec && (rec.startAt || rec.endAt) && (
            <View style={styles.logTable}>
              <View style={styles.logRow}>
                <Text style={styles.logHeader}>Ereignis</Text>
                <Text style={styles.logHeader}>Uhrzeit</Text>
              </View>
              {rec.startAt && (
                <View style={styles.logRow}>
                  <Text style={styles.logCell}>Eingestempelt</Text>
                  <Text style={styles.logCell}>{fmtTime(rec.startAt)}</Text>
                </View>
              )}
              {rec.breakStartAt && (
                <View style={styles.logRow}>
                  <Text style={[styles.logCell, { color: '#D97706' }]}>Pause begonnen</Text>
                  <Text style={[styles.logCell, { color: '#D97706' }]}>{fmtTime(rec.breakStartAt)}</Text>
                </View>
              )}
              {rec.breakEndAt && (
                <View style={styles.logRow}>
                  <Text style={styles.logCell}>Pause beendet</Text>
                  <Text style={styles.logCell}>{fmtTime(rec.breakEndAt)}</Text>
                </View>
              )}
              {rec.endAt && (
                <View style={styles.logRow}>
                  <Text style={[styles.logCell, { color: '#DC2626' }]}>Ausgestempelt</Text>
                  <Text style={[styles.logCell, { color: '#DC2626' }]}>{fmtTime(rec.endAt)}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.countdown}>Schließt automatisch in {countdown} Sekunden</Text>
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
  root: { flex: 1, backgroundColor: '#111827' },

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

  actionScroll: { paddingBottom: 40 },
  actionHeader: { backgroundColor: '#1F2937', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  actionClock: { fontSize: 42, fontWeight: '700', color: '#fff' },
  actionUserRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, columnGap: 12 },
  actionAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  actionAvatarText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  actionUserName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  actionStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  actionPrompt: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', textAlign: 'center', marginTop: 20, marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, rowGap: 12, columnGap: 12 },
  actionBtn: { width: '47%', borderRadius: 16, paddingVertical: 24, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnIcon: { fontSize: 28, color: '#fff', marginBottom: 8 },
  actionBtnLabel: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  actionBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'center' },
  actionError: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12, marginHorizontal: 20 },
  cancelBtn: { paddingVertical: 20, alignItems: 'center', marginTop: 8 },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  previewIcon: { fontSize: 64, color: '#fff', marginBottom: 12 },
  previewLabel: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  previewName: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  previewTime: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 40 },
  previewConfirmBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40, marginBottom: 16 },
  previewConfirmText: { fontSize: 18, fontWeight: '800' },
  previewBackBtn: { paddingVertical: 14 },
  previewBackText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successIcon: { fontSize: 36, color: '#fff' },
  successLabel: { fontSize: 24, fontWeight: '800', color: '#fff' },
  successName: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 6 },
  successTime: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 24 },
  countdown: { fontSize: 13, color: '#6B7280', marginTop: 16, marginBottom: 16 },
  closeBtn: { backgroundColor: '#374151', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  closeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  logTable: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden', width: '90%' },
  logRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logHeader: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280', padding: 10, backgroundColor: '#F9FAFB' },
  logCell: { flex: 1, fontSize: 14, fontWeight: '600', color: BRAND.textPrimary, padding: 10 },

  kioskBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, columnGap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  kioskBadgeText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});
