import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { BRAND } from '../constants/colors';

const ADMIN_PURPLE = '#3C3489';

// Separate navigator instances — sharing one causes screen-name collisions
const AzubiTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            adminDashboard: '📊',
            shiftPublisher: '📋',
            adminWishes: '✋',
            trainees: '👥',
            adminProfile: '👤',
          };
          return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: ADMIN_PURPLE,
        tabBarInactiveTintColor: BRAND.textSecondary,
        tabBarStyle: { borderTopColor: BRAND.border, backgroundColor: BRAND.surface },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <AdminTab.Screen name="adminDashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <AdminTab.Screen name="shiftPublisher" component={ShiftPublisherScreen} options={{ title: 'Dienstplan' }} />
      <AdminTab.Screen name="adminWishes" component={WishesScreen} options={{ title: 'Wünsche' }} />
      <AdminTab.Screen name="trainees" component={TraineeListScreen} options={{ title: 'Azubis' }} />
      <AdminTab.Screen name="adminProfile" component={AccountScreen} options={{ title: 'Profil' }} />
    </AdminTab.Navigator>
  );
}

function MainTabs() {
  const { t } = useLang();
  return (
    <AzubiTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            shiftPlan: '📅',
            workingTime: '⏱',
            availability: '✋',
            profile: '👤',
          };
          return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: BRAND.textSecondary,
        tabBarStyle: { borderTopColor: BRAND.border, backgroundColor: BRAND.surface },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <AzubiTab.Screen name="shiftPlan" component={ShiftPlanScreen} options={{ title: t.tabs.shiftPlan }} />
      <AzubiTab.Screen name="workingTime" component={WorkingTimeScreen} options={{ title: t.tabs.workingTime }} />
      <AzubiTab.Screen name="availability" component={AvailabilityScreen} options={{ title: t.tabs.availability }} />
      <AzubiTab.Screen name="profile" component={AccountScreen} options={{ title: t.tabs.profile }} />
    </AzubiTab.Navigator>
  );
}

export default function AppNavigator() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.background }}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  // key forces a full NavigationContainer remount when role changes,
  // preventing stale screen-name state from a previous session
  const navKey = userProfile?.role ?? 'login';

  return (
    <NavigationContainer key={navKey}>
      {userProfile
        ? userProfile.role === 'admin' ? <AdminTabs /> : <MainTabs />
        : <LoginScreen />}
    </NavigationContainer>
  );
}
