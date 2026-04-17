import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getAllAzubis } from '../../services/users';
import { countWishesByStatus } from '../../services/wishes';
import { getTodayAttendance } from '../../services/timeEntries';
import { countPendingCorrections } from '../../services/corrections';
import { DailyTimeRecord } from '../../types';

function currentlyActive(records: DailyTimeRecord[]): number {
  return records.filter(r => {
    const actions = new Set(r.entries.map(e => e.action));
    return actions.has('start') && !actions.has('end');
  }).length;
}

export default function DashboardScreen() {
  const { userProfile } = useAuth();
  const navigation = useNavigation<any>();
  const firstName  = userProfile?.name.split(/\s|,/)[0] ?? 'Admin';
  const facilityId = userProfile?.primaryFacilityId ?? '';

  const [azubiCount,    setAzubiCount]    = useState<number | null>(null);
  const [pendingWishes, setPendingWishes] = useState<number | null>(null);
  const [activeNow,     setActiveNow]     = useState<number | null>(null);
  const [pendingCorr,   setPendingCorr]   = useState<number | null>(null);

  const load = useCallback(() => {
    getAllAzubis()
      .then(list => setAzubiCount(list.length))
      .catch(() => setAzubiCount(0));

    countWishesByStatus()
      .then(counts => setPendingWishes(counts.pending))
      .catch(() => setPendingWishes(0));

    getTodayAttendance(facilityId)
      .then(recs => setActiveNow(currentlyActive(recs)))
      .catch(() => setActiveNow(0));

    countPendingCorrections(facilityId)
      .then(n => setPendingCorr(n))
      .catch(() => setPendingCorr(0));
  }, [facilityId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const metrics = [
    { label: 'Azubis aktiv',    value: azubiCount,    icon: '👥', color: ADMIN_PURPLE,  bg: ADMIN_PURPLE_LIGHT },
    { label: 'Jetzt im Dienst', value: activeNow,     icon: '🟢', color: '#065F46',     bg: '#D1FAE5' },
    { label: 'Wünsche offen',   value: pendingWishes, icon: '✋', color: '#92400E',     bg: '#FEF3C7' },
    { label: 'Korrekturen',     value: pendingCorr,   icon: '⚠',  color: '#1E3A8A',    bg: '#DBEAFE' },
  ];

  const ACTIONS = [
    { label: 'Anwesenheit anzeigen',                                        icon: '🟢', screen: 'adminAttendance' },
    { label: 'Dienstplan veröffentlichen',                                   icon: '📋', screen: 'shiftPublisher' },
    { label: `Wünsche prüfen${pendingWishes ? ` (${pendingWishes})` : ''}`, icon: '✋', screen: 'adminWishes' },
    { label: `Korrekturen${pendingCorr ? ` (${pendingCorr})` : ''}`,        icon: '⚠',  screen: 'adminAttendance' },
    { label: 'Neuen Azubi einladen',                                         icon: '➕', screen: 'trainees' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Hallo, {firstName} 👋</Text>
        <Text style={styles.subtitle}>Ausbildungsleitung · Übersicht</Text>

        <View style={styles.grid}>
          {metrics.map((m) => (
            <View key={m.label} style={[styles.card, { backgroundColor: m.bg }]}>
              <Text style={styles.cardIcon}>{m.icon}</Text>
              {m.value === null
                ? <ActivityIndicator color={m.color} style={{ marginVertical: 6 }} />
                : <Text style={[styles.cardValue, { color: m.color }]}>{m.value}</Text>}
              <Text style={[styles.cardLabel, { color: m.color }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Nächste Aktionen</Text>
        <View style={styles.actionList}>
          {ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionRow, i < ACTIONS.length - 1 && styles.actionRowBorder]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(a.screen)}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: BRAND.textPrimary },
  subtitle: { fontSize: 13, color: ADMIN_PURPLE, fontWeight: '600', marginTop: 4, marginBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    width: '47.5%', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardIcon:  { fontSize: 22, marginBottom: 6 },
  cardValue: { fontSize: 30, fontWeight: '800' },
  cardLabel: { fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 12 },
  actionList: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  actionRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.border },
  actionIcon:      { fontSize: 18, marginRight: 12 },
  actionLabel:     { flex: 1, fontSize: 14, fontWeight: '600', color: BRAND.textPrimary },
  actionArrow:     { fontSize: 22, color: BRAND.textSecondary, fontWeight: '300' },
});
