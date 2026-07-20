import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { UserAPI, BookingAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { colors, radius, shadow } from '../theme';

const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.primary,
  ongoing: colors.success,
  completed: colors.textMuted,
  cancelled: colors.danger,
};

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [meRes, bookingsRes] = await Promise.all([UserAPI.me(), BookingAPI.mine()]);
      setUser(meRes.data);
      setBookings(bookingsRes.data.slice(0, 3));
    } catch (err) {
      console.log('Home load error', err?.response?.data || err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {user && (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <ProfileCard user={{
            fullName: user.full_name,
            photoUrl: user.profile_photo_url,
            company: user.company_name,
            designation: user.designation,
            badges: { linkedinVerified: user.linkedin_verified, companyVerified: user.company_email_verified },
            trustScore: user.trust_score,
            totalRides: user.total_rides,
          }} />
        </TouchableOpacity>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('PostRide')}>
          <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.actionEmoji}>🚗</Text>
          </View>
          <Text style={styles.actionText}>Offer a ride</Text>
          <Text style={styles.actionSub}>Driving to office? Fill empty seats.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('FindRide')}>
          <View style={[styles.actionIconWrap, { backgroundColor: colors.successTint }]}>
            <Text style={styles.actionEmoji}>🔍</Text>
          </View>
          <Text style={styles.actionText}>Find a ride</Text>
          <Text style={styles.actionSub}>Join a verified colleague's commute.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent bookings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyRides')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>
      {bookings.length === 0 && <Text style={styles.emptyText}>No bookings yet. Find your first ride!</Text>}
      {bookings.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={styles.bookingCard}
          onPress={() => navigation.navigate('BookingDetails', { bookingId: b.id })}
        >
          <View style={styles.bookingCardTop}>
            <Text style={styles.bookingRoute} numberOfLines={1}>{b.origin_address} → {b.destination_address}</Text>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[b.status] || colors.textMuted }]} />
          </View>
          <Text style={styles.bookingMeta}>{new Date(b.departure_time).toLocaleString()} · ₹{b.fare_amount} · {b.status}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  actionsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  actionCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow.card },
  actionIconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionEmoji: { fontSize: 22 },
  actionText: { fontWeight: '700', fontSize: 15, color: colors.textPrimary },
  actionSub: { color: '#777', fontSize: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  seeAll: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#888' },
  bookingCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
  bookingCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bookingRoute: { fontWeight: '600', flex: 1, color: colors.textPrimary },
  bookingMeta: { color: '#666', fontSize: 12, marginTop: 4 },
});
