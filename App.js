import { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './lib/supabase';
import { initPurchases, identifyUser, resetUser } from './lib/purchases';

import MapScreen from './screens/MapScreen';
import ExploreScreen from './screens/ExploreScreen';
import AddSpotScreen from './screens/AddSpotScreen';
import RanksScreen from './screens/RanksScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SpotDetailScreen from './screens/SpotDetailScreen';
import PaywallScreen from './screens/PaywallScreen';
import OnboardingScreen from './screens/OnboardingScreen';

// Keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#E8C84A',
        headerTitleStyle: { fontWeight: 'bold', letterSpacing: 2 },
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#222',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#E8C84A',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text> }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text> }}
      />
      <Tab.Screen
        name="Add Spot"
        component={AddSpotScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📍</Text> }}
      />
      <Tab.Screen
        name="Ranks"
        component={RanksScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👑</Text> }}
      />
      <Tab.Screen
        name="Me"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤙</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const [{ data: { session } }, onboardingDone] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem('onboarding_complete'),
        ]);
        setSession(session);
        setShowOnboarding(!onboardingDone);
        if (session?.user) {
          initPurchases(session.user.id);
        }
      } catch (e) {
        console.warn('Auth check error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        identifyUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null; // Keep native splash screen visible

  if (showOnboarding) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AuthScreen />
      </View>
    );
  }

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#E8C84A',
          headerTitleStyle: { fontWeight: 'bold', letterSpacing: 2 },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="SpotDetail" component={SpotDetailScreen} options={{ title: 'SPOT' }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'GO PRO', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
