import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND, ADMIN_PURPLE } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getAllAzubis } from '../../services/users';
import { countWishesByStatus } from '../../services/wishes';

export default function DashboardScreen() {
  const { userProfile } = useAuth();
  const firstName = userProfile?.name.split(' ')[0] ?? 'Admin';

  const [azubiCount, setAzubiCount] = useState<number | null>(null);
  const [pendingWishes, setPendingWishes] = useState<number | null>(null);

  useEffect(() => {
    getAllAzubis()
      .then(list => setAzubiCount(list.length))
      .catch(() => setAzubiCount(0));

    countWishesByStatus()
      .then(counts => setPendingWishes(counts.pending))
      .catch(() => setPendingWishes(0));
  }, []);

  const metrics = [
    { label: 'Azubis aktiv', value: azubiCount, icon: '👥' },
    { label: 'Wünsche offen', value: pendingWishes, icon: '✋' },
  ];

  const ACTIONS = [
    { label: 'Dienstplan veröffentlichen', icon: '📋' },
    { label: `Wünsche prüfen${pendingWishes ? ` (${pendingWishes})` : ''}`, icon: '✋' },
    { label: 'Neuen Azubi einladen', icon: '➕' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Hallo, {firstName} 👋</Text>
        <Text style={styles.subtitle}>Ausbildungsleitung · Übersicht</Text>

        {/* Metric cards */}
        <View style={styles.grid}>
          {metrics.map((m) => (
            <View key={m.label} style={styles.card}>
              <Text style={styles.cardIcon}>{m.icon}</Text>
              {m.value === null
                ? <ActivityIndicator color={ADMIN_PURPLE} style={{ marginVertical: 6 }} />
                : <Text style={styles.cardValue}>{m.value}</Text>}
              <Text style={styles.cardLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Nächste Aktionen */}
        <Text style={styles.sectionTitle}>Nächste Aktionen</Text>
        <View style={styles.actionList}>
          {ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionRow, i < ACTIONS.length - 1 && styles.actionRowBorder]}
              activeOpacity={0.7}
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
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: BRAND.textPrimary },
  subtitle: { fontSize: 13, color: ADMIN_PURPLE, fontWeight: '600', marginTop: 4, marginBottom: 24 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: -6, marginBottom: 8,
  },
  card: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  cardIcon: { fontSize: 24, marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: '800', color: ADMIN_PURPLE },
  cardLabel: { fontSize: 12, color: BRAND.textSecondary, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 12 },
  actionList: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.border },
  actionIcon: { fontSize: 18, marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: BRAND.textPrimary },
  actionArrow: { fontSize: 22, color: BRAND.textSecondary, fontWeight: '300' },
});
