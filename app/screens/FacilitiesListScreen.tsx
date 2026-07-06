import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BRAND } from '../constants/colors';
import { useLang } from '../context/LanguageContext';
import { getAllFacilities } from '../services/placementRequests';
import { Facility, FacilityType } from '../types';

const TYPE_ICONS: Record<FacilityType, string> = {
  hospital:   '🏥',
  careHome:   '🏠',
  ambulatory: '🚑',
  school:     '🎓',
  other:      '📍',
};

const TYPE_COLORS: Record<FacilityType, { bg: string; text: string }> = {
  hospital:   { bg: '#DBEAFE', text: '#1D4ED8' },
  careHome:   { bg: '#D1FAE5', text: '#065F46' },
  ambulatory: { bg: '#FEF3C7', text: '#92400E' },
  school:     { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#6B7280' },
};

const TYPE_LABELS: Record<FacilityType, { de: string; en: string }> = {
  hospital:   { de: 'Krankenhaus',       en: 'Hospital' },
  careHome:   { de: 'Pflegeheim',        en: 'Care home' },
  ambulatory: { de: 'Ambulanter Dienst', en: 'Outpatient care' },
  school:     { de: 'Berufsschule',      en: 'Vocational school' },
  other:      { de: 'Sonstiges',         en: 'Other' },
};

export default function FacilitiesListScreen() {
  const navigation = useNavigation<any>();
  const { t, lang } = useLang();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFacilities()
      .then(setFacilities)
      .catch(() => setFacilities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} activeOpacity={0.7}>
          <Text style={s.backText}>‹ {t.placementRequest.myRequests}</Text>
        </TouchableOpacity>

        <Text style={s.title}>{t.placementRequest.facilitiesTitle}</Text>
        <Text style={s.subtitle}>{t.placementRequest.facilitiesSubtitle}</Text>

        {loading ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginTop: 40 }} />
        ) : facilities.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏥</Text>
            <Text style={s.emptyTitle}>{t.placementRequest.noFacilities}</Text>
          </View>
        ) : (
          facilities.map(f => {
            const tc = TYPE_COLORS[f.type];
            return (
              <TouchableOpacity
                key={f.id}
                style={s.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('placementRequestForm', {
                  facilityId: f.id,
                  facilityName: f.name,
                })}
              >
                <View style={[s.iconBox, { backgroundColor: tc.bg }]}>
                  <Text style={s.iconText}>{TYPE_ICONS[f.type]}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{f.name}</Text>
                  {f.city ? <Text style={s.cardCity}>{f.city}</Text> : null}
                </View>
                <View style={[s.typeBadge, { backgroundColor: tc.bg }]}>
                  <Text style={[s.typeBadgeText, { color: tc.text }]}>
                    {TYPE_LABELS[f.type][lang]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BRAND.background },
  scroll:  { padding: 20, paddingBottom: 40 },
  back:    { alignSelf: 'flex-start', marginBottom: 16 },
  backText:{ fontSize: 15, color: BRAND.primary, fontWeight: '600' },
  title:   { fontSize: 24, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 4 },
  subtitle:{ fontSize: 13, color: BRAND.textSecondary, marginBottom: 24 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, color: BRAND.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.surface, borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  iconBox:      { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconText:     { fontSize: 22 },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  cardCity:     { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  typeBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  typeBadgeText:{ fontSize: 11, fontWeight: '700' },
});
