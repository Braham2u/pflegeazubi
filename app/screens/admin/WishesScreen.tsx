import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND, ADMIN_PURPLE } from '../../constants/colors';

type WishStatus = 'pending' | 'approved' | 'rejected';

interface Wish {
  id: string;
  azubiName: string;
  date: string;
  type: 'free' | 'timeframe';
  timeframe?: string;
  status: WishStatus;
}

const DUMMY_WISHES: Wish[] = [
  { id: '1', azubiName: 'Abraham T. Borbor Jr.', date: '14.04.2026', type: 'free', status: 'pending' },
  { id: '2', azubiName: 'Fatima Al-Hassan', date: '16.04.2026', type: 'timeframe', timeframe: '08:00 – 14:00', status: 'pending' },
  { id: '3', azubiName: 'Jana Müller', date: '17.04.2026', type: 'free', status: 'pending' },
  { id: '4', azubiName: 'Abraham T. Borbor Jr.', date: '21.04.2026', type: 'timeframe', timeframe: '06:00 – 13:00', status: 'pending' },
];

export default function WishesScreen() {
  const [wishes, setWishes] = useState<Wish[]>(DUMMY_WISHES);

  function setStatus(id: string, status: WishStatus) {
    setWishes(ws => ws.map(w => w.id === id ? { ...w, status } : w));
  }

  const pending = wishes.filter(w => w.status === 'pending').length;
  const approved = wishes.filter(w => w.status === 'approved').length;
  const rejected = wishes.filter(w => w.status === 'rejected').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Wunschbuch</Text>

        {/* Summary banner */}
        <View style={styles.banner}>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerNum}>{pending}</Text>
            <Text style={styles.bannerLabel}>Offen</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { color: '#059669' }]}>{approved}</Text>
            <Text style={styles.bannerLabel}>Genehmigt</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { color: '#DC2626' }]}>{rejected}</Text>
            <Text style={styles.bannerLabel}>Abgelehnt</Text>
          </View>
        </View>

        {/* Wish cards */}
        {wishes.map(w => (
          <View key={w.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{w.azubiName.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{w.azubiName}</Text>
                <Text style={styles.cardDate}>{w.date}</Text>
              </View>
              {w.status !== 'pending' && (
                <View style={[styles.statusBadge, w.status === 'approved' ? styles.badgeApproved : styles.badgeRejected]}>
                  <Text style={[styles.statusBadgeText, w.status === 'approved' ? styles.badgeApprovedText : styles.badgeRejectedText]}>
                    {w.status === 'approved' ? '✓ Genehmigt' : '✗ Abgelehnt'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.wishType}>
              {w.type === 'free' ? (
                <View style={styles.freeTag}>
                  <Text style={styles.freeTagText}>Freiwunsch</Text>
                </View>
              ) : (
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>⏱ {w.timeframe}</Text>
                </View>
              )}
            </View>

            {w.status === 'pending' && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => setStatus(w.id, 'approved')} activeOpacity={0.8}>
                  <Text style={styles.approveBtnText}>Genehmigen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => setStatus(w.id, 'rejected')} activeOpacity={0.8}>
                  <Text style={styles.rejectBtnText}>Ablehnen</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 16 },
  banner: {
    backgroundColor: BRAND.surface, borderRadius: 14, flexDirection: 'row',
    padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  bannerStat: { flex: 1, alignItems: 'center' },
  bannerNum: { fontSize: 26, fontWeight: '800', color: ADMIN_PURPLE },
  bannerLabel: { fontSize: 11, color: BRAND.textSecondary, fontWeight: '600', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: BRAND.border, marginHorizontal: 8 },
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EEEDFE', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: ADMIN_PURPLE },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  cardDate: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeApproved: { backgroundColor: '#D1FAE5' },
  badgeRejected: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  badgeApprovedText: { color: '#059669' },
  badgeRejectedText: { color: '#DC2626' },
  wishType: { marginBottom: 14 },
  freeTag: { backgroundColor: '#E1F5EE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  freeTagText: { fontSize: 13, fontWeight: '600', color: BRAND.primary },
  timeTag: { backgroundColor: '#EEEDFE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  timeTagText: { fontSize: 13, fontWeight: '600', color: ADMIN_PURPLE },
  btnRow: { flexDirection: 'row', columnGap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
});
