import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getUpcomingShift } from '../services/shifts';
import { getRotationsForAzubi, rotationStatus } from '../services/rotations';
import { Shift, Rotation } from '../types';

const FACILITY_TYPE_ICONS: Record<string, string> = {
  hospital:   '🏥',
  careHome:   '🏠',
  ambulatory: '🚑',
  school:     '🎓',
  other:      '📍',
};

const SHIFT_TYPE_LABELS: Record<string, string> = {
  early:    'Frühdienst',
  late:     'Spätdienst',
  night:    'Nachtdienst',
  school:   'Berufsschule',
  external: 'Extern',
};

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return `Guten Morgen, ${name} 👋`;
  if (h >= 12 && h < 18) return `Guten Tag, ${name} 👋`;
  if (h >= 18 && h < 23) return `Guten Abend, ${name} 👋`;
  return `Hallo, ${name} 👋`;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function fmtShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function daysRemaining(endISO: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endISO + 'T00:00:00');
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const navigation = useNavigation<any>();
  const firstName = userProfile?.name?.split(/\s|,/)[0] ?? '';
  const today = new Date();
  const todayStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const [nextShift, setNextShift]         = useState<Shift | null | undefined>(undefined);
  const [currentRotation, setCurrentRotation] = useState<Rotation | null | undefined>(undefined);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const [shift, rotations] = await Promise.all([
        getUpcomingShift(userProfile.id),
        getRotationsForAzubi(userProfile.id),
      ]);
      setNextShift(shift);
      const current = rotations.find(r => rotationStatus(r) === 'current') ?? null;
      setCurrentRotation(current);
    } catch {
      setNextShift(null);
      setCurrentRotation(null);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Greeting ── */}
        <Text style={styles.greeting}>{greeting(firstName)}</Text>
        <Text style={styles.date}>{todayStr}</Text>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Current Rotation Card ── */}
            <Text style={styles.sectionLabel}>Aktuelle Rotation</Text>
            {currentRotation ? (
              <View style={[styles.card, styles.rotationCard]}>
                <View style={styles.rotationCardTop}>
                  <Text style={styles.rotationIcon}>
                    {FACILITY_TYPE_ICONS[currentRotation.facilityType] ?? '📍'}
                  </Text>
                  <View style={styles.rotationInfo}>
                    <Text style={styles.rotationFacility}>{currentRotation.facilityName}</Text>
                    {currentRotation.unitName ? (
                      <Text style={styles.rotationUnit}>{currentRotation.unitName}</Text>
                    ) : null}
                  </View>
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Aktuell</Text>
                  </View>
                </View>
                <View style={styles.rotationDates}>
                  <Text style={styles.rotationDateText}>
                    {fmtShortDate(currentRotation.startDate)} – {fmtShortDate(currentRotation.endDate)}
                  </Text>
                  <Text style={styles.rotationRemaining}>
                    Noch {daysRemaining(currentRotation.endDate)} Tage
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('rotation')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Gesamten Rotationsplan anzeigen →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyIcon}>🔄</Text>
                <Text style={styles.emptyText}>Noch kein Rotationsplan hinterlegt.</Text>
                <Text style={styles.emptyHint}>Dein Ausbildungsleiter fügt deinen Plan hinzu.</Text>
              </View>
            )}

            {/* ── Next Shift Card ── */}
            <Text style={styles.sectionLabel}>Nächste Schicht</Text>
            {nextShift ? (
              <View style={[styles.card, styles.shiftCard]}>
                <View style={styles.shiftTop}>
                  <Text style={styles.shiftType}>
                    {SHIFT_TYPE_LABELS[nextShift.shiftType] ?? nextShift.shiftType}
                  </Text>
                  <View style={styles.shiftTimeBadge}>
                    <Text style={styles.shiftTimeBadgeText}>
                      {nextShift.startTime} – {nextShift.endTime}
                    </Text>
                  </View>
                </View>
                <Text style={styles.shiftDate}>{fmtDate(nextShift.date)}</Text>
                {nextShift.facilityName ? (
                  <Text style={styles.shiftFacility}>📍 {nextShift.facilityName}</Text>
                ) : null}
                {daysUntil(nextShift.date) === 0 && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Heute</Text>
                  </View>
                )}
                {daysUntil(nextShift.date) === 1 && (
                  <View style={[styles.todayBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.todayBadgeText, { color: '#92400E' }]}>Morgen</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('shiftPlan')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Gesamten Dienstplan anzeigen →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>Keine bevorstehenden Schichten.</Text>
              </View>
            )}

            {/* ── Training Overview ── */}
            <Text style={styles.sectionLabel}>Ausbildungsübersicht</Text>
            <View style={styles.overviewGrid}>
              <View style={[styles.overviewCard, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.overviewIcon}>🎓</Text>
                <Text style={[styles.overviewValue, { color: '#5B21B6' }]}>
                  {userProfile?.ausbildungYear ? `${userProfile.ausbildungYear}. Jahr` : '—'}
                </Text>
                <Text style={[styles.overviewLabel, { color: '#5B21B6' }]}>Ausbildungsjahr</Text>
              </View>
              <View style={[styles.overviewCard, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.overviewIcon}>⏱</Text>
                <Text style={[styles.overviewValue, { color: '#065F46' }]}>
                  {userProfile?.contractedHoursPerWeek ?? '—'}h
                </Text>
                <Text style={[styles.overviewLabel, { color: '#065F46' }]}>Std./Woche</Text>
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <Text style={styles.sectionLabel}>Schnellzugriff</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => navigation.navigate('availability')}
                activeOpacity={0.8}
              >
                <Text style={styles.quickIcon}>✋</Text>
                <Text style={styles.quickLabel}>Wunsch einreichen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => navigation.navigate('workingTime')}
                activeOpacity={0.8}
              >
                <Text style={styles.quickIcon}>⏱</Text>
                <Text style={styles.quickLabel}>Arbeitszeiten</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BRAND.background },
  scroll:  { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 4 },
  date:    { fontSize: 14, color: BRAND.textSecondary, marginBottom: 24 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },

  card: {
    backgroundColor: BRAND.surface, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  rotationCard: { borderLeftWidth: 4, borderLeftColor: BRAND.primary },
  rotationCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rotationIcon: { fontSize: 28, marginRight: 12 },
  rotationInfo: { flex: 1 },
  rotationFacility: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary },
  rotationUnit: { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  currentBadge: { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  rotationDates: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rotationDateText: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600' },
  rotationRemaining: { fontSize: 12, color: BRAND.primary, fontWeight: '700' },

  shiftCard: { borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  shiftTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  shiftType: { fontSize: 17, fontWeight: '800', color: BRAND.textPrimary },
  shiftTimeBadge: { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  shiftTimeBadgeText: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  shiftDate: { fontSize: 14, color: BRAND.textSecondary, marginBottom: 4 },
  shiftFacility: { fontSize: 13, color: BRAND.textSecondary, marginBottom: 8 },
  todayBadge: { alignSelf: 'flex-start', backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  todayBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 12, color: BRAND.textSecondary, textAlign: 'center', marginTop: 4 },

  seeAllBtn: { marginTop: 4 },
  seeAllText: { fontSize: 13, color: BRAND.primary, fontWeight: '600' },

  overviewGrid: { flexDirection: 'row', columnGap: 12, marginBottom: 16 },
  overviewCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  overviewIcon: { fontSize: 22, marginBottom: 6 },
  overviewValue: { fontSize: 22, fontWeight: '800' },
  overviewLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  quickGrid: { flexDirection: 'row', columnGap: 12 },
  quickBtn: {
    flex: 1, backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.border,
  },
  quickIcon: { fontSize: 24, marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, textAlign: 'center' },
});
