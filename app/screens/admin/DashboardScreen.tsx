import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const ADMIN_PURPLE = '#3C3489';
const ADMIN_PURPLE_LIGHT = '#EEEDFE';

const METRICS = [
  { label: 'Azubis aktiv', value: '3', icon: '👥' },
  { label: 'Wünsche offen', value: '4', icon: '✋' },
  { label: 'Dienste Woche', value: '12', icon: '📋' },
  { label: 'Stunden Ø', value: '38,5', icon: '⏱' },
];

const ACTIONS = [
  { label: 'Dienstplan veröffentlichen', icon: '📋' },
  { label: 'Wünsche prüfen (4)', icon: '✋' },
  { label: 'Neuen Azubi einladen', icon: '➕' },
];

export default function DashboardScreen() {
  const { userProfile } = useAuth();
  const firstName = userProfile?.name.split(' ')[0] ?? 'Admin';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Hallo, {firstName} 👋</Text>
        <Text style={styles.subtitle}>Ausbildungsleitung · Übersicht</Text>

        {/* Metric cards 2×2 */}
        <View style={styles.grid}>
          {METRICS.map((m) => (
            <View key={m.label} style={styles.card}>
              <Text style={styles.cardIcon}>{m.icon}</Text>
              <Text style={styles.cardValue}>{m.value}</Text>
              <Text style={styles.cardLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Nächste Aktionen */}
        <Text style={styles.sectionTitle}>Nächste Aktionen</Text>
        <View style={styles.actionList}>
          {ACTIONS.map((a, i) => (
            <TouchableOpacity key={a.label} style={[styles.actionRow, i < ACTIONS.length - 1 && styles.actionRowBorder]} activeOpacity={0.7}>
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
    marginHorizontal: -6,
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
