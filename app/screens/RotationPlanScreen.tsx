import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getRotationsForAzubi, rotationStatus } from '../services/rotations';
import { Rotation, FacilityType } from '../types';

const TYPE_ICONS: Record<FacilityType, string> = {
  hospital:   '🏥',
  careHome:   '🏠',
  ambulatory: '🚑',
  school:     '🎓',
  other:      '📍',
};

const TYPE_LABELS: Record<FacilityType, { de: string; en: string }> = {
  hospital:   { de: 'Krankenhaus',       en: 'Hospital' },
  careHome:   { de: 'Pflegeheim',        en: 'Care home' },
  ambulatory: { de: 'Ambulanter Dienst', en: 'Outpatient care' },
  school:     { de: 'Berufsschule',      en: 'Vocational school' },
  other:      { de: 'Sonstiges',         en: 'Other' },
};

function progressPercent(startISO: string, endISO: string): number {
  const now   = Date.now();
  const start = new Date(startISO + 'T00:00:00').getTime();
  const end   = new Date(endISO   + 'T00:00:00').getTime();
  if (now <= start) return 0;
  if (now >= end)   return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export default function RotationPlanScreen() {
  const { userProfile } = useAuth();
  const { t, lang }     = useLang();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading]     = useState(true);

  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  function fmtDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  function durationLabel(startISO: string, endISO: string) {
    const months = Math.round(
      (new Date(endISO + 'T00:00:00').getTime() - new Date(startISO + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24 * 30.44)
    );
    return months <= 1
      ? `1 ${t.rotation.month}`
      : `${months} ${t.rotation.months}`;
  }

  const statusConfig = {
    completed: { label: t.rotation.completed, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
    current:   { label: t.rotation.current,   color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
    upcoming:  { label: t.rotation.upcoming,  color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  };

  const load = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      setRotations(await getRotationsForAzubi(userProfile.id));
    } catch {
      setRotations([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed = rotations.filter(r => rotationStatus(r) === 'completed');
  const upcoming  = rotations.filter(r => rotationStatus(r) === 'upcoming');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t.rotation.title}</Text>
        <Text style={styles.subtitle}>{t.rotation.subtitle}</Text>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : rotations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyTitle}>{t.rotation.noTitle}</Text>
            <Text style={styles.emptyText}>{t.rotation.noText}</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{rotations.length}</Text>
                <Text style={styles.statLabel}>{t.rotation.placements}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#065F46' }]}>{completed.length}</Text>
                <Text style={styles.statLabel}>{t.rotation.completed}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{upcoming.length}</Text>
                <Text style={styles.statLabel}>{t.rotation.upcoming}</Text>
              </View>
            </View>

            <View style={styles.timeline}>
              {rotations.map((r, index) => {
                const status = rotationStatus(r);
                const cfg    = statusConfig[status];
                const pct    = status === 'current' ? progressPercent(r.startDate, r.endDate) : null;
                const isLast = index === rotations.length - 1;

                return (
                  <View key={r.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: cfg.dot }]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={[styles.rotationCard, status === 'current' && styles.rotationCardCurrent]}>
                      <View style={styles.cardTopRow}>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <Text style={styles.durationLabel}>{durationLabel(r.startDate, r.endDate)}</Text>
                      </View>
                      <View style={styles.facilityRow}>
                        <Text style={styles.facilityIcon}>{TYPE_ICONS[r.facilityType]}</Text>
                        <View style={styles.facilityInfo}>
                          <Text style={styles.facilityName}>{r.facilityName}</Text>
                          {r.unitName ? <Text style={styles.unitName}>{r.unitName}</Text> : null}
                          <Text style={styles.facilityType}>{TYPE_LABELS[r.facilityType][lang]}</Text>
                        </View>
                      </View>
                      <View style={styles.dateRow}>
                        <Text style={styles.dateText}>{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</Text>
                      </View>
                      {pct !== null && (
                        <View style={styles.progressWrap}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                          </View>
                          <Text style={styles.progressLabel}>
                            {t.rotation.progressLabel.replace('{n}', String(pct))}
                          </Text>
                        </View>
                      )}
                      {r.notes ? <Text style={styles.notes}>📝 {r.notes}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 20, paddingBottom: 40 },
  title:    { fontSize: 26, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: BRAND.textSecondary, marginBottom: 24 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 20 },

  statsRow: { flexDirection: 'row', backgroundColor: BRAND.surface, borderRadius: 14, marginBottom: 24, padding: 4, overflow: 'hidden' },
  statBox:  { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue:{ fontSize: 24, fontWeight: '800', color: BRAND.textPrimary },
  statLabel:{ fontSize: 11, color: BRAND.textSecondary, fontWeight: '600', marginTop: 2 },

  timeline:     { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 32, marginTop: 6 },
  timelineDot:  { width: 14, height: 14, borderRadius: 7, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: BRAND.border, marginTop: 4, marginBottom: -8 },

  rotationCard: {
    flex: 1, backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 14, marginLeft: 12, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  rotationCardCurrent: {
    borderWidth: 2, borderColor: '#10B981',
    shadowColor: '#10B981', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },

  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  durationLabel: { fontSize: 12, color: BRAND.textSecondary, fontWeight: '600' },

  facilityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  facilityIcon: { fontSize: 28, marginRight: 12, marginTop: 2 },
  facilityInfo: { flex: 1 },
  facilityName: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary },
  unitName:     { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  facilityType: { fontSize: 12, color: BRAND.textSecondary, marginTop: 3, fontWeight: '600' },

  dateRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600' },

  progressWrap:  { marginTop: 10 },
  progressTrack: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill:  { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: '#065F46', fontWeight: '600' },

  notes: { fontSize: 12, color: BRAND.textSecondary, marginTop: 8, lineHeight: 18 },
});
