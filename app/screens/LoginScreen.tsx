import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginWithEmail } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { BRAND, ADMIN_PURPLE } from '../constants/colors';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';

export default function LoginScreen() {
  const { t, lang, setLang } = useLang();
  const { loginWithDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAccounts, setShowAccounts] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) { setError(t.login.errorEmpty); return; }
    setError('');

    // Check local demo accounts first — no Firebase needed
    const key = email.trim().toLowerCase();
    const demo = DEMO_ACCOUNTS[key];
    if (demo) {
      if (demo.password === password) {
        loginWithDemoUser(demo.user);
      } else {
        setError(t.login.errorCredentials);
      }
      return;
    }

    // Fall through to Firebase
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        setError(t.login.errorCredentials);
      } else if (e.code === 'auth/too-many-requests') {
        setError(t.login.errorTooMany);
      } else {
        setError(t.login.errorGeneral);
      }
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials(accountEmail: string, accountPassword: string) {
    setEmail(accountEmail);
    setPassword(accountPassword);
    setError('');
    setShowAccounts(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Language toggle */}
          <View style={styles.langRow}>
            {(['de', 'en'] as const).map(l => (
              <TouchableOpacity key={l} onPress={() => setLang(l)} style={[styles.langBtn, lang === l && styles.langBtnActive]}>
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l === 'de' ? '🇩🇪 DE' : '🇬🇧 EN'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text style={styles.appName}>PflegeAzubi</Text>
            <Text style={styles.tagline}>{t.login.tagline}</Text>
          </View>

          {/* Form */}
          <Text style={styles.label}>{t.login.email}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@einrichtung.de"
            placeholderTextColor={BRAND.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[styles.label, { marginTop: 16 }]}>{t.login.password}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={BRAND.textSecondary}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>{t.login.signIn}</Text>}
          </TouchableOpacity>

          {/* Demo accounts accordion */}
          <TouchableOpacity style={styles.demoToggle} onPress={() => setShowAccounts(s => !s)} activeOpacity={0.7}>
            <Text style={styles.demoToggleText}>Demo-Zugänge {showAccounts ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAccounts && (
            <View style={styles.accountsCard}>
              <Text style={styles.accountsHint}>Tippe auf einen Eintrag, um die Felder auszufüllen</Text>
              {Object.entries(DEMO_ACCOUNTS).map(([acEmail, acc]) => (
                <TouchableOpacity
                  key={acEmail}
                  style={styles.accountRow}
                  onPress={() => fillCredentials(acEmail, acc.password)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.roleTag, acc.user.role === 'admin' ? styles.roleTagAdmin : styles.roleTagAzubi]}>
                    <Text style={[styles.roleTagText, acc.user.role === 'admin' ? styles.roleTagTextAdmin : styles.roleTagTextAzubi]}>
                      {acc.user.role === 'admin' ? 'Leitung' : `Jahr ${acc.user.ausbildungYear}`}
                    </Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{acc.user.name}</Text>
                    <Text style={styles.accountEmail}>{acEmail}</Text>
                  </View>
                  <Text style={styles.fillArrow}>↑</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.passwordHint}>
                <Text style={styles.passwordHintText}>Passwort Leitung: Admin123  ·  Azubis: Azubi123</Text>
              </View>
            </View>
          )}

          <Text style={styles.hint}>{t.login.hint}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingVertical: 40, flexGrow: 1, justifyContent: 'center' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', columnGap: 8, marginBottom: 24 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border },
  langBtnActive: { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight },
  langText: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  langTextActive: { color: BRAND.primary },
  brand: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: BRAND.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: BRAND.textSecondary, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: BRAND.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: BRAND.textPrimary,
  },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 10 },
  loginBtn: {
    backgroundColor: BRAND.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  demoToggle: {
    alignItems: 'center', paddingVertical: 14, marginTop: 16,
  },
  demoToggleText: { fontSize: 13, fontWeight: '700', color: BRAND.textSecondary },
  accountsCard: {
    backgroundColor: BRAND.surface, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BRAND.border,
  },
  accountsHint: {
    fontSize: 11, color: BRAND.textSecondary, textAlign: 'center',
    paddingTop: 12, paddingBottom: 4,
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: BRAND.border,
    columnGap: 10,
  },
  roleTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 52, alignItems: 'center' },
  roleTagAdmin: { backgroundColor: '#EEEDFE' },
  roleTagAzubi: { backgroundColor: BRAND.primaryLight },
  roleTagText: { fontSize: 11, fontWeight: '700' },
  roleTagTextAdmin: { color: ADMIN_PURPLE },
  roleTagTextAzubi: { color: BRAND.primary },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary },
  accountEmail: { fontSize: 11, color: BRAND.textSecondary, marginTop: 1 },
  fillArrow: { fontSize: 18, color: BRAND.textSecondary },
  passwordHint: {
    backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: BRAND.border,
  },
  passwordHintText: { fontSize: 11, color: BRAND.textSecondary, textAlign: 'center' },
  hint: {
    fontSize: 12, color: BRAND.textSecondary,
    textAlign: 'center', marginTop: 20, lineHeight: 18,
  },
});
