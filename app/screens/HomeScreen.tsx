import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
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

const SHIFT_TYPE_LABELS: Record<string, { de: string; en: string }> = {
  early:    { de: 'Frühdienst',   en: 'Early shift' },
  late:     { de: 'Spätdienst',   en: 'Late shift' },
  night:    { de: 'Nachtdienst',  en: 'Night shift' },
  school:   { de: 'Berufsschule', en: 'Vocational school' },
  external: { de: 'Extern',       en: 'External' },
};

function openInMaps(facilityName: string, unitName?: string | null) {
  const query = encodeURIComponent([facilityName, unitName].filter(Boolean).join(' '));
  const url = Platform.OS === 'ios'
    ? `maps://0,0?q=${query}`
    : Platform.OS === 'android'
    ? `geo:0,0?q=${query}`
    : `https://maps.google.com/?q=${query}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${query}`));
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86400000);
}

function daysRemaining(endISO: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((new Date(endISO + 'T00:00:00').getTime() - today.getTime()) / 86400000));
}

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const { t, lang }     = useLang();
  const navigation      = useNavigation<any>();

  const locale    = lang === 'de' ? 'de-DE' : 'en-GB';
  const firstName = userProfile?.name?.split(/\s|,/)[0] ?? '';

  const h = new Date().getHours();
  const greet = h >= 5 && h < 12 ? t.home.greeting.morning
              : h >= 12 && h < 18 ? t.home.greeting.day
              : h >= 18 && h < 23 ? t.home.greeting.evening
              : t.home.greeting.night;

  const todayStr = new Date().toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  function fmtDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }
  function fmtShort(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  const [nextShift,       setNextShift]       = useState<Shift | null | undefined>(undefined);
  const [currentRotation, setCurrentRotation] = useState<Rotation | null | undefined>(undefined);
  const [loading,         setLoading]         = useState(true);

  const load = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const [shift, rotations] = await Promise.all([
        getUpcomingShift(userProfile.id),
        getRotationsForAzubi(userProfile.id),
      ]);
      setNextShift(shift);
      setCurrentRotation(rotations.find(r => rotationStatus(r) === 'current') ?? null);
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

        <Text style={styles.greeting}>{greet}, {firstName} 👋</Text>
        <Text style={styles.date}>{todayStr}</Text>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t.home.currentRotation}</Text>
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
                    <Text style={styles.currentBadgeText}>{t.home.current}</Text>
                  </View>
                </View>
                <View style={styles.rotationDates}>
                  <Text style={styles.rotationDateText}>
                    {fmtShort(currentRotation.startDate)} – {fmtShort(currentRotation.endDate)}
                  </Text>
                  <Text style={styles.rotationRemaining}>
                    {t.home.daysLeft.replace('{n}', String(daysRemaining(currentRotation.endDate)))}
                  </Text>
                </View>
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('rotation')} activeOpacity={0.7}>
                  <Text style={styles.seeAllText}>{t.home.showFullRotation}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyIcon}>🔄</Text>
                <Text style={styles.emptyText}>{t.home.noRotationSet}</Text>
                <Text style={styles.emptyHint}>{t.home.noRotationHint}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>{t.home.nextShift}</Text>
            {nextShift ? (
              <View style={[styles.card, styles.shiftCard]}>
                <View style={styles.shiftTop}>
                  <Text style={styles.shiftType}>
                    {SHIFT_TYPE_LABELS[nextShift.shiftType]?.[lang] ?? nextShift.shiftType}
                  </Text>
                  <View style={styles.shiftTimeBadge}>
                    <Text style={styles.shiftTimeBadgeText}>{nextShift.startTime} – {nextShift.endTime}</Text>
                  </View>
                </View>
                <Text style={styles.shiftDate}>{fmtDate(nextShift.date)}</Text>
                {nextShift.facilityName ? (
                  <TouchableOpacity
                    onPress={() => openInMaps(nextShift.facilityName, nextShift.unitName)}
                    activeOpacity={0.75}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text style={[styles.shiftFacility, styles.shiftFacilityLink]}>
                      📍 {nextShift.facilityName}{'  '}
                      <Text style={styles.mapHint}>{t.home.mapOpen}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {daysUntil(nextShift.date) === 0 && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>{t.home.today}</Text>
                  </View>
                )}
                {daysUntil(nextShift.date) === 1 && (
                  <View style={[styles.todayBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.todayBadgeText, { color: '#92400E' }]}>{t.home.tomorrow}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('shiftPlan')} activeOpacity={0.7}>
                  <Text style={styles.seeAllText}>{t.home.showFullShifts}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>{t.home.noShifts}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>{t.home.trainingOverview}</Text>
            <View style={styles.overviewGrid}>
              <View style={[styles.overviewCard, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.overviewIcon}>🎓</Text>
                <Text style={[styles.overviewValue, { color: '#5B21B6' }]}>
                  {userProfile?.ausbildungYear ? `${userProfile.ausbildungYear}.` : '—'}
                </Text>
                <Text style={[styles.overviewLabel, { color: '#5B21B6' }]}>{t.home.trainingYear}</Text>
              </View>
              <View style={[styles.overviewCard, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.overviewIcon}>⏱</Text>
                <Text style={[styles.overviewValue, { color: '#065F46' }]}>
                  {userProfile?.contractedHoursPerWeek ?? '—'}h
                </Text>
                <Text style={[styles.overviewLabel, { color: '#065F46' }]}>{t.home.hoursPerWeek}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>{t.home.quickActions}</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('availability')} activeOpacity={0.8}>
                <Text style={styles.quickIcon}>✋</Text>
                <Text style={styles.quickLabel}>{t.home.submitWish}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('workingTime')} activeOpacity={0.8}>
                <Text style={styles.quickIcon}>⏱</Text>
                <Text style={styles.quickLabel}>{t.home.workingTimes}</Text>
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
  rotationCard:    { borderLeftWidth: 4, borderLeftColor: BRAND.primary },
  rotationCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rotationIcon:    { fontSize: 28, marginRight: 12 },
  rotationInfo:    { flex: 1 },
  rotationFacility:{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary },
  rotationUnit:    { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  currentBadge:    { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  currentBadgeText:{ fontSize: 11, fontWeight: '700', color: '#065F46' },
  rotationDates:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rotationDateText:{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '600' },
  rotationRemaining:{ fontSize: 12, color: BRAND.primary, fontWeight: '700' },

  shiftCard:        { borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  shiftTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  shiftType:        { fontSize: 17, fontWeight: '800', color: BRAND.textPrimary },
  shiftTimeBadge:   { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  shiftTimeBadgeText:{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  shiftDate:        { fontSize: 14, color: BRAND.textSecondary, marginBottom: 4 },
  shiftFacility:    { fontSize: 13, color: BRAND.textSecondary, marginBottom: 8 },
  shiftFacilityLink:{ color: BRAND.primary },
  mapHint:          { fontSize: 11, color: '#2563EB', fontWeight: '700' },
  todayBadge:       { alignSelf: 'flex-start', backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  todayBadgeText:   { fontSize: 12, fontWeight: '700', color: '#065F46' },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 12, color: BRAND.textSecondary, textAlign: 'center', marginTop: 4 },

  seeAllBtn:  { marginTop: 4 },
  seeAllText: { fontSize: 13, color: BRAND.primary, fontWeight: '600' },

  overviewGrid: { flexDirection: 'row', columnGap: 12, marginBottom: 16 },
  overviewCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  overviewIcon: { fontSize: 22, marginBottom: 6 },
  overviewValue:{ fontSize: 22, fontWeight: '800' },
  overviewLabel:{ fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  quickGrid: { flexDirection: 'row', columnGap: 12 },
  quickBtn:  {
    flex: 1, backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.border,
  },
  quickIcon:  { fontSize: 24, marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, textAlign: 'center' },
});
