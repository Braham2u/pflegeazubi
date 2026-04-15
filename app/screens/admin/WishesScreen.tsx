import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND, ADMIN_PURPLE } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getAllWishes, updateWishStatus } from '../../services/wishes';
import { AvailabilityWish, WishReason } from '../../types';

const REASON_META: Record<WishReason, { label: string; icon: string; color: string; bg: string }> = {
  vacation: { label: 'Urlaub',    icon: '🏖',  color: '#0369A1', bg: '#E0F2FE' },
  sick:     { label: 'Krank',     icon: '🤒',  color: '#B45309', bg: '#FEF3C7' },
  other:    { label: 'Sonstiges', icon: '📝',  color: '#6B7280', bg: '#F3F4F6' },
};

export default function WishesScreen() {
  const { userProfile } = useAuth();
  const [wishes, setWishes] = useState<AvailabilityWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadWishes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllWishes();
      setWishes(data);
    } catch {
      setWishes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWishes(); }, [loadWishes]);

  async function handleStatus(id: string, status: 'approved' | 'rejected') {
    if (!userProfile) return;
    setUpdating(id);
    try {
      await updateWishStatus(id, status, userProfile.name);
      setWishes(ws => ws.map(w => w.id === id ? { ...w, status } : w));
    } catch {
      // silent — wish stays pending
    } finally {
      setUpdating(null);
    }
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
            <Text style={styles.bannerNum}>{loading ? '–' : pending}</Text>
            <Text style={styles.bannerLabel}>Offen</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { color: '#059669' }]}>{loading ? '–' : approved}</Text>
            <Text style={styles.bannerLabel}>Genehmigt</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { color: '#DC2626' }]}>{loading ? '–' : rejected}</Text>
            <Text style={styles.bannerLabel}>Abgelehnt</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : wishes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✋</Text>
            <Text style={styles.emptyTitle}>Keine Wünsche</Text>
            <Text style={styles.emptyText}>Sobald Azubis Wünsche einreichen, erscheinen sie hier.</Text>
          </View>
        ) : (
          wishes.map(w => {
            const isFree = w.wishFree;
            const timeframe = !isFree && w.timeWindows.length > 0
              ? w.timeWindows.map(tw => `${tw.start} – ${tw.end}`).join(', ')
              : null;
            const isUpdating = updating === w.id;

            return (
              <View key={w.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>
                      {w.azubiName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
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
                  {isFree ? (
                    <View style={styles.tagRow}>
                      <View style={styles.freeTag}>
                        <Text style={styles.freeTagText}>Freiwunsch</Text>
                      </View>
                      {w.reason && (() => {
                        const meta = REASON_META[w.reason];
                        return (
                          <View style={[styles.reasonTag, { backgroundColor: meta.bg }]}>
                            <Text style={styles.reasonTagText}>{meta.icon} </Text>
                            <Text style={[styles.reasonTagText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  ) : timeframe ? (
                    <View style={styles.timeTag}>
                      <Text style={styles.timeTagText}>⏱ {timeframe}</Text>
                    </View>
                  ) : null}
                  {w.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>💬 {w.note}</Text>
                    </View>
                  ) : null}
                </View>

                {w.status === 'pending' && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isUpdating && { opacity: 0.5 }]}
                      onPress={() => handleStatus(w.id, 'approved')}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      {isUpdating
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.approveBtnText}>Genehmigen</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, isUpdating && { opacity: 0.5 }]}
                      onPress={() => handleStatus(w.id, 'rejected')}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      {isUpdating
                        ? <ActivityIndicator color="#DC2626" size="small" />
                        : <Text style={styles.rejectBtnText}>Ablehnen</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
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
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 20 },
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  freeTag: { backgroundColor: '#E1F5EE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  freeTagText: { fontSize: 13, fontWeight: '600', color: BRAND.primary },
  reasonTag: { flexDirection: 'row', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  reasonTagText: { fontSize: 13, fontWeight: '600' },
  noteBox: { backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderLeftWidth: 3, borderLeftColor: BRAND.border },
  noteText: { fontSize: 13, color: BRAND.textSecondary, lineHeight: 18 },
  timeTag: { backgroundColor: '#EEEDFE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  timeTagText: { fontSize: 13, fontWeight: '600', color: ADMIN_PURPLE },
  btnRow: { flexDirection: 'row', columnGap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
});
