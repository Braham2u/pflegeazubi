import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../../constants/colors';
import { getAllAzubis } from '../../services/users';
import { inviteAzubi, NewAzubiData } from '../../services/invite';
import { User } from '../../types';

const YEAR_COLORS = ['#FAEEDA', '#EEEDFE', '#E1F5EE'];
const YEAR_TEXT_COLORS = ['#633806', ADMIN_PURPLE, BRAND.primary];

function Field({
  label, value, onChangeText, placeholder, keyboardType, hint,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; hint?: string;
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
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? <Text style={field.hint}>{hint}</Text> : null}
    </View>
  );
}

const EMPTY_FORM: NewAzubiData = {
  name: '', email: '', dateOfBirth: '',
  ausbildungYear: 1, contractedHoursPerWeek: 40, startDate: '', phone: '',
};

export default function TraineeListScreen() {
  const [azubis, setAzubis] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState<NewAzubiData>(EMPTY_FORM);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string; clockPin: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllAzubis();
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAzubis(list);
    } catch {
      // Firestore index not yet created — silent fail, list stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openInvite() {
    setForm(EMPTY_FORM);
    setInviteError('');
    setInviteResult(null);
    setShowInvite(true);
  }

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim() || !form.dateOfBirth.trim() || !form.startDate.trim()) {
      setInviteError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }
    setInviteError('');
    setInviting(true);
    try {
      const result = await inviteAzubi({ ...form, phone: form.phone?.trim() || undefined });
      setInviteResult({ email: form.email, tempPassword: result.tempPassword, clockPin: result.clockPin });
      load();
    } catch (e: any) {
      setInviteError(e.message ?? 'Fehler beim Einladen.');
    } finally {
      setInviting(false);
    }
  }

  function setField<K extends keyof NewAzubiData>(key: K, val: NewAzubiData[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Azubis</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={openInvite} activeOpacity={0.8}>
            <Text style={styles.inviteBtnText}>+ Einladen</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : azubis.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Noch keine Azubis</Text>
            <Text style={styles.emptyText}>
              Lade deine ersten Auszubildenden ein, damit sie sich in der App anmelden können.
            </Text>
          </View>
        ) : (
          azubis.map(az => (
            <TouchableOpacity key={az.id} style={styles.card} onPress={() => setSelected(az)} activeOpacity={0.8}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {az.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{az.name}</Text>
                <Text style={styles.email}>{az.email}</Text>
              </View>
              {az.ausbildungYear ? (
                <View style={[styles.yearBadge, { backgroundColor: YEAR_COLORS[(az.ausbildungYear - 1) % 3] }]}>
                  <Text style={[styles.yearText, { color: YEAR_TEXT_COLORS[(az.ausbildungYear - 1) % 3] }]}>
                    {az.ausbildungYear}. Jahr
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── Detail sheet ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetAvatar}>
                    <Text style={styles.sheetAvatarText}>
                      {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.sheetName}>{selected.name}</Text>
                    <Text style={styles.sheetEmail}>{selected.email}</Text>
                  </View>
                </View>
                {[
                  selected.ausbildungYear && { label: 'Ausbildungsjahr', value: `${selected.ausbildungYear}. Jahr` },
                  { label: 'Vertragsstunden', value: `${selected.contractedHoursPerWeek} Std./Woche` },
                  selected.dateOfBirth && { label: 'Geburtsdatum', value: selected.dateOfBirth },
                  selected.startDate && { label: 'Ausbildungsbeginn', value: selected.startDate },
                  selected.phone && { label: 'Telefon', value: selected.phone },
                ].filter(Boolean).map((row: any) => (
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

      {/* ── Invite modal ── */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { maxHeight: '92%' }]}>
              <View style={styles.sheetHandle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {inviteResult ? (
                  /* ── Success state ── */
                  <>
                    <View style={styles.successIcon}><Text style={{ fontSize: 36 }}>✓</Text></View>
                    <Text style={[styles.sheetName, { textAlign: 'center' }]}>Konto erstellt!</Text>
                    <Text style={[styles.inviteSubtitle, { textAlign: 'center' }]}>
                      Teile diese Zugangsdaten per WhatsApp oder SMS mit.
                    </Text>
                    <View style={styles.credBox}>
                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>E-Mail</Text>
                        <Text style={styles.credValue}>{inviteResult.email}</Text>
                      </View>
                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>Temp. Passwort</Text>
                        <Text style={styles.credValue}>{inviteResult.tempPassword}</Text>
                      </View>
                      <View style={[styles.credRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.credLabel}>Stempel-PIN</Text>
                        <Text style={[styles.credValue, { color: ADMIN_PURPLE, fontSize: 20, letterSpacing: 4 }]}>{inviteResult.clockPin}</Text>
                      </View>
                    </View>
                    <Text style={styles.credHint}>
                      Das Passwort kann jederzeit über "Passwort vergessen" geändert werden.
                    </Text>
                    <TouchableOpacity style={styles.sendBtn} onPress={() => setShowInvite(false)} activeOpacity={0.8}>
                      <Text style={styles.sendBtnText}>Fertig</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* ── Form state ── */
                  <>
                    <Text style={styles.sheetName}>Neuen Azubi einladen</Text>
                    <Text style={styles.inviteSubtitle}>
                      Nach dem Anlegen erhält die Person eine E-Mail mit einem Link zum Einrichten ihres Passworts.
                    </Text>

                    <Field label="Vollständiger Name *" value={form.name} onChangeText={v => setField('name', v)} placeholder="Vorname Nachname" keyboardType="default" />
                    <Field label="E-Mail-Adresse *" value={form.email} onChangeText={v => setField('email', v)} placeholder="name@beispiel.de" keyboardType="email-address" />
                    <Field label="Geburtsdatum *" value={form.dateOfBirth} onChangeText={v => setField('dateOfBirth', v)} placeholder="TT.MM.JJJJ" hint="Format: 15.03.2005" />
                    <Field label="Ausbildungsbeginn *" value={form.startDate} onChangeText={v => setField('startDate', v)} placeholder="TT.MM.JJJJ" hint="Format: 01.09.2024" />

                    <View style={field.wrap}>
                      <Text style={field.label}>Ausbildungsjahr *</Text>
                      <View style={styles.yearRow}>
                        {([1, 2, 3] as const).map(y => (
                          <TouchableOpacity
                            key={y}
                            style={[styles.yearPill, form.ausbildungYear === y && styles.yearPillActive]}
                            onPress={() => setField('ausbildungYear', y)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.yearPillText, form.ausbildungYear === y && styles.yearPillTextActive]}>
                              {y}. Jahr
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <Field
                      label="Vertragsstunden / Woche *"
                      value={form.contractedHoursPerWeek.toString()}
                      onChangeText={v => setField('contractedHoursPerWeek', parseInt(v) || 40)}
                      placeholder="40"
                      keyboardType="number-pad"
                    />
                    <Field label="Telefon (optional)" value={form.phone ?? ''} onChangeText={v => setField('phone', v)} placeholder="+49 123 456789" keyboardType="phone-pad" />

                    {inviteError ? <Text style={styles.inviteError}>{inviteError}</Text> : null}

                    <View style={styles.inviteBtns}>
                      <TouchableOpacity style={styles.cancelInviteBtn} onPress={() => setShowInvite(false)} activeOpacity={0.8}>
                        <Text style={styles.cancelInviteBtnText}>Abbrechen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.sendBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting} activeOpacity={0.8}>
                        {inviting
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={styles.sendBtnText}>Einladung senden</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const field = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: BRAND.background, borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: BRAND.textPrimary,
  },
  hint: { fontSize: 11, color: BRAND.textSecondary, marginTop: 4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary },
  inviteBtn: { backgroundColor: ADMIN_PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 20 },
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
  sheetName: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 },
  sheetEmail: { fontSize: 13, color: BRAND.textSecondary },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  detailLabel: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600' },
  detailValue: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '700' },
  inviteSubtitle: { fontSize: 13, color: BRAND.textSecondary, marginBottom: 20, lineHeight: 18 },
  yearRow: { flexDirection: 'row', columnGap: 10 },
  yearPill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: BRAND.border, alignItems: 'center',
  },
  yearPillActive: { borderColor: ADMIN_PURPLE, backgroundColor: ADMIN_PURPLE_LIGHT },
  yearPillText: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  yearPillTextActive: { color: ADMIN_PURPLE },
  inviteError: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  successIcon: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', alignSelf: 'center', marginBottom: 16 },
  credBox: { backgroundColor: BRAND.background, borderRadius: 12, marginVertical: 16, borderWidth: 1, borderColor: BRAND.border },
  credRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  credLabel: { fontSize: 12, color: BRAND.textSecondary, fontWeight: '600' },
  credValue: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '700', flex: 1, textAlign: 'right' },
  credHint: { fontSize: 12, color: BRAND.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  inviteBtns: { flexDirection: 'row', columnGap: 12, marginTop: 8, marginBottom: 8 },
  cancelInviteBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.background,
  },
  cancelInviteBtnText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  sendBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: ADMIN_PURPLE },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
