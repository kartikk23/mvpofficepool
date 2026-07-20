import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import FindRideScreen from '../screens/FindRideScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PostRideScreen from '../screens/PostRideScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';
import BookingDetailsScreen from '../screens/BookingDetailsScreen';
import RatingScreen from '../screens/RatingScreen';
import VerificationScreen from '../screens/VerificationScreen';
import ChatScreen from '../screens/ChatScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import TrackRideScreen from '../screens/TrackRideScreen';
import SavedAddressesScreen from '../screens/SavedAddressesScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function icon(emoji) {
  return () => <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="FindRide" component={FindRideScreen} options={{ title: 'Find a ride', tabBarIcon: icon('🔍') }} />
      <Tab.Screen name="MyRides" component={MyRidesScreen} options={{ title: 'My Rides', tabBarIcon: icon('📋') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}

// This stack wraps the tab navigator so screens like PostRide / RideDetails / Booking
// can push on top of the tabs with a native header + back button.
export default function RootStack({ initialRouteName }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="PostRide" component={PostRideScreen} options={{ title: 'Offer a ride' }} />
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} options={{ title: 'Ride details' }} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={{ title: 'Your booking' }} />
      <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate your ride' }} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: 'Get verified' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'My vehicles' }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="TrackRide" component={TrackRideScreen} options={{ title: 'Live tracking' }} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} options={{ title: 'Saved addresses' }} />
    </Stack.Navigator>
  );
}
