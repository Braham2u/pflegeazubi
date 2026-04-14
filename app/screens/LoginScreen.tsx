import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginWithEmail } from '../services/auth';
import { useLang } from '../context/LanguageContext';
import { BRAND, ADMIN_PURPLE } from '../constants/colors';

export default function LoginScreen() {
  const { t, lang, setLang } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) { setError(t.login.errorEmpty); return; }
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (e: any) {
      if (
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/wrong-password' ||
        e.code === 'auth/user-not-found'
      ) {
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
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>{t.login.signIn}</Text>}
          </TouchableOpacity>

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
  brand: { alignItems: 'center', marginBottom: 40 },
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
  hint: {
    fontSize: 12, color: BRAND.textSecondary,
    textAlign: 'center', marginTop: 24, lineHeight: 18,
  },
});
