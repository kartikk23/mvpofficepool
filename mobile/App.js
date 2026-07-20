import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import RootStack from './src/navigation/RootStack';
import { navigationRef, navigate } from './src/navigation/navigationRef';
import { registerForPushNotifications, addNotificationResponseListener } from './src/utils/notifications';
import { AuthContext } from './src/context/AuthContext';

const AuthStack = createNativeStackNavigator();

// Maps a notification's `data.type` (set by the backend in utils/notifications.js)
// to the screen it should open when tapped.
function handleNotificationTap(response) {
  const data = response.notification.request.content.data || {};
  if (data.bookingId) {
    navigate('BookingDetails', { bookingId: data.bookingId });
  } else if (data.rideId) {
    navigate('RideDetails', { rideId: data.rideId });
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      setIsLoggedIn(!!token);
      setLoading(false);
      if (token) registerForPushNotifications();
    });

    const subscription = addNotificationResponseListener(handleNotificationTap);
    return () => subscription.remove();
  }, []);

  const authContextValue = {
    signIn: () => setIsLoggedIn(true),
    signOut: async () => {
      await AsyncStorage.removeItem('token');
      setIsLoggedIn(false);
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0B5FFF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        {isLoggedIn ? (
          <RootStack initialRouteName="MainTabs" />
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Signup" component={SignupScreen} />
            <AuthStack.Screen name="Verification" component={VerificationScreen} />
          </AuthStack.Navigator>
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
