import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE } from '../../constants/colors';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getRequestsForFacility } from '../../services/placementRequests';
import { PlacementRequest, PlacementRequestStatus } from '../../types';

const STATUS_CONFIG: Record<PlacementRequestStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Ausstehend', color: '#92400E', bg: '#FEF3C7' },
  approved: { label: 'Genehmigt',  color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Abgelehnt', color: '#991B1B', bg: '#FEE2E2' },
};

function Section({ label, items, displayMonth }: {
  label: string;
  items: PlacementRequest[];
  displayMonth: (s: string) => string;
}) {
  return (
    <>
      <Text style={cs.sectionLabel}>{label}</Text>
      {items.map(r => {
        const cfg = STATUS_CONFIG[r.status];
        return (
          <View key={r.id} style={cs.card}>
            <View style={cs.top}>
              <Text style={cs.trainee}>{r.traineeName}</Text>
              <View style={[cs.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[cs.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
            <Text style={cs.period}>{displayMonth(r.startMonth)} – {displayMonth(r.endMonth)}</Text>
            {r.adminResponse ? (
              <Text style={cs.note}>💬 {r.adminResponse}</Text>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

export default function IncomingTraineesScreen() {
  const navigation      = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t }           = useLang();
  const facilityId      = userProfile?.primaryFacilityId ?? '';

  const [requests, setRequests] = useState<PlacementRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      setRequests(await getRequestsForFacility(facilityId));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function displayMonth(yyyyMm: string): string {
    const [year, month] = yyyyMm.split('-');
    return `${t.months[parseInt(month) - 1]} ${year}`;
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} activeOpacity={0.7}>
            <Text style={s.backText}>‹ Dashboard</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t.placementRequest.incomingTitle}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👩‍⚕️</Text>
            <Text style={s.emptyTitle}>Keine Anfragen</Text>
            <Text style={s.emptyHint}>
              Anfragen von Auszubildenden für diese Einrichtung erscheinen hier.
            </Text>
          </View>
        ) : (
          <>
            {pending.length  > 0 && <Section label={`Ausstehend (${pending.length})`} items={pending}  displayMonth={displayMonth} />}
            {approved.length > 0 && <Section label={`Zugesagt (${approved.length})`}  items={approved} displayMonth={displayMonth} />}
            {rejected.length > 0 && <Section label="Abgelehnt"                         items={rejected} displayMonth={displayMonth} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: BRAND.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8,
  },
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trainee:  { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, flex: 1, marginRight: 8 },
  badge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:{ fontSize: 12, fontWeight: '700' },
  period:   { fontSize: 13, color: BRAND.textSecondary },
  note:     { fontSize: 12, color: BRAND.textSecondary, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },
});

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back:     { marginRight: 12 },
  backText: { fontSize: 15, color: ADMIN_PURPLE, fontWeight: '600' },
  title:    { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary },
  empty:      { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 },
  emptyHint:  { fontSize: 13, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 18 },
});
