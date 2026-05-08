import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../../constants/colors';
import { listSubAdmins, deleteUserProfile } from '../../services/users';
import { inviteSubAdmin, NewSubAdminData } from '../../services/invite';
import { LOCATIONS } from '../../data/sharedPlanStore';
import { User } from '../../types';

const FACILITY_OPTIONS = LOCATIONS.filter(l => !l.isSchool);

const EMPTY_FORM: NewSubAdminData = { name: '', email: '', primaryFacilityId: '' };

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any;
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
    </View>
  );
}

export default function SubAdminListScreen() {
  const navigation = useNavigation();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState<NewSubAdminData>(EMPTY_FORM);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSubAdmins();
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAdmins(list);
    } catch {
      // silent
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
    if (!form.name.trim() || !form.email.trim() || !form.primaryFacilityId) {
      setInviteError('Bitte alle Felder ausfüllen und einen Standort wählen.');
      return;
    }
    setInviteError('');
    setInviting(true);
    try {
      const result = await inviteSubAdmin(form);
      setInviteResult({ email: form.email, tempPassword: result.tempPassword });
      load();
    } catch (e: any) {
      setInviteError(e.message ?? 'Fehler beim Einladen.');
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete(admin: User) {
    try {
      await deleteUserProfile(admin.id);
      load();
    } catch { /* ignore */ }
  }

  const facilityLabel = (id: string) => {
    const loc = FACILITY_OPTIONS.find(l => l.id === id);
    return loc ? `${loc.facility} · ${loc.unit}` : id;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹ Zurück</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sub-Admins</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={openInvite} activeOpacity={0.8}>
            <Text style={styles.inviteBtnText}>+ Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Sub-Admins können Dienste planen und Anwesenheiten sehen — nur für ihren Standort.
        </Text>

        {loading ? (
          <ActivityIndicator color={ADMIN_PURPLE} style={{ marginTop: 40 }} />
        ) : admins.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>Noch keine Sub-Admins</Text>
            <Text style={styles.emptyText}>
              Füge Schichtleitungen hinzu, damit sie Dienste für ihren Standort planen können.
            </Text>
          </View>
        ) : (
          admins.map(admin => (
            <View key={admin.id} style={styles.card}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {admin.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{admin.name}</Text>
                <Text style={styles.email}>{admin.email}</Text>
                {admin.primaryFacilityId ? (
                  <Text style={styles.facility}>📍 {facilityLabel(admin.primaryFacilityId)}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(admin)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>Entfernen</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Invite modal ── */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowInvite(false)}>
            <TouchableOpacity style={[styles.sheet, { maxHeight: '85%' }]} activeOpacity={1} onPress={e => e.stopPropagation?.()}>
              <View style={styles.sheetTop}>
                <View style={styles.sheetHandle} />
                <TouchableOpacity onPress={() => setShowInvite(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {inviteResult ? (
                  <>
                    <View style={styles.successIcon}><Text style={{ fontSize: 36 }}>✓</Text></View>
                    <Text style={styles.sheetName}>Sub-Admin erstellt!</Text>
                    <Text style={styles.subtitle}>
                      Eine E-Mail mit einem Passwort-Link wurde an {inviteResult.email} gesendet.
                      Falls keine E-Mail ankommt (Spam prüfen!), nutze das temporäre Passwort unten.
                    </Text>
                    <View style={styles.credBox}>
                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>E-Mail</Text>
                        <Text style={styles.credValue}>{inviteResult.email}</Text>
                      </View>
                      <View style={[styles.credRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.credLabel}>Temp. Passwort (Backup)</Text>
                        <Text style={styles.credValue}>{inviteResult.tempPassword}</Text>
                      </View>
                    </View>
                    <Text style={styles.credHint}>
                      Das Passwort kann jederzeit über "Passwort vergessen" auf der Login-Seite geändert werden.
                    </Text>
                    <TouchableOpacity style={styles.sendBtn} onPress={() => setShowInvite(false)} activeOpacity={0.8}>
                      <Text style={styles.sendBtnText}>Fertig</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.sheetName}>Sub-Admin einladen</Text>
                    <Text style={styles.subtitle}>
                      Die Person erhält per E-Mail einen Link zum Einrichten ihres Passworts.
                    </Text>

                    <Field
                      label="Vollständiger Name *"
                      value={form.name}
                      onChangeText={v => setForm(f => ({ ...f, name: v }))}
                      placeholder="Vorname Nachname"
                    />
                    <Field
                      label="E-Mail-Adresse *"
                      value={form.email}
                      onChangeText={v => setForm(f => ({ ...f, email: v }))}
                      placeholder="name@beispiel.de"
                      keyboardType="email-address"
                    />

                    <View style={field.wrap}>
                      <Text style={field.label}>Standort *</Text>
                      {FACILITY_OPTIONS.map(loc => (
                        <TouchableOpacity
                          key={loc.id}
                          style={[styles.locOption, form.primaryFacilityId === loc.id && styles.locOptionActive]}
                          onPress={() => setForm(f => ({ ...f, primaryFacilityId: loc.id }))}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.locOptionIcon}>{loc.icon}</Text>
                          <View style={styles.locOptionInfo}>
                            <Text style={[styles.locOptionFacility, form.primaryFacilityId === loc.id && styles.locOptionFacilityActive]}>
                              {loc.facility}
                            </Text>
                            <Text style={styles.locOptionUnit}>{loc.unit}</Text>
                          </View>
                          {form.primaryFacilityId === loc.id && (
                            <Text style={styles.locOptionCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {inviteError ? <Text style={styles.inviteError}>{inviteError}</Text> : null}

                    <View style={styles.inviteBtns}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInvite(false)} activeOpacity={0.8}>
                        <Text style={styles.cancelBtnText}>Abbrechen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.sendBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting} activeOpacity={0.8}>
                        {inviting
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={styles.sendBtnText}>Einladen</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
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
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { paddingRight: 12 },
  backBtnText: { fontSize: 16, color: ADMIN_PURPLE, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, flex: 1 },
  inviteBtn: { backgroundColor: ADMIN_PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 13, color: BRAND.textSecondary, marginBottom: 20, lineHeight: 18 },
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
  facility: { fontSize: 11, color: ADMIN_PURPLE, marginTop: 3, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BRAND.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48 },
  sheetTop: { alignItems: 'center', marginBottom: 16 },
  sheetHandle: { width: 40, height: 4, backgroundColor: BRAND.border, borderRadius: 2, alignSelf: 'center', marginBottom: 0 },
  closeBtn: { position: 'absolute', right: 0, top: -8, padding: 8 },
  closeBtnText: { fontSize: 18, color: BRAND.textSecondary, fontWeight: '600' },
  sheetName: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: BRAND.textSecondary, marginBottom: 20, lineHeight: 18 },

  locOption: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    borderWidth: 1.5, borderColor: BRAND.border, padding: 14, marginBottom: 10,
  },
  locOptionActive: { borderColor: ADMIN_PURPLE, backgroundColor: ADMIN_PURPLE_LIGHT },
  locOptionIcon: { fontSize: 20, marginRight: 12 },
  locOptionInfo: { flex: 1 },
  locOptionFacility: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  locOptionFacilityActive: { color: ADMIN_PURPLE },
  locOptionUnit: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  locOptionCheck: { fontSize: 16, color: ADMIN_PURPLE, fontWeight: '700' },

  inviteError: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  inviteBtns: { flexDirection: 'row', columnGap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.border, backgroundColor: BRAND.background,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  sendBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: ADMIN_PURPLE },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  successIcon: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', alignSelf: 'center', marginBottom: 16 },
  credBox: { backgroundColor: BRAND.background, borderRadius: 12, marginVertical: 16, borderWidth: 1, borderColor: BRAND.border },
  credRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  credLabel: { fontSize: 12, color: BRAND.textSecondary, fontWeight: '600' },
  credValue: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '700', flex: 1, textAlign: 'right' },
  credHint: { fontSize: 12, color: BRAND.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
});
