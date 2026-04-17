import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BRAND, ADMIN_PURPLE, ADMIN_PURPLE_LIGHT } from '../constants/colors';
import { Lang } from '../i18n';

// ── Small building blocks ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.infoRow}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SettingsRow({
  label, value, onPress, danger,
}: { label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={st.settingsRow} onPress={onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Text style={[st.settingsLabel, danger && st.settingsDanger]}>{label}</Text>
      <View style={st.settingsRight}>
        {value ? <Text style={st.settingsValue}>{value}</Text> : null}
        {!danger && <Text style={st.settingsChevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { t, lang, setLang } = useLang();
  const { userProfile, logoutAll } = useAuth();

  const [pinVisible,     setPinVisible]     = useState(false);
  const [confirmLogout,  setConfirmLogout]  = useState(false);
  const [langModal,      setLangModal]      = useState(false);
  const [pwModal,        setPwModal]        = useState(false);
  const [pwStatus,       setPwStatus]       = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const name     = userProfile?.name ?? '—';
  const email    = userProfile?.email ?? '—';
  const role     = userProfile?.role ?? 'azubi';
  const clockPin = (userProfile as any)?.clockPin as string | undefined;
  const facility = (userProfile as any)?.facilityName as string | undefined;

  // "Borbor Jr, Abraham (Azubi)" — surname-first style like the McD app
  const displayName = `${name} (${role === 'admin' ? 'Admin' : 'Azubi'})`;

  // Two initials from name parts
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const languages: { code: Lang; abbr: string; label: string }[] = [
    { code: 'de', abbr: 'DE', label: 'Deutsch' },
    { code: 'en', abbr: 'EN', label: 'English' },
  ];
  const currentLang = languages.find(l => l.code === lang) ?? languages[0];

  const sendPasswordReset = async () => {
    if (!auth || !email) return;
    setPwStatus('sending');
    try {
      await sendPasswordResetEmail(auth, email);
      setPwStatus('sent');
    } catch {
      setPwStatus('error');
    }
  };

  const isAdmin = role === 'admin';
  const accentColor = isAdmin ? ADMIN_PURPLE : BRAND.primary;
  const accentLight = isAdmin ? ADMIN_PURPLE_LIGHT : BRAND.primaryLight;

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile header ── */}
        <View style={st.header}>
          <View style={[st.avatar, { borderColor: accentColor, backgroundColor: accentLight }]}>
            <Text style={[st.avatarText, { color: accentColor }]}>{initials}</Text>
          </View>
          <Text style={st.displayName}>{displayName}</Text>
        </View>

        {/* ── Information section ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Information</Text>
          <InfoRow label="E-Mail-Adresse" value={email} />
          {facility && (
            <InfoRow label="Einrichtung" value={facility} />
          )}
          {userProfile?.primaryFacilityId && (
            <InfoRow label="Standort-ID" value={userProfile.primaryFacilityId} />
          )}
          {userProfile?.ausbildungYear && (
            <InfoRow label="Ausbildungsjahr" value={`${userProfile.ausbildungYear}. Jahr`} />
          )}
          {userProfile?.contractedHoursPerWeek && (
            <InfoRow label="Vertragsstunden" value={`${userProfile.contractedHoursPerWeek}h / Woche`} />
          )}
          {userProfile?.startDate && (
            <InfoRow label="Ausbildungsbeginn" value={userProfile.startDate} />
          )}
        </View>

        {/* ── Stempeluhr-PIN button (azubi only) ── */}
        {!isAdmin && clockPin && (
          <TouchableOpacity
            style={[st.pinBtn, { backgroundColor: accentColor }]}
            onPress={() => setPinVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={st.pinBtnIcon}>⠿</Text>
            <Text style={st.pinBtnText}>Stempeluhr-PIN anzeigen</Text>
          </TouchableOpacity>
        )}

        {/* ── Settings section ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Einstellungen</Text>
          {!isAdmin && (
            <SettingsRow
              label="Sprache"
              value={`${currentLang.abbr}  ${currentLang.label}`}
              onPress={() => setLangModal(true)}
            />
          )}
          <SettingsRow
            label="Passwort ändern"
            onPress={() => { setPwStatus('idle'); setPwModal(true); }}
          />
          <SettingsRow
            label={t.account.logout}
            onPress={() => setConfirmLogout(true)}
            danger
          />
        </View>

      </ScrollView>

      {/* ── PIN modal ── */}
      <Modal visible={pinVisible} transparent animationType="fade" onRequestClose={() => setPinVisible(false)}>
        <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setPinVisible(false)}>
          <View style={st.pinCard}>
            <Text style={st.pinCardTitle}>Dein Stempeluhr-PIN</Text>
            <Text style={[st.pinDigits, { color: accentColor }]}>{clockPin}</Text>
            <Text style={st.pinHint}>Gib diesen PIN am Stempelgerät ein, um deine Arbeitszeit zu erfassen.</Text>
            <TouchableOpacity style={[st.pinCloseBtn, { backgroundColor: accentColor }]} onPress={() => setPinVisible(false)}>
              <Text style={st.pinCloseBtnText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Language picker modal ── */}
      <Modal visible={langModal} transparent animationType="slide" onRequestClose={() => setLangModal(false)}>
        <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setLangModal(false)}>
          <View style={st.langSheet}>
            <Text style={st.langSheetTitle}>Sprache wählen</Text>
            {languages.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[st.langRow, lang === l.code && { backgroundColor: accentLight }]}
                onPress={() => { setLang(l.code); setLangModal(false); }}
                activeOpacity={0.7}
              >
                <View style={[st.langAbbrBadge, lang === l.code && { backgroundColor: accentColor }]}>
                  <Text style={[st.langAbbr, lang === l.code && { color: '#fff' }]}>{l.abbr}</Text>
                </View>
                <Text style={[st.langLabel, lang === l.code && { color: accentColor, fontWeight: '700' }]}>{l.label}</Text>
                {lang === l.code && <Text style={[st.langCheck, { color: accentColor }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Password reset modal ── */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <View style={st.overlay}>
          <View style={st.confirmCard}>
            <Text style={st.pwTitle}>Passwort ändern</Text>
            {pwStatus === 'idle' && (
              <>
                <Text style={st.pwBody}>
                  Wir senden dir eine E-Mail an{'\n'}
                  <Text style={{ fontWeight: '700', color: BRAND.textPrimary }}>{email}</Text>
                  {'\n'}mit einem Link zum Zurücksetzen deines Passworts.
                </Text>
                <View style={st.confirmBtns}>
                  <TouchableOpacity onPress={() => setPwModal(false)} style={[st.confirmBtn, st.cancelBtn]}>
                    <Text style={st.cancelBtnText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sendPasswordReset} style={[st.confirmBtn, { backgroundColor: accentColor }]}>
                    <Text style={st.logoutConfirmText}>E-Mail senden</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {pwStatus === 'sending' && <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />}
            {pwStatus === 'sent' && (
              <>
                <Text style={st.pwBody}>✓ E-Mail wurde gesendet. Prüfe deinen Posteingang.</Text>
                <TouchableOpacity onPress={() => setPwModal(false)} style={[st.confirmBtn, { backgroundColor: accentColor, alignSelf: 'stretch', marginTop: 16 }]}>
                  <Text style={st.logoutConfirmText}>Schließen</Text>
                </TouchableOpacity>
              </>
            )}
            {pwStatus === 'error' && (
              <>
                <Text style={[st.pwBody, { color: '#DC2626' }]}>Fehler beim Senden. Bitte erneut versuchen.</Text>
                <TouchableOpacity onPress={() => setPwModal(false)} style={[st.confirmBtn, st.cancelBtn, { alignSelf: 'stretch', marginTop: 16 }]}>
                  <Text style={st.cancelBtnText}>Schließen</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Confirm logout modal ── */}
      <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
        <View style={st.overlay}>
          <View style={st.confirmCard}>
            <Text style={st.confirmText}>{t.account.logoutConfirm}</Text>
            <View style={st.confirmBtns}>
              <TouchableOpacity onPress={() => setConfirmLogout(false)} style={[st.confirmBtn, st.cancelBtn]}>
                <Text style={st.cancelBtnText}>{t.account.no}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { setConfirmLogout(false); await logoutAll(); }}
                style={[st.confirmBtn, st.logoutConfirmBtn]}
              >
                <Text style={st.logoutConfirmText}>{t.account.yes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BRAND.background },
  scroll: { paddingBottom: 48 },

  // Header
  header: {
    backgroundColor: BRAND.surface,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText:   { fontSize: 30, fontWeight: '800' },
  displayName:  { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, textAlign: 'center', paddingHorizontal: 24 },

  // Sections
  section:      { backgroundColor: BRAND.surface, marginHorizontal: 0, marginBottom: 12 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: BRAND.textPrimary,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: BRAND.border },
  infoLabel: { fontSize: 14, color: BRAND.textSecondary, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '500', color: BRAND.textPrimary, flex: 1, textAlign: 'right' },

  // Settings rows (like the McD app)
  settingsRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: BRAND.border },
  settingsLabel:  { flex: 1, fontSize: 14, color: BRAND.textPrimary },
  settingsDanger: { color: '#DC2626' },
  settingsRight:  { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  settingsValue:  { fontSize: 14, color: BRAND.textSecondary },
  settingsChevron:{ fontSize: 20, color: BRAND.textSecondary, marginLeft: 4 },

  // PIN button (full-width teal button like McD)
  pinBtn: {
    marginHorizontal: 0,
    marginBottom: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
  },
  pinBtnIcon: { fontSize: 20, color: '#fff' },
  pinBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  // PIN modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pinCard:     { backgroundColor: BRAND.surface, borderRadius: 20, padding: 28, marginHorizontal: 32, alignItems: 'center', width: '80%' },
  pinCardTitle:{ fontSize: 16, fontWeight: '700', color: BRAND.textSecondary, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  pinDigits:   { fontSize: 48, fontWeight: '900', letterSpacing: 10, marginBottom: 16 },
  pinHint:     { fontSize: 13, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  pinCloseBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  pinCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Password modal
  pwTitle: { fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 12 },
  pwBody:  { fontSize: 14, color: BRAND.textSecondary, lineHeight: 22, marginBottom: 4, textAlign: 'center' },

  // Language sheet
  langSheet: {
    backgroundColor: BRAND.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  langSheetTitle: { fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 16 },
  langRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  langAbbrBadge:  { width: 36, height: 36, borderRadius: 8, backgroundColor: BRAND.border, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  langAbbr:       { fontSize: 12, fontWeight: '800', color: BRAND.textSecondary },
  langLabel:      { flex: 1, fontSize: 16, color: BRAND.textPrimary },
  langCheck:      { fontSize: 18, fontWeight: '700' },

  // Logout confirm
  confirmCard:       { backgroundColor: BRAND.surface, borderRadius: 16, padding: 24, marginHorizontal: 32, width: '80%' },
  confirmText:       { fontSize: 17, fontWeight: '600', color: BRAND.textPrimary, textAlign: 'center', marginBottom: 20 },
  confirmBtns:       { flexDirection: 'row', columnGap: 10 },
  confirmBtn:        { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn:         { backgroundColor: BRAND.background, borderWidth: 1, borderColor: BRAND.border },
  cancelBtnText:     { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  logoutConfirmBtn:  { backgroundColor: '#DC2626' },
  logoutConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
