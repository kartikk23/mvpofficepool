import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { RideAPI, BookingAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { RoutePreviewMap } from '../components/RoutePreviewMap';
import { colors, radius, common } from '../theme';

export default function RideDetailsScreen({ route, navigation }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    RideAPI.details(rideId).then((res) => setRide(res.data)).catch((err) => {
      Alert.alert('Error', 'Could not load ride details');
    });
  }, [rideId]);

  const handleBook = async () => {
    setBooking(true);
    try {
      const { data } = await BookingAPI.create({
        rideId,
        pickupLat: ride.origin_lat,
        pickupLng: ride.origin_lng,
        dropLat: ride.destination_lat,
        dropLng: ride.destination_lng,
      });

      navigation.navigate('BookingDetails', { bookingId: data.id });
    } catch (err) {
      Alert.alert('Booking failed', err?.response?.data?.error || err.message);
    } finally {
      setBooking(false);
    }
  };

  if (!ride) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: ride.driver_id })}>
        <ProfileCard user={{
          fullName: ride.driver_name,
          photoUrl: ride.profile_photo_url,
          company: ride.company_name,
          designation: ride.designation,
          badges: { linkedinVerified: ride.linkedin_verified, companyVerified: ride.company_email_verified },
          trustScore: ride.trust_score,
        }} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.routeText}>{ride.origin_address}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.routeText}>{ride.destination_address}</Text>
      </View>

      <RoutePreviewMap
        origin={{ latitude: ride.origin_lat, longitude: ride.origin_lng }}
        destination={{ latitude: ride.destination_lat, longitude: ride.destination_lng }}
      />

      <View style={styles.detailsGrid}>
        <Detail label="Departure" value={new Date(ride.departure_time).toLocaleString()} />
        <Detail label="Distance" value={`${Number(ride.estimated_distance_km).toFixed(1)} km`} />
        <Detail label="Rate" value={`₹${ride.price_per_km}/km`} />
        <Detail label="Estimated fare" value={`₹${ride.estimated_fare}`} />
        <Detail label="Seats left" value={`${ride.seats_total - ride.seats_booked}`} />
      </View>

      <TouchableOpacity style={[common.primaryButton, styles.bookButton]} onPress={handleBook} disabled={booking}>
        <Text style={common.primaryButtonText}>{booking ? 'Booking...' : `Book seat · ₹${ride.estimated_fare}`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  section: { alignItems: 'center', marginVertical: 20 },
  routeText: { fontSize: 15, fontWeight: '600', textAlign: 'center', color: colors.textPrimary },
  arrow: { fontSize: 20, color: colors.primary, marginVertical: 4 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailBox: { width: '48%', backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, marginBottom: 10 },
  detailLabel: { color: colors.textMuted, fontSize: 12 },
  detailValue: { fontWeight: '700', fontSize: 15, marginTop: 2, color: colors.textPrimary },
  bookButton: { marginTop: 20, marginBottom: 40 },
});
