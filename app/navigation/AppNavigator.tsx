import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { signInAsKiosk } from '../services/auth';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ShiftPlanScreen from '../screens/ShiftPlanScreen';
import WorkingTimeScreen from '../screens/WorkingTimeScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import RotationPlanScreen from '../screens/RotationPlanScreen';
import AccountScreen from '../screens/AccountScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ShiftPublisherScreen from '../screens/admin/ShiftPublisherScreen';
import WishesScreen from '../screens/admin/WishesScreen';
import TraineeListScreen from '../screens/admin/TraineeListScreen';
import TraineeRotationScreen from '../screens/admin/TraineeRotationScreen';
import SubAdminListScreen from '../screens/admin/SubAdminListScreen';
import AttendanceScreen from '../screens/admin/AttendanceScreen';
import KioskScreen from '../screens/KioskScreen';
import AzubiSidebar from '../components/AzubiSidebar';
import { BRAND, ADMIN_PURPLE } from '../constants/colors';

const AzubiTab   = createBottomTabNavigator();
const AzubiStack = createNativeStackNavigator();
const AdminTab   = createBottomTabNavigator();
const AdminStack = createNativeStackNavigator();

function TabLabel({ name, color }: { name: string; color: string }) {
  const { t } = useLang();
  const labels: Record<string, string> = {
    home:             'Start',
    shiftPlan:        t.tabs.shiftPlan,
    rotation:         'Rotation',
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

const ADMIN_ICONS: Record<string, string> = {
  adminDashboard: '📊', adminAttendance: '🟢', shiftPublisher: '📋', adminWishes: '✋', adminProfile: '👤',
};

const WEB_PREFIX = typeof window !== 'undefined' ? window.location.origin : 'https://pflegeazubi.web.app';

const linking = {
  prefixes: [WEB_PREFIX],
  config: {
    screens: {
      adminTabs: {
        path: 'admin',
        screens: {
          adminDashboard:  { path: '' },
          adminAttendance: { path: 'attendance' },
          shiftPublisher:  { path: 'shifts' },
          adminWishes:     { path: 'wishes' },
          adminProfile:    { path: 'profile' },
        },
      },
      trainees:        { path: 'admin/trainees' },
      subAdmins:       { path: 'admin/sub-admins' },
      traineeRotation: { path: 'admin/trainees/rotation' },
      azubiTabs: {
        path: '',
        screens: {
          home:         { path: '' },
          shiftPlan:    { path: 'plan' },
          rotation:     { path: 'rotation' },
          availability: { path: 'availability' },
          profile:      { path: 'profile' },
        },
      },
      workingTime: { path: 'working-time' },
    },
  },
};

// ── Admin bottom tabs ─────────────────────────────────────────────────────────
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

// ── Admin stack ───────────────────────────────────────────────────────────────
function AdminNavigator() {
  const { userProfile } = useAuth();
  const facilityId   = userProfile?.primaryFacilityId ?? '';
  const facilityName = (userProfile as any)?.facilityName ?? 'Einrichtung';

  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="adminTabs"      component={AdminTabs} />
      <AdminStack.Screen name="trainees"       component={TraineeListScreen} />
      <AdminStack.Screen name="subAdmins"      component={SubAdminListScreen} />
      <AdminStack.Screen name="traineeRotation" component={TraineeRotationScreen} />
      <AdminStack.Screen
        name="kiosk"
        options={{ presentation: 'fullScreenModal' }}
      >
        {() => <KioskScreen facilityId={facilityId} facilityName={facilityName} />}
      </AdminStack.Screen>
    </AdminStack.Navigator>
  );
}

// ── Azubi tabs — sidebar replaces the bottom tab bar ─────────────────────────
function AzubiTabs() {
  return (
    <AzubiTab.Navigator
      tabBar={(props) => <AzubiSidebar {...props} />}
      sceneContainerStyle={{ marginTop: 52 }}
      screenOptions={{ headerShown: false }}
    >
      <AzubiTab.Screen name="home"         component={HomeScreen} />
      <AzubiTab.Screen name="shiftPlan"    component={ShiftPlanScreen} />
      <AzubiTab.Screen name="rotation"     component={RotationPlanScreen} />
      <AzubiTab.Screen name="availability" component={AvailabilityScreen} />
      <AzubiTab.Screen name="profile"      component={AccountScreen} />
    </AzubiTab.Navigator>
  );
}

// ── Azubi stack (tabs + working time as push screen) ─────────────────────────
function AzubiNavigator() {
  return (
    <AzubiStack.Navigator screenOptions={{ headerShown: false }}>
      <AzubiStack.Screen name="azubiTabs"   component={AzubiTabs} />
      <AzubiStack.Screen name="workingTime" component={WorkingTimeScreen} />
    </AzubiStack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { userProfile, loading } = useAuth();
  const [kioskMode, setKioskMode] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('kiosk') === '1') {
        setKioskMode(true);
        signInAsKiosk().catch(() => {});
      }
    }
  }, []);

  if (kioskMode) {
    return <KioskScreen facilityId="fac1" facilityName="Caritas St. Konrad" />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.background }}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const navKey = userProfile?.role ?? 'login';

  return (
    <NavigationContainer key={navKey} linking={linking}>
      {userProfile
        ? (userProfile.role === 'admin' || userProfile.role === 'subAdmin') ? <AdminNavigator /> : <AzubiNavigator />
        : <LoginScreen />}
    </NavigationContainer>
  );
}
