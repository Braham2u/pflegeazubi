import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BRAND } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

const FIXED = { position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any };

export default function AzubiSidebar({ state, navigation }: BottomTabBarProps) {
  const { userProfile } = useAuth();
  const { t } = useLang();

  const NAV_ITEMS = [
    { name: 'home',         label: 'Dashboard',                       icon: '📊' },
    { name: 'shiftPlan',   label: t.tabs.shiftPlan,                  icon: '📅' },
    { name: 'rotation',    label: t.rotation.title,                  icon: '🔄' },
    { name: 'availability',label: t.tabs.availability,               icon: '✋' },
    { name: 'myRequests',  label: t.placementRequest.myRequests,     icon: '📋' },
    { name: 'profile',     label: t.tabs.profile,                    icon: '👤' },
  ];
  const [open, setOpen] = useState(false);
  const slideX = useRef(new Animated.Value(-300)).current;
  const fadeA  = useRef(new Animated.Value(0)).current;

  const activeRoute = state.routes[state.index].name;
  const initial = userProfile?.name?.trim().split(/\s+/)[0]?.[0]?.toUpperCase() ?? '?';

  function openSidebar() {
    setOpen(true);
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0,    useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeA,  { toValue: 1,    duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeSidebar() {
    Animated.parallel([
      Animated.spring(slideX, { toValue: -300, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeA,  { toValue: 0,    duration: 150, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }

  function goTo(name: string) {
    navigation.navigate(name as never);
    closeSidebar();
  }

  const currentLabel = NAV_ITEMS.find(i => i.name === activeRoute)?.label ?? 'Dashboard';

  return (
    <>
      <View style={[s.topBar, FIXED]}>
        <TouchableOpacity style={s.hamburgerBtn} onPress={openSidebar} activeOpacity={0.8}>
          <View style={s.bar} />
          <View style={[s.bar, { width: 16 }]} />
          <View style={s.bar} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{currentLabel}</Text>
      </View>

      {open && (
        <Animated.View style={[s.backdrop, FIXED, { opacity: fadeA }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
        </Animated.View>
      )}

      {open && (
        <Animated.View style={[s.panel, FIXED, { transform: [{ translateX: slideX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={s.head}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
              <View style={s.headInfo}>
                <Text style={s.headName} numberOfLines={1}>{userProfile?.name ?? ''}</Text>
                <Text style={s.headRole}>{t.account.azubi}</Text>
              </View>
              <TouchableOpacity onPress={closeSidebar} style={s.closeBtn} activeOpacity={0.7}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.navList}>
              {NAV_ITEMS.map(item => {
                const isActive = activeRoute === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[s.navItem, isActive && s.navItemActive]}
                    onPress={() => goTo(item.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.navIcon, isActive && s.navIconActive]}>{item.icon}</Text>
                    <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
                    {isActive && <View style={s.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.footer}>
              <Text style={s.footerBrand}>PflegeAzubi</Text>
              <Text style={s.footerSub}>Dein Ausbildungsbegleiter</Text>
            </View>

          </SafeAreaView>
        </Animated.View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  topBar: {
    top: 0, left: 0, right: 0, height: 52, zIndex: 900,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1, borderBottomColor: BRAND.border,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  hamburgerBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, flex: 1 },
  bar: { width: 20, height: 2, backgroundColor: BRAND.textPrimary, borderRadius: 1, marginVertical: 2 },

  backdrop: {
    top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  panel: {
    top: 0, left: 0, bottom: 0, width: 280, zIndex: 1000,
    backgroundColor: BRAND.surface,
    shadowColor: '#000', shadowOpacity: 0.14,
    shadowRadius: 24, shadowOffset: { width: 8, height: 0 }, elevation: 12,
  },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: BRAND.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  headInfo:    { flex: 1, marginLeft: 12 },
  headName:    { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary },
  headRole:    { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  closeBtn:    { padding: 8, marginLeft: 4 },
  closeBtnText:{ fontSize: 18, color: BRAND.textSecondary },

  navList: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 4,
  },
  navItemActive:  { backgroundColor: BRAND.primaryLight },
  navIcon:        { fontSize: 20, marginRight: 14, width: 26, textAlign: 'center', opacity: 0.55 },
  navIconActive:  { opacity: 1 },
  navLabel:       { flex: 1, fontSize: 15, fontWeight: '600', color: BRAND.textSecondary },
  navLabelActive: { color: BRAND.primary, fontWeight: '700' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.primary },

  footer: {
    paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: BRAND.border,
  },
  footerBrand: { fontSize: 14, fontWeight: '700', color: BRAND.textPrimary },
  footerSub:   { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
});
