import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Main Screens
import DashboardScreen from '../screens/home/DashboardScreen';
import TeamsScreen from '../screens/teams/TeamsScreen';
import TeamDetailScreen from '../screens/teams/TeamDetailScreen';
import MatchSetupScreen from '../screens/match/MatchSetupScreen';
import PlayerSelectionScreen from '../screens/match/PlayerSelectionScreen';
import LiveScoreScreen from '../screens/match/LiveScoreScreen';
import ScorecardScreen from '../screens/match/ScorecardScreen';
import MatchHistoryScreen from '../screens/match/MatchHistoryScreen';
import TournamentsScreen from '../screens/tournament/TournamentsScreen';
import TournamentDetailScreen from '../screens/tournament/TournamentDetailScreen';

import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, setSession } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!session ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // App Stack
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Teams" component={TeamsScreen} />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
            <Stack.Screen name="MatchSetup" component={MatchSetupScreen} />
            <Stack.Screen name="PlayerSelection" component={PlayerSelectionScreen} />
            <Stack.Screen name="LiveScore" component={LiveScoreScreen} />
            <Stack.Screen name="Scorecard" component={ScorecardScreen} />
            <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
            <Stack.Screen name="Tournaments" component={TournamentsScreen} />
            <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
