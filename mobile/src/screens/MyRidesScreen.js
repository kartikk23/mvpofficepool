import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BookingAPI } from '../api/client';

const STATUS_STYLES = {
  pending: { bg: '#FFF7E6', color: '#8A6D00', label: 'Pending' },
  confirmed: { bg: '#F0F5FF', color: '#0B5FFF', label: 'Confirmed' },
  ongoing: { bg: '#EAFBF1', color: '#12A150', label: 'Ongoing' },
  completed: { bg: '#F2F2F2', color: '#444', label: 'Completed' },
  cancelled: { bg: '#FDECEC', color: '#D32F2F', label: 'Cancelled' },
  no_show: { bg: '#FDECEC', color: '#D32F2F', label: 'No-show' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#F2F2F2', color: '#444', label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function MyRidesScreen({ navigation }) {
  const [mode, setMode] = useState('rider'); // 'rider' | 'driver'
  const [riderBookings, setRiderBookings] = useState([]);
  const [driverRequests, setDriverRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState(null);

  const load = async () => {
    try {
      const [mine, incoming] = await Promise.all([BookingAPI.mine(), BookingAPI.incoming()]);
      setRiderBookings(mine.data);
      setDriverRequests(incoming.data);
    } catch (err) {
      console.log('My Rides load error', err?.response?.data || err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAccept = async (bookingId) => {
    setActingOn(bookingId);
    try {
      await BookingAPI.accept(bookingId);
      await load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to accept request');
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (bookingId) => {
    setActingOn(bookingId);
    try {
      await BookingAPI.reject(bookingId);
      await load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to decline request');
    } finally {
      setActingOn(null);
    }
  };

  const data = mode === 'rider' ? riderBookings : driverRequests;

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'rider' && styles.toggleButtonActive]}
          onPress={() => setMode('rider')}
        >
          <Text style={[styles.toggleText, mode === 'rider' && styles.toggleTextActive]}>As Rider</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'driver' && styles.toggleButtonActive]}
          onPress={() => setMode('driver')}
        >
          <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>As Driver</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {mode === 'rider' ? 'No bookings yet. Find a ride to get started.' : 'No ride requests yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.route} numberOfLines={1}>
                {item.origin_address} → {item.destination_address}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            {mode === 'driver' && (
              <Text style={styles.riderName}>{item.rider_name} · ★ {Number(item.rider_trust_score || 4.5).toFixed(1)}</Text>
            )}
            <Text style={styles.meta}>
              {new Date(item.departure_time).toLocaleString()} · ₹{item.fare_amount}
            </Text>

            {mode === 'driver' && item.status === 'pending' && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  disabled={actingOn === item.id}
                  onPress={() => handleReject(item.id)}
                >
                  <Text style={styles.rejectButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  disabled={actingOn === item.id}
                  onPress={() => handleAccept(item.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  toggleRow: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 10 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC' },
  toggleButtonActive: { backgroundColor: '#0B5FFF', borderColor: '#0B5FFF' },
  toggleText: { fontWeight: '700', color: '#344054' },
  toggleTextActive: { color: '#fff' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  route: { flex: 1, fontWeight: '700', fontSize: 14 },
  riderName: { color: '#555', fontSize: 12, marginTop: 6 },
  meta: { color: '#666', fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  rejectButton: { backgroundColor: '#FDECEC' },
  rejectButtonText: { color: '#D32F2F', fontWeight: '700' },
  acceptButton: { backgroundColor: '#12A150' },
  acceptButtonText: { color: '#fff', fontWeight: '700' },
});
