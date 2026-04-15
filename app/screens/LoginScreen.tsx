import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginWithEmail, resetPassword } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { BRAND } from '../constants/colors';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import { isFirebaseConfigured } from '../services/firebase';

export default function LoginScreen() {
  const { t, lang, setLang } = useLang();
  const { loginWithDemoUser } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleReset() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError(t.login.errorEmpty); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setResetSent(true);
    } catch {
      setError(t.login.errorGeneral);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError(t.login.errorEmpty);
      return;
    }
    setError('');

    // Demo accounts — only shown in dev/non-Firebase mode
    if (!isFirebaseConfigured) {
      const demo = DEMO_ACCOUNTS[trimmedEmail];
      if (demo && demo.password === password) {
        loginWithDemoUser(demo.user);
        return;
      }
      setError(t.login.errorCredentials);
      return;
    }

    // Real Firebase login
    setLoading(true);
    try {
      await loginWithEmail(trimmedEmail, password);
    } catch (e: any) {
      const code = e.code ?? '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError(t.login.errorCredentials);
      } else if (code.includes('too-many-requests')) {
        setError(t.login.errorTooMany);
      } else {
        setError(t.login.errorGeneral);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Language toggle — top right */}
          <View style={styles.langRow}>
            {(['de', 'en'] as const).map(l => (
              <TouchableOpacity key={l} onPress={() => setLang(l)}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}>
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l === 'de' ? 'DE' : 'EN'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brand block */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>P</Text>
            </View>
            <Text style={styles.appName}>PflegeAzubi</Text>
            <Text style={styles.tagline}>{t.login.tagline}</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Anmelden</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t.login.email}</Text>
              <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
                <Text style={styles.inputIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder="name@einrichtung.de"
                  placeholderTextColor={BRAND.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t.login.password}</Text>
              <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  placeholder="Passwort"
                  placeholderTextColor={BRAND.textSecondary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.showBtn}>
                  <Text style={styles.showBtnText}>{showPassword ? 'Verbergen' : 'Anzeigen'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠  {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Anmelden</Text>
              }
            </TouchableOpacity>

            {resetSent ? (
              <View style={styles.resetSuccess}>
                <Text style={styles.resetSuccessText}>
                  E-Mail gesendet! Bitte prüfe dein Postfach.
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleReset} disabled={loading} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Passwort vergessen?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Demo hint — only shown when Firebase is NOT configured */}
          {!isFirebaseConfigured && (
            <View style={styles.demoHint}>
              <Text style={styles.demoHintText}>
                Demo: admin@pflegeazubi.de / Admin123
              </Text>
            </View>
          )}

          <Text style={styles.footerNote}>PflegeAzubi · Ausbildungsmanagement</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BRAND.background },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 32 },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: BRAND.border,
  },
  langBtnActive: { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight },
  langText:       { fontSize: 12, fontWeight: '700', color: BRAND.textSecondary },
  langTextActive: { color: BRAND.primary },

  brand:     { alignItems: 'center', marginBottom: 36 },
  logoBox:   {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: BRAND.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoLetter: { fontSize: 40, fontWeight: '900', color: '#fff' },
  appName:    { fontSize: 30, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  tagline:    { fontSize: 14, color: BRAND.textSecondary, marginTop: 6 },

  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 20 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.background,
    borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 12, paddingHorizontal: 14,
    height: 52,
  },
  inputWrapError: { borderColor: '#DC2626' },
  inputIcon: { fontSize: 14, marginRight: 10, opacity: 0.5 },
  input: {
    flex: 1, fontSize: 15, color: BRAND.textPrimary,
    height: '100%',
  },
  showBtn:     { paddingLeft: 8, paddingVertical: 4 },
  showBtnText: { fontSize: 12, fontWeight: '600', color: BRAND.primary },

  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },

  loginBtn: {
    backgroundColor: BRAND.primary, borderRadius: 14,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  loginBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  demoHint: {
    backgroundColor: '#FEF3C7', borderRadius: 10,
    padding: 12, alignItems: 'center',
    marginBottom: 12,
  },
  demoHintText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  forgotBtn: { alignItems: 'center', paddingTop: 14 },
  forgotText: { fontSize: 13, fontWeight: '600', color: BRAND.primary },
  resetSuccess: {
    marginTop: 14, backgroundColor: '#D1FAE5',
    borderRadius: 10, padding: 12,
  },
  resetSuccessText: { fontSize: 13, color: '#065F46', textAlign: 'center' },

  footerNote: {
    textAlign: 'center', fontSize: 12,
    color: BRAND.textSecondary, marginTop: 8,
  },
});
