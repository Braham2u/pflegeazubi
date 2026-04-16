import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import LoginScreen from '../screens/LoginScreen';
import ShiftPlanScreen from '../screens/ShiftPlanScreen';
import WorkingTimeScreen from '../screens/WorkingTimeScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import AccountScreen from '../screens/AccountScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ShiftPublisherScreen from '../screens/admin/ShiftPublisherScreen';
import WishesScreen from '../screens/admin/WishesScreen';
import TraineeListScreen from '../screens/admin/TraineeListScreen';
import AttendanceScreen from '../screens/admin/AttendanceScreen';
import KioskScreen from '../screens/KioskScreen';
import { BRAND, ADMIN_PURPLE } from '../constants/colors';

const AzubiTab   = createBottomTabNavigator();
const AdminTab   = createBottomTabNavigator();
const AdminStack = createNativeStackNavigator();

// Renders as a real component so it subscribes to LanguageContext itself.
function TabLabel({ name, color }: { name: string; color: string }) {
  const { t } = useLang();
  const labels: Record<string, string> = {
    shiftPlan:        t.tabs.shiftPlan,
    workingTime:      t.tabs.workingTime,
    availability:     t.tabs.availability,
    profile:          t.tabs.profile,
    adminDashboard:   t.tabs.adminDashboard,
    adminAttendance:  'Anwesenheit',
    shiftPublisher:   t.tabs.shiftPublisher,
    adminWishes:      t.tabs.adminWishes,
    trainees:         t.tabs.trainees,
    adminProfile:     t.tabs.profile,
  };
  return (
    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
      {labels[name] ?? name}
    </Text>
  );
}

const AZUBI_ICONS: Record<string, string> = {
  shiftPlan: '📅', workingTime: '⏱', availability: '✋', profile: '👤',
};
const ADMIN_ICONS: Record<string, string> = {
  adminDashboard: '📊', adminAttendance: '🟢', shiftPublisher: '📋', adminWishes: '✋', adminProfile: '👤',
};

// ── Admin bottom tabs (5 tabs) ────────────────────────────────────────────────
function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {ADMIN_ICONS[route.name]}
          </Text>
        ),
        tabBarLabel: ({ color }) => <TabLabel name={route.name} color={color} />,
        tabBarActiveTintColor: ADMIN_PURPLE,
        tabBarInactiveTintColor: BRAND.textSecondary,
        tabBarStyle: { borderTopColor: BRAND.border, backgroundColor: BRAND.surface },
      })}
    >
      <AdminTab.Screen name="adminDashboard"  component={DashboardScreen} />
      <AdminTab.Screen name="adminAttendance" component={AttendanceScreen} />
      <AdminTab.Screen name="shiftPublisher"  component={ShiftPublisherScreen} />
      <AdminTab.Screen name="adminWishes"     component={WishesScreen} />
      <AdminTab.Screen name="adminProfile"    component={AccountScreen} />
    </AdminTab.Navigator>
  );
}

// ── Admin stack (tabs + kiosk + trainees as modal/stack screens) ─────────────
function AdminNavigator() {
  const { userProfile } = useAuth();
  const facilityId   = userProfile?.primaryFacilityId ?? '';
  const facilityName = (userProfile as any)?.facilityName ?? 'Einrichtung';

  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="adminTabs"  component={AdminTabs} />
      <AdminStack.Screen name="trainees"   component={TraineeListScreen} />
      <AdminStack.Screen
        name="kiosk"
        options={{ presentation: 'fullScreenModal' }}
      >
        {() => <KioskScreen facilityId={facilityId} facilityName={facilityName} />}
      </AdminStack.Screen>
    </AdminStack.Navigator>
  );
}

// ── Azubi bottom tabs ─────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <AzubiTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {AZUBI_ICONS[route.name]}
          </Text>
        ),
        tabBarLabel: ({ color }) => <TabLabel name={route.name} color={color} />,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: BRAND.textSecondary,
        tabBarStyle: { borderTopColor: BRAND.border, backgroundColor: BRAND.surface },
      })}
    >
      <AzubiTab.Screen name="shiftPlan"    component={ShiftPlanScreen} />
      <AzubiTab.Screen name="workingTime"  component={WorkingTimeScreen} />
      <AzubiTab.Screen name="availability" component={AvailabilityScreen} />
      <AzubiTab.Screen name="profile"      component={AccountScreen} />
    </AzubiTab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.background }}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const navKey = userProfile?.role ?? 'login';

  return (
    <NavigationContainer key={navKey}>
      {userProfile
        ? userProfile.role === 'admin' ? <AdminNavigator /> : <MainTabs />
        : <LoginScreen />}
    </NavigationContainer>
  );
}
