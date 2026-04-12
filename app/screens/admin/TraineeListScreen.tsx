import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '../../constants/colors';

const ADMIN_PURPLE = '#3C3489';
const ADMIN_PURPLE_LIGHT = '#EEEDFE';

interface Azubi {
  id: string;
  name: string;
  email: string;
  year: 1 | 2 | 3;
  contractedHours: number;
  facility: string;
  startDate: string;
}

const AZUBIS: Azubi[] = [
  {
    id: 'a1', name: 'Abraham T. Borbor Jr.', email: 'abraham@pflegeazubi.de',
    year: 2, contractedHours: 40, facility: 'Seniorenheim Sonnenhof', startDate: '01.09.2024',
  },
  {
    id: 'a2', name: 'Fatima Al-Hassan', email: 'fatima@pflegeazubi.de',
    year: 1, contractedHours: 38, facility: 'Seniorenheim Sonnenhof', startDate: '01.09.2025',
  },
  {
    id: 'a3', name: 'Jana Müller', email: 'jana@pflegeazubi.de',
    year: 3, contractedHours: 40, facility: 'Seniorenheim Sonnenhof', startDate: '01.09.2023',
  },
];

const YEAR_COLORS = ['#FAEEDA', '#EEEDFE', '#E1F5EE'];
const YEAR_TEXT_COLORS = ['#633806', ADMIN_PURPLE, BRAND.primary];

export default function TraineeListScreen() {
  const [selected, setSelected] = useState<Azubi | null>(null);

  function handleInvite() {
    Alert.alert('Einladung senden', 'In der Produktionsversion wird hier eine E-Mail-Einladung versendet.', [{ text: 'OK' }]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Azubis</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.8}>
            <Text style={styles.inviteBtnText}>+ Einladen</Text>
          </TouchableOpacity>
        </View>

        {AZUBIS.map(az => (
          <TouchableOpacity key={az.id} style={styles.card} onPress={() => setSelected(az)} activeOpacity={0.8}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{az.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{az.name}</Text>
              <Text style={styles.email}>{az.email}</Text>
            </View>
            <View style={[styles.yearBadge, { backgroundColor: YEAR_COLORS[(az.year - 1) % 3] }]}>
              <Text style={[styles.yearText, { color: YEAR_TEXT_COLORS[(az.year - 1) % 3] }]}>
                {az.year}. Jahr
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetAvatar}>
                    <Text style={styles.sheetAvatarText}>{selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.sheetName}>{selected.name}</Text>
                    <Text style={styles.sheetEmail}>{selected.email}</Text>
                  </View>
                </View>
                {[
                  { label: 'Ausbildungsjahr', value: `${selected.year}. Jahr` },
                  { label: 'Vertragsstunden', value: `${selected.contractedHours} Std./Woche` },
                  { label: 'Einrichtung', value: selected.facility },
                  { label: 'Ausbildungsstart', value: selected.startDate },
                ].map(row => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary },
  inviteBtn: {
    backgroundColor: ADMIN_PURPLE, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  avatarBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ADMIN_PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: ADMIN_PURPLE },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  email: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  yearBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  yearText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BRAND.surface, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24, paddingBottom: 48,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: BRAND.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sheetAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: ADMIN_PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  sheetAvatarText: { fontSize: 18, fontWeight: '700', color: ADMIN_PURPLE },
  sheetName: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary },
  sheetEmail: { fontSize: 13, color: BRAND.textSecondary, marginTop: 3 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  detailLabel: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600' },
  detailValue: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '700' },
});
