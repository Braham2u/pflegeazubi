import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../constants/colors';
import { Lang } from '../i18n';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { t, lang, setLang } = useLang();
  const { userProfile, logoutAll } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const name = userProfile?.name ?? 'Demo User';
  const email = userProfile?.email ?? 'demo@pflegeazubi.de';
  const role = userProfile?.role ?? 'azubi';
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const languages: { code: Lang; flag: string; label: string }[] = [
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.account.title}</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={[styles.roleBadge, role === 'admin' && styles.roleBadgeAdmin]}>
            <Text style={[styles.roleText, role === 'admin' && styles.roleTextAdmin]}>
              {role === 'admin' ? t.account.admin : t.account.azubi}
            </Text>
          </View>
        </View>

        {/* Info section */}
        {(userProfile?.ausbildungYear || userProfile?.contractedHoursPerWeek) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.account.information}</Text>
            {userProfile.ausbildungYear && (
              <InfoRow label={t.account.year} value={`${userProfile.ausbildungYear}. Ausbildungsjahr`} />
            )}
            {userProfile.contractedHoursPerWeek && (
              <InfoRow label={t.account.contractedHours} value={`${userProfile.contractedHoursPerWeek}h`} />
            )}
          </View>
        ) : null}

        {/* Language section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.account.settings}</Text>
          <View style={styles.langRow}>
            {languages.map(l => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLang(l.code)}
                style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setConfirmLogout(true)}>
          <Text style={styles.logoutText}>{t.account.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm logout modal */}
      <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmText}>{t.account.logoutConfirm}</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity onPress={() => setConfirmLogout(false)} style={[styles.confirmBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>{t.account.no}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { setConfirmLogout(false); await logoutAll(); }}
                style={[styles.confirmBtn, styles.logoutConfirmBtn]}
              >
                <Text style={styles.logoutConfirmText}>{t.account.yes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },
  profileCard: {
    backgroundColor: BRAND.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BRAND.primaryLight,
    borderWidth: 3, borderColor: BRAND.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: BRAND.primary },
  name: { fontSize: 20, fontWeight: '700', color: BRAND.textPrimary, textAlign: 'center' },
  email: { fontSize: 14, color: BRAND.textSecondary, marginTop: 4, marginBottom: 12 },
  roleBadge: {
    backgroundColor: BRAND.primaryLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  roleBadgeAdmin: { backgroundColor: '#EEEDFE' },
  roleText: { fontSize: 13, fontWeight: '600', color: BRAND.primary },
  roleTextAdmin: { color: '#3C3489' },
  section: {
    backgroundColor: BRAND.surface, borderRadius: 14, padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: BRAND.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  infoLabel: { fontSize: 14, color: BRAND.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: BRAND.textPrimary },
  langRow: { flexDirection: 'row', columnGap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    columnGap: 6, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: BRAND.border,
  },
  langBtnActive: { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight },
  langFlag: { fontSize: 18 },
  langLabel: { fontSize: 14, fontWeight: '600', color: BRAND.textSecondary },
  langLabelActive: { color: BRAND.primary },
  logoutBtn: {
    marginTop: 8, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#DC2626',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmCard: {
    backgroundColor: BRAND.surface, borderRadius: 16,
    padding: 24, marginHorizontal: 32, width: '80%',
  },
  confirmText: { fontSize: 17, fontWeight: '600', color: BRAND.textPrimary, textAlign: 'center', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', columnGap: 10 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: BRAND.background, borderWidth: 1, borderColor: BRAND.border },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  logoutConfirmBtn: { backgroundColor: '#DC2626' },
  logoutConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
