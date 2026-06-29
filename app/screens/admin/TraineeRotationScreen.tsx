import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../../constants/colors';
import { getRotationsForAzubi, addRotation, deleteRotation, rotationStatus } from '../../services/rotations';
import { Rotation, FacilityType } from '../../types';

const TYPE_OPTIONS: { value: FacilityType; label: string; icon: string }[] = [
  { value: 'hospital',   label: 'Krankenhaus',       icon: '🏥' },
  { value: 'careHome',   label: 'Pflegeheim',         icon: '🏠' },
  { value: 'ambulatory', label: 'Ambulanter Dienst',  icon: '🚑' },
  { value: 'school',     label: 'Berufsschule',       icon: '🎓' },
  { value: 'other',      label: 'Sonstiges',          icon: '📍' },
];

const STATUS_CONFIG = {
  completed: { label: 'Abgeschlossen', color: '#6B7280', bg: '#F3F4F6' },
  current:   { label: 'Aktuell',       color: '#065F46', bg: '#D1FAE5' },
  upcoming:  { label: 'Bevorstehend',  color: '#1D4ED8', bg: '#DBEAFE' },
};

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function Field({
  label, value, onChangeText, placeholder, hint,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}</Text>
      <TextInput
        style={field.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={BRAND.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? <Text style={field.hint}>{hint}</Text> : null}
    </View>
  );
}

type FormState = {
  facilityName: string;
  unitName: string;
  facilityType: FacilityType;
  startDate: string;
  endDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  facilityName: '',
  unitName: '',
  facilityType: 'careHome',
  startDate: '',
  endDate: '',
  notes: '',
};

export default function TraineeRotationScreen() {
  const navigation  = useNavigation();
  const route       = useRoute<any>();
  const { azubiId, azubiName } = route.params as { azubiId: string; azubiName: string };

  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRotationsForAzubi(azubiId);
      setRotations(data);
    } catch {
      setRotations([]);
    } finally {
      setLoading(false);
    }
  }, [azubiId]);

  React.useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!form.facilityName.trim() || !form.startDate.trim() || !form.endDate.trim()) {
      setError('Bitte Einrichtung, Start- und Enddatum ausfüllen.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addRotation({
        azubiId,
        facilityName: form.facilityName.trim(),
        unitName: form.unitName.trim() || undefined,
        facilityType: form.facilityType,
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        notes: form.notes.trim() || undefined,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRotation(id);
      load();
    } catch { /* ignore */ }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹ Zurück</Text>
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Rotationsplan</Text>
            <Text style={styles.subtitle}>{azubiName}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_FORM); setError(''); setShowAdd(true); }} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Einsatz</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={ADMIN_PURPLE} style={{ marginTop: 40 }} />
        ) : rotations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyTitle}>Noch kein Rotationsplan</Text>
            <Text style={styles.emptyText}>Füge die Ausbildungseinsätze für {azubiName} hinzu.</Text>
          </View>
        ) : (
          rotations.map((r, index) => {
            const status = rotationStatus(r);
            const cfg    = STATUS_CONFIG[status];
            const isLast = index === rotations.length - 1;
            const typeOpt = TYPE_OPTIONS.find(t => t.value === r.facilityType);
            return (
              <View key={r.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                  {!isLast && <View style={styles.line} />}
                </View>
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.deleteBtn} activeOpacity={0.7}>
                      <Text style={styles.deleteBtnText}>Entfernen</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.facilityRow}>
                    <Text style={styles.facilityIcon}>{typeOpt?.icon ?? '📍'}</Text>
                    <View>
                      <Text style={styles.facilityName}>{r.facilityName}</Text>
                      {r.unitName ? <Text style={styles.unitName}>{r.unitName}</Text> : null}
                      <Text style={styles.typeLabel}>{typeOpt?.label ?? r.facilityType}</Text>
                    </View>
                  </View>
                  <Text style={styles.dates}>{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</Text>
                  {r.notes ? <Text style={styles.notes}>📝 {r.notes}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Add modal ── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
            <TouchableOpacity style={[styles.sheet, { maxHeight: '90%' }]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
              <View style={styles.sheetTop}>
                <View style={styles.handle} />
                <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetTitle}>Neuen Einsatz hinzufügen</Text>

                <Field label="Einrichtungsname *" value={form.facilityName} onChangeText={v => setForm(f => ({ ...f, facilityName: v }))} placeholder="z. B. Caritas St. Konrad" />
                <Field label="Abteilung / Bereich" value={form.unitName} onChangeText={v => setForm(f => ({ ...f, unitName: v }))} placeholder="z. B. Wohnbereich 2" />

                <View style={field.wrap}>
                  <Text style={field.label}>Einsatztyp *</Text>
                  <View style={styles.typeGrid}>
                    {TYPE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.typeOption, form.facilityType === opt.value && styles.typeOptionActive]}
                        onPress={() => setForm(f => ({ ...f, facilityType: opt.value }))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.typeOptionIcon}>{opt.icon}</Text>
                        <Text style={[styles.typeOptionLabel, form.facilityType === opt.value && styles.typeOptionLabelActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Field label="Startdatum *" value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="JJJJ-MM-TT" hint="Format: 2024-09-01" />
                <Field label="Enddatum *" value={form.endDate} onChangeText={v => setForm(f => ({ ...f, endDate: v }))} placeholder="JJJJ-MM-TT" hint="Format: 2025-02-28" />
                <Field label="Notizen (optional)" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Besonderheiten, Ansprechpartner …" />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving} activeOpacity={0.8}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Speichern</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const field = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: BRAND.background, borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: BRAND.textPrimary,
  },
  hint:  { fontSize: 11, color: BRAND.textSecondary, marginTop: 4 },
});

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: BRAND.background },
  scroll:   { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn:  { paddingRight: 12 },
  backBtnText: { fontSize: 16, color: ADMIN_PURPLE, fontWeight: '600' },
  titleBlock: { flex: 1 },
  title:    { fontSize: 20, fontWeight: '800', color: BRAND.textPrimary },
  subtitle: { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  addBtn:   { backgroundColor: ADMIN_PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 20 },

  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 28, marginTop: 8 },
  dot:  { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  line: { width: 2, flex: 1, backgroundColor: BRAND.border, marginTop: 4, marginBottom: -8 },

  card: {
    flex: 1, backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 14, marginLeft: 12, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  facilityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  facilityIcon: { fontSize: 24, marginRight: 10, marginTop: 2 },
  facilityName: { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary },
  unitName: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  typeLabel: { fontSize: 12, color: ADMIN_PURPLE, fontWeight: '600', marginTop: 3 },
  dates: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600', marginBottom: 4 },
  notes: { fontSize: 12, color: BRAND.textSecondary, marginTop: 4, lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: BRAND.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48 },
  sheetTop:{ alignItems: 'center', marginBottom: 16 },
  handle:  { width: 40, height: 4, backgroundColor: BRAND.border, borderRadius: 2, alignSelf: 'center' },
  closeBtn:{ position: 'absolute', right: 0, top: -8, padding: 8 },
  closeBtnText: { fontSize: 18, color: BRAND.textSecondary, fontWeight: '600' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', columnGap: 6,
    borderWidth: 1.5, borderColor: BRAND.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  typeOptionActive: { borderColor: ADMIN_PURPLE, backgroundColor: ADMIN_PURPLE_LIGHT },
  typeOptionIcon:   { fontSize: 16 },
  typeOptionLabel:  { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  typeOptionLabelActive: { color: ADMIN_PURPLE },

  error: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', columnGap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.background,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: ADMIN_PURPLE },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
