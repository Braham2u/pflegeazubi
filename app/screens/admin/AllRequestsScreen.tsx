import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE } from '../../constants/colors';
import { useLang } from '../../context/LanguageContext';
import { getAllPlacementRequests, respondToRequest } from '../../services/placementRequests';
import { PlacementRequest } from '../../types';

const STATUS = {
  pending:  { label: 'Ausstehend', color: '#92400E', bg: '#FEF3C7' },
  approved: { label: 'Genehmigt',  color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Abgelehnt', color: '#991B1B', bg: '#FEE2E2' },
};

function RequestCard({ r, displayMonth, onPress }: {
  r: PlacementRequest;
  displayMonth: (s: string) => string;
  onPress?: () => void;
}) {
  const cfg = STATUS[r.status];
  return (
    <TouchableOpacity
      style={cs.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={cs.top}>
        <View style={{ flex: 1 }}>
          <Text style={cs.trainee}>{r.traineeName}</Text>
          <Text style={cs.facility}>{r.facilityName}</Text>
        </View>
        <View style={[cs.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[cs.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={cs.period}>{displayMonth(r.startMonth)} – {displayMonth(r.endMonth)}</Text>
      {r.adminResponse ? <Text style={cs.response}>💬 {r.adminResponse}</Text> : null}
      {r.status === 'pending' && onPress && (
        <Text style={cs.tapHint}>Tippen zum Antworten →</Text>
      )}
    </TouchableOpacity>
  );
}

export default function AllRequestsScreen() {
  const navigation = useNavigation<any>();
  const { t }      = useLang();
  const [requests,   setRequests]   = useState<PlacementRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<PlacementRequest | null>(null);
  const [response,   setResponse]   = useState('');
  const [responding, setResponding] = useState(false);
  const [respErr,    setRespErr]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await getAllPlacementRequests());
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRespond(status: 'approved' | 'rejected') {
    if (!selected) return;
    setRespErr('');
    setResponding(true);
    try {
      await respondToRequest(selected.id, status, response.trim() || undefined);
      setSelected(null);
      setResponse('');
      load();
    } catch (e: any) {
      setRespErr(e.message ?? 'Fehler beim Speichern');
    } finally {
      setResponding(false);
    }
  }

  function openSheet(r: PlacementRequest) {
    setSelected(r);
    setResponse('');
    setRespErr('');
  }

  function displayMonth(yyyyMm: string): string {
    const [year, month] = yyyyMm.split('-');
    return `${t.months[parseInt(month) - 1]} ${year}`;
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.back}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={s.backText}>‹ Dashboard</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t.placementRequest.adminTitle}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>Keine Anfragen</Text>
            <Text style={s.emptyHint}>Azubis können Einsätze bei Einrichtungen anfragen.</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Ausstehend ({pending.length})</Text>
                {pending.map(r => (
                  <RequestCard key={r.id} r={r} displayMonth={displayMonth} onPress={() => openSheet(r)} />
                ))}
              </>
            )}
            {resolved.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Abgeschlossen</Text>
                {resolved.map(r => (
                  <RequestCard key={r.id} r={r} displayMonth={displayMonth} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <TouchableOpacity
            style={s.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={s.handle} />
            {selected && (
              <>
                <Text style={s.sheetTrainee}>{selected.traineeName}</Text>
                <Text style={s.sheetFacility}>{selected.facilityName}</Text>
                <Text style={s.sheetPeriod}>
                  {displayMonth(selected.startMonth)} – {displayMonth(selected.endMonth)}
                </Text>
                {selected.note ? (
                  <Text style={s.sheetNote}>📝 {selected.note}</Text>
                ) : null}

                <Text style={s.responseLabel}>Antwort (optional)</Text>
                <TextInput
                  style={s.responseInput}
                  value={response}
                  onChangeText={setResponse}
                  placeholder="Nachricht an den Azubi..."
                  placeholderTextColor={BRAND.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {respErr ? <Text style={s.errText}>{respErr}</Text> : null}

                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[s.rejectBtn, responding && { opacity: 0.6 }]}
                    onPress={() => handleRespond('rejected')}
                    disabled={responding}
                    activeOpacity={0.8}
                  >
                    {responding
                      ? <ActivityIndicator color="#991B1B" />
                      : <Text style={s.rejectBtnText}>Ablehnen</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, responding && { opacity: 0.6 }]}
                    onPress={() => handleRespond('approved')}
                    disabled={responding}
                    activeOpacity={0.8}
                  >
                    {responding
                      ? <ActivityIndicator color="#065F46" />
                      : <Text style={s.approveBtnText}>Genehmigen</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  top:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  trainee:  { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  facility: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  badge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText:{ fontSize: 12, fontWeight: '700' },
  period:   { fontSize: 13, color: BRAND.textSecondary },
  response: { fontSize: 12, color: BRAND.textSecondary, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },
  tapHint:  { fontSize: 11, color: BRAND.primary, marginTop: 6, fontWeight: '600' },
});

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back:     { paddingVertical: 10, paddingRight: 12 },
  backText: { fontSize: 15, color: ADMIN_PURPLE, fontWeight: '600' },
  title:    { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: BRAND.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8,
  },
  empty:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle:{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: BRAND.textSecondary, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:   {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 48,
  },
  handle:        { width: 40, height: 4, backgroundColor: BRAND.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTrainee:  { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 },
  sheetFacility: { fontSize: 14, color: BRAND.textSecondary, marginBottom: 4 },
  sheetPeriod:   { fontSize: 13, color: BRAND.primary, fontWeight: '600', marginBottom: 10 },
  sheetNote:     { fontSize: 13, color: BRAND.textSecondary, marginBottom: 16, lineHeight: 18 },
  responseLabel: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 8 },
  responseInput: {
    backgroundColor: BRAND.background, borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: BRAND.textPrimary,
    minHeight: 80, marginBottom: 16,
  },
  errText:      { color: '#DC2626', fontSize: 12, marginBottom: 8 },
  btnRow:       { flexDirection: 'row', columnGap: 12 },
  rejectBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#FEE2E2' },
  rejectBtnText:{ fontSize: 15, fontWeight: '700', color: '#991B1B' },
  approveBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#D1FAE5' },
  approveBtnText:{ fontSize: 15, fontWeight: '700', color: '#065F46' },
});
