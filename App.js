import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        initPurchases(session.user.id);
      }
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        identifyUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetUser();
      }
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E8C84A" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#E8C84A',
          headerTitleStyle: { fontWeight: 'bold', letterSpacing: 2 },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SpotDetail"
          component={SpotDetailScreen}
          options={{ title: 'SPOT' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ title: 'GO PRO', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}