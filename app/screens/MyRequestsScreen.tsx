import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getMyRequests, deleteRequest } from '../services/placementRequests';
import { PlacementRequest, PlacementRequestStatus } from '../types';

const STATUS_LABELS: Record<PlacementRequestStatus, { de: string; en: string }> = {
  pending:  { de: 'Ausstehend', en: 'Pending' },
  approved: { de: 'Genehmigt',  en: 'Approved' },
  rejected: { de: 'Abgelehnt', en: 'Rejected' },
};

const STATUS_COLORS: Record<PlacementRequestStatus, { color: string; bg: string }> = {
  pending:  { color: '#92400E', bg: '#FEF3C7' },
  approved: { color: '#065F46', bg: '#D1FAE5' },
  rejected: { color: '#991B1B', bg: '#FEE2E2' },
};

export default function MyRequestsScreen() {
  const navigation      = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t, lang }     = useLang();
  const [requests,       setRequests]       = useState<PlacementRequest[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting,        setDeleting]        = useState(false);

  const load = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      setRequests(await getMyRequests(userProfile.id));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function confirmDelete(id: string) {
    setDeleting(true);
    try {
      await deleteRequest(id);
      setConfirmDeleteId(null);
      load();
    } catch {
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  function displayMonth(yyyyMm: string): string {
    const [year, month] = yyyyMm.split('-');
    return `${t.months[parseInt(month) - 1]} ${year}`;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.title}>{t.placementRequest.myRequests}</Text>

        <TouchableOpacity
          style={s.newBtn}
          onPress={() => navigation.navigate('facilities')}
          activeOpacity={0.8}
        >
          <Text style={s.newBtnText}>{t.placementRequest.newRequest}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>{t.placementRequest.noRequests}</Text>
            <Text style={s.emptyHint}>{t.placementRequest.noRequestsHint}</Text>
          </View>
        ) : (
          requests.map(r => {
            const col    = STATUS_COLORS[r.status];
            const label  = STATUS_LABELS[r.status][lang];
            return (
              <View key={r.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.facilityName} numberOfLines={1}>{r.facilityName}</Text>
                  <View style={[s.badge, { backgroundColor: col.bg }]}>
                    <Text style={[s.badgeText, { color: col.color }]}>{label}</Text>
                  </View>
                </View>
                <View style={s.cardBottom}>
                  <Text style={s.period}>
                    {displayMonth(r.startMonth)} – {displayMonth(r.endMonth)}
                  </Text>
                  {confirmDeleteId === r.id ? (
                    <View style={s.confirmRow}>
                      <TouchableOpacity
                        onPress={() => setConfirmDeleteId(null)}
                        style={s.cancelDelBtn}
                        activeOpacity={0.7}
                        disabled={deleting}
                      >
                        <Text style={s.cancelDelText}>{lang === 'de' ? 'Nein' : 'No'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(r.id)}
                        style={s.confirmDelBtn}
                        activeOpacity={0.7}
                        disabled={deleting}
                      >
                        <Text style={s.confirmDelText}>{deleting ? '…' : (lang === 'de' ? 'Ja, löschen' : 'Yes, delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setConfirmDeleteId(r.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={s.deleteBtn}>{lang === 'de' ? 'Löschen' : 'Delete'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {r.adminResponse ? (
                  <Text style={s.adminResponse}>💬 {r.adminResponse}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title:  { fontSize: 26, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 16 },
  newBtn: {
    backgroundColor: BRAND.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 24,
  },
  newBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptyHint:  { fontSize: 13, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 18 },
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  facilityName: { flex: 1, fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, marginRight: 8 },
  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:    { fontSize: 12, fontWeight: '700' },
  cardBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period:        { fontSize: 13, color: BRAND.textSecondary, flex: 1, marginRight: 8 },
  deleteBtn:     { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  confirmRow:    { flexDirection: 'row', columnGap: 8, alignItems: 'center' },
  cancelDelBtn:  { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: BRAND.border },
  cancelDelText: { fontSize: 12, fontWeight: '600', color: BRAND.textSecondary },
  confirmDelBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FEE2E2' },
  confirmDelText:{ fontSize: 12, fontWeight: '700', color: '#991B1B' },
  adminResponse:{ fontSize: 12, color: BRAND.textSecondary, marginTop: 8, lineHeight: 16, fontStyle: 'italic' },
});
