import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { BRAND } from '../constants/colors';
import {
  getAzubiByPin, getEntriesForDay, clockAction,
  nextAction, buildDailyRecord,
} from '../services/timeEntries';
import { TimeEntry, ClockAction } from '../types';

// ── Config ───────────────────────────────────────────────────────────────────
// In production this would come from the admin-configured facility.
// For now it reads from AuthContext via prop drilling or can be hardcoded on device.
interface Props {
  facilityId: string;
  facilityName: string;
}

// ── Action definitions ───────────────────────────────────────────────────────
const ACTION_META: Record<ClockAction, { label: string; sublabel: string; color: string; bg: string }> = {
  start:      { label: 'START',         sublabel: 'Schicht beginnen', color: '#065F46', bg: '#D1FAE5' },
  breakStart: { label: 'PAUSE',         sublabel: 'Pause beginnen',   color: '#92400E', bg: '#FEF3C7' },
  breakEnd:   { label: 'PAUSE ENDE',    sublabel: 'Weiterarbeiten',   color: '#1E3A8A', bg: '#DBEAFE' },
  end:        { label: 'ENDE',          sublabel: 'Schicht beenden',  color: '#7F1D1D', bg: '#FEE2E2' },
};

type Screen = 'pin' | 'action' | 'confirm';

