import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { submitPlacementRequest } from '../services/placementRequests';

function nextMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonthsStr(yyyyMm: string, n: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function MonthPicker({ label, value, onChange, minMonth }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minMonth?: string;
}) {
  const { t } = useLang();
  const [selYear,  setSelYear]  = useState(parseInt(value.split('-')[0]));
  const [selMonth, setSelMonth] = useState(parseInt(value.split('-')[1]));

  const currentYear = new Date().getFullYear();
  const years       = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  const monthsShort = t.months.map(m => m.slice(0, 3));

  function pick(year: number, month: number) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    if (minMonth && ym < minMonth) return;
    setSelYear(year);
    setSelMonth(month);
    onChange(ym);
  }

  return (
    <View style={mp.wrap}>
      <Text style={mp.label}>{label}</Text>
      <View style={mp.yearRow}>
        {years.map(y => (
          <TouchableOpacity
            key={y}
            style={[mp.yearPill, selYear === y && mp.active]}
            onPress={() => pick(y, selMonth)}
            activeOpacity={0.7}
          >
            <Text style={[mp.yearText, selYear === y && mp.activeText]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={mp.monthGrid}>
        {monthsShort.map((m, i) => {
          const monthNum = i + 1;
          const ym       = `${selYear}-${String(monthNum).padStart(2, '0')}`;
          const disabled = !!(minMonth && ym < minMonth);
          const isActive = selMonth === monthNum;
          return (
            <TouchableOpacity
              key={m}
              style={[mp.monthPill, isActive && mp.active, disabled && mp.dimmed]}
              onPress={() => !disabled && pick(selYear, monthNum)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text style={[mp.monthText, isActive && mp.activeText, disabled && mp.dimmedText]}>
                {m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PlacementRequestFormScreen() {
  const navigation      = useNavigation<any>();
  const route           = useRoute<any>();
  const { userProfile } = useAuth();
  const { t }           = useLang();
  const { facilityId, facilityName } = route.params as { facilityId: string; facilityName: string };

  const defaultStart = nextMonthStr();
  const [startMonth, setStartMonth] = useState(defaultStart);
  const [endMonth,   setEndMonth]   = useState(addMonthsStr(defaultStart, 2));
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (endMonth < startMonth) setEndMonth(startMonth);
  }, [startMonth]);

  async function handleSubmit() {
    if (!userProfile) return;
    setError('');
    setSubmitting(true);
    try {
      await submitPlacementRequest({
        traineeId:   userProfile.id,
        traineeName: userProfile.name,
        facilityId,
        facilityName,
        startMonth,
        endMonth,
        status:    'pending',
        note:      note.trim() || undefined,
        createdAt: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1200);
    } catch (e: any) {
      setError(e.message ?? t.placementRequest.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} activeOpacity={0.7}>
            <Text style={s.backText}>‹ {t.placementRequest.facilitiesTitle}</Text>
          </TouchableOpacity>

          <Text style={s.title}>{t.placementRequest.formTitle}</Text>

          <View style={s.facilityBox}>
            <Text style={s.facilityLabel}>{t.placementRequest.facility}</Text>
            <Text style={s.facilityName}>{facilityName}</Text>
          </View>

          <MonthPicker
            label={t.placementRequest.startMonth}
            value={startMonth}
            onChange={setStartMonth}
          />
          <MonthPicker
            label={t.placementRequest.endMonth}
            value={endMonth}
            onChange={setEndMonth}
            minMonth={startMonth}
          />

          <View style={s.noteWrap}>
            <Text style={s.fieldLabel}>{t.placementRequest.note}</Text>
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={t.placementRequest.notePlaceholder}
              placeholderTextColor={BRAND.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.submitBtn, (submitting || success) && { opacity: 0.75 }]}
            onPress={handleSubmit}
            disabled={submitting || success}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : success ? (
              <Text style={s.submitBtnText}>✓ {t.placementRequest.successMsg}</Text>
            ) : (
              <Text style={s.submitBtnText}>{t.placementRequest.submit}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const mp = StyleSheet.create({
  wrap:      { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '700', color: BRAND.textSecondary, marginBottom: 10 },
  yearRow:   { flexDirection: 'row', columnGap: 8, marginBottom: 10 },
  yearPill:  { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: BRAND.border, alignItems: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthPill: { width: '22%', paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: BRAND.border, alignItems: 'center' },
  active:    { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight },
  yearText:  { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  monthText: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },
  activeText:{ color: BRAND.primary, fontWeight: '700' },
  dimmed:    { opacity: 0.35 },
  dimmedText:{ color: BRAND.textSecondary },
});

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BRAND.background },
  scroll: { padding: 20, paddingBottom: 40 },
  back:   { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 15, color: BRAND.primary, fontWeight: '600' },
  title:  { fontSize: 24, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 20 },
  facilityBox: {
    backgroundColor: BRAND.surface, borderRadius: 14, padding: 16, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: BRAND.primary,
  },
  facilityLabel: { fontSize: 11, fontWeight: '700', color: BRAND.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  facilityName:  { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary },
  fieldLabel:  { fontSize: 13, fontWeight: '700', color: BRAND.textSecondary, marginBottom: 8 },
  noteWrap:    { marginBottom: 24 },
  noteInput:   {
    backgroundColor: BRAND.surface, borderWidth: 1.5, borderColor: BRAND.border,
    borderRadius: 12, padding: 14, fontSize: 14, color: BRAND.textPrimary, minHeight: 100,
  },
  errorText:  { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  submitBtn:  { backgroundColor: BRAND.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