export default function KioskScreen({ facilityId, facilityName }: Props) {
  const [pin, setPin]           = useState('');
  const [screen, setScreen]     = useState<Screen>('pin');
  const [loading, setLoading]   = useState(false);
  const [azubi, setAzubi]       = useState<{ id: string; name: string } | null>(null);
  const [entries, setEntries]   = useState<TimeEntry[]>([]);
  const [lastAction, setLastAction] = useState<ClockAction | null>(null);

  // Auto-reset to PIN screen after 5 s on confirm
  useEffect(() => {
    if (screen !== 'confirm') return;
    const t = setTimeout(() => {
      setScreen('pin');
      setPin('');
      setAzubi(null);
      setEntries([]);
      setLastAction(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [screen]);

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    setPin(p => p + d);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      const found = await getAzubiByPin(facilityId, pin);
      if (!found) {
        Alert.alert('PIN ungültig', 'Kein Azubi mit diesem PIN gefunden.');
        setPin('');
        return;
      }
      const today = await getEntriesForDay(found.id);
      setAzubi(found);
      setEntries(today);
      setScreen('action');
    } catch (e) {
      Alert.alert('Fehler', 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }, [pin, facilityId]);

  // Submit when PIN reaches 6 digits automatically
  useEffect(() => {
    if (pin.length === 6) handlePinSubmit();
  }, [pin, handlePinSubmit]);

  const handleClock = async (action: ClockAction) => {
    if (!azubi) return;
    setLoading(true);
    try {
      await clockAction(azubi.id, azubi.name, facilityId, action);
      setLastAction(action);
      setScreen('confirm');
    } catch (e) {
      Alert.alert('Fehler', 'Konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── PIN Screen ──────────────────────────────────────────────────────────────
  if (screen === 'pin') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <Text style={styles.facilityName}>{facilityName}</Text>
          <Text style={styles.clockTime}>{timeStr}</Text>
          <Text style={styles.clockDate}>{dateStr}</Text>
        </View>

        <View style={styles.pinSection}>
          <Text style={styles.pinLabel}>PIN eingeben</Text>
          <View style={styles.dots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </View>
        </View>

        <View style={styles.pad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <TouchableOpacity key={d} style={styles.key} onPress={() => handleDigit(d)} activeOpacity={0.7}>
              <Text style={styles.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.keyEmpty} />
          <TouchableOpacity style={styles.key} onPress={() => handleDigit('0')} activeOpacity={0.7}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyDelete} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={styles.keyDeleteText}>⌫</Text>
          </TouchableOpacity>
        </View>

        {pin.length >= 4 && (
          <TouchableOpacity style={styles.submitBtn} onPress={handlePinSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Bestätigen →</Text>}
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── Action Screen ───────────────────────────────────────────────────────────
  if (screen === 'action' && azubi) {
    const next = nextAction(entries);
    const rec  = buildDailyRecord(entries);

    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <Text style={styles.facilityName}>{facilityName}</Text>
          <Text style={styles.clockTime}>{timeStr}</Text>
        </View>

        <View style={styles.welcomeRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {azubi.name.split(/\s|,/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Hallo,</Text>
            <Text style={styles.azubiName}>{azubi.name}</Text>
          </View>
        </View>

        {/* Today summary */}
        {rec && (
          <View style={styles.summaryCard}>
            {rec.startAt      && <SummaryRow icon="▶" label="Beginn"       val={fmtTime(rec.startAt)} />}
            {rec.breakStartAt && <SummaryRow icon="☕" label="Pause"        val={fmtTime(rec.breakStartAt)} />}
            {rec.breakEndAt   && <SummaryRow icon="▶" label="Weiter"       val={fmtTime(rec.breakEndAt)} />}
            {rec.endAt        && <SummaryRow icon="■" label="Ende"         val={fmtTime(rec.endAt)} />}
          </View>
        )}

        {next ? (
          <>
            <Text style={styles.actionPrompt}>Was möchtest du stempeln?</Text>
            {/* Show all sensible actions; highlight the expected next one */}
            {(Object.keys(ACTION_META) as ClockAction[]).map(a => {
              const meta    = ACTION_META[a];
              const isNext  = a === next;
              const isDone  = entries.some(e => e.action === a);
              if (isDone) return null;
              return (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: isNext ? meta.bg : '#F9FAFB', borderColor: isNext ? meta.color : BRAND.border },
                    isNext && styles.actionBtnPrimary,
                  ]}
                  onPress={() => handleClock(a)}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={[styles.actionLabel, { color: isNext ? meta.color : BRAND.textSecondary }]}>{meta.label}</Text>
                    <Text style={[styles.actionSublabel, { color: isNext ? meta.color : BRAND.textSecondary }]}>{meta.sublabel}</Text>
                  </View>
                  {isNext && <Text style={[styles.actionArrow, { color: meta.color }]}>→</Text>}
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneText}>Schicht vollständig erfasst</Text>
          </View>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setScreen('pin'); setPin(''); setAzubi(null); setEntries([]); }}>
          <Text style={styles.cancelBtnText}>Abbrechen</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={BRAND.primary} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Confirm Screen ──────────────────────────────────────────────────────────
  if (screen === 'confirm' && lastAction) {
    const meta = ACTION_META[lastAction];
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: meta.bg }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.confirmContent}>
          <Text style={styles.confirmIcon}>✓</Text>
          <Text style={[styles.confirmAction, { color: meta.color }]}>{meta.label}</Text>
          <Text style={[styles.confirmTime, { color: meta.color }]}>{timeStr}</Text>
          <Text style={[styles.confirmName, { color: meta.color }]}>{azubi?.name}</Text>
          <Text style={[styles.confirmHint, { color: meta.color }]}>Wird automatisch zurückgesetzt…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Small helper components ─────────────────────────────────────────────────

function SummaryRow({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <View style={srStyles.row}>
      <Text style={srStyles.icon}>{icon}</Text>
      <Text style={srStyles.label}>{label}</Text>
      <Text style={srStyles.val}>{val}</Text>
    </View>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#fff' },
  header:       { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  facilityName: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  clockTime:    { fontSize: 52, fontWeight: '700', color: BRAND.textPrimary, lineHeight: 60, marginTop: 4 },
  clockDate:    { fontSize: 15, color: BRAND.textSecondary, marginTop: 2 },

  pinSection:   { alignItems: 'center', marginTop: 16, marginBottom: 28 },
  pinLabel:     { fontSize: 16, fontWeight: '600', color: BRAND.textPrimary, marginBottom: 16 },
  dots:         { flexDirection: 'row', columnGap: 14 },
  dot:          { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: BRAND.border, backgroundColor: 'transparent' },
  dotFilled:    { backgroundColor: BRAND.primary, borderColor: BRAND.primary },

  pad:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 48, rowGap: 12, columnGap: 12, justifyContent: 'center' },
  key:          { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  keyText:      { fontSize: 26, fontWeight: '600', color: BRAND.textPrimary },
  keyEmpty:     { width: 80, height: 80 },
  keyDelete:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  keyDeleteText:{ fontSize: 22, color: BRAND.textSecondary },

  submitBtn:    { marginHorizontal: 48, marginTop: 24, backgroundColor: BRAND.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },

  welcomeRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, columnGap: 14 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: BRAND.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BRAND.primary },
  avatarText:   { fontSize: 18, fontWeight: '700', color: BRAND.primary },
  welcomeText:  { fontSize: 14, color: BRAND.textSecondary },
  azubiName:    { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary },

  summaryCard:  { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BRAND.border },

  actionPrompt: { fontSize: 14, fontWeight: '600', color: BRAND.textSecondary, paddingHorizontal: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionBtn:    { marginHorizontal: 24, marginBottom: 10, borderRadius: 14, borderWidth: 2, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBtnPrimary: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  actionLabel:  { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  actionSublabel:{ fontSize: 12, fontWeight: '500', marginTop: 2 },
  actionArrow:  { fontSize: 22, fontWeight: '700' },

  doneCard:     { marginHorizontal: 24, marginTop: 16, backgroundColor: '#D1FAE5', borderRadius: 14, padding: 24, alignItems: 'center' },
  doneIcon:     { fontSize: 32, color: '#065F46' },
  doneText:     { fontSize: 15, fontWeight: '700', color: '#065F46', marginTop: 8 },

  cancelBtn:    { marginHorizontal: 24, marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:{ fontSize: 15, color: BRAND.textSecondary, fontWeight: '600' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },

  confirmContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmIcon:    { fontSize: 64, marginBottom: 12 },
  confirmAction:  { fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  confirmTime:    { fontSize: 52, fontWeight: '700', marginTop: 4 },
  confirmName:    { fontSize: 18, fontWeight: '600', marginTop: 8 },
  confirmHint:    { fontSize: 13, marginTop: 24, opacity: 0.7 },
});

const srStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, columnGap: 8 },
  icon:  { fontSize: 13, width: 20, textAlign: 'center' },
  label: { fontSize: 13, color: BRAND.textSecondary, flex: 1 },
  val:   { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary },
});
