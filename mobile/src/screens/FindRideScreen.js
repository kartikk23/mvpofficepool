import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { AddressAutocompleteInput } from '../components/AddressAutocompleteinput';
import { SavedAddressChips } from '../components/SavedAddressChips';
import { colors, radius, common } from '../theme';

export default function FindRideScreen({ navigation }) {
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [preferredTime, setPreferredTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!pickup || !drop) {
      return Alert.alert('Missing info', 'Please select both pickup and drop locations from the suggestions');
    }
    setLoading(true);
    try {
      const { data } = await RideAPI.search({
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        dropLat: drop.latitude,
        dropLng: drop.longitude,
        preferredTime: preferredTime.toISOString(),
        radiusKm: 3,
      });
      setResults(data.rides);
      setSearched(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a ride</Text>

      <SavedAddressChips onSelect={setPickup} />
      <AddressAutocompleteInput placeholder="Pickup location" value={pickup?.address} onLocationSelected={setPickup} />
      <SavedAddressChips onSelect={setDrop} />
      <AddressAutocompleteInput placeholder="Drop location (office)" value={drop?.address} onLocationSelected={setDrop} />

      <Text style={styles.label}>When</Text>
      <View style={styles.timeRow}>
        <TouchableOpacity
          style={[styles.timeChip, isNow(preferredTime) && styles.timeChipActive]}
          onPress={() => setPreferredTime(new Date())}
        >
          <Text style={[styles.timeChipText, isNow(preferredTime) && styles.timeChipTextActive]}>Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.timeChip, !isNow(preferredTime) && styles.timeChipActive]} onPress={() => setShowPicker(true)}>
          <Text style={[styles.timeChipText, !isNow(preferredTime) && styles.timeChipTextActive]}>
            {isNow(preferredTime) ? 'Schedule for later' : preferredTime.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>
      {showPicker && (
        <DateTimePicker
          value={preferredTime}
          mode="datetime"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setPreferredTime(date);
          }}
        />
      )}

      <TouchableOpacity style={[common.primaryButton, styles.searchButton]} onPress={handleSearch} disabled={loading}>
        <Text style={common.primaryButtonText}>{loading ? 'Searching...' : 'Search rides'}</Text>
      </TouchableOpacity>

      {searched && results.length === 0 && (
        <Text style={styles.emptyText}>No matching rides right now. Try a wider time window or post a request.</Text>
      )}

      <FlatList
        style={{ marginTop: 16 }}
        data={results}
        keyExtractor={(item) => item.rideId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => navigation.navigate('RideDetails', { rideId: item.rideId })}
          >
            <ProfileCard user={{
              fullName: item.driver.name,
              photoUrl: item.driver.photoUrl,
              company: item.driver.company,
              designation: item.driver.designation,
              badges: item.driver.badges,
              trustScore: item.driver.trustScore,
            }} compact />
            <View style={styles.rideMeta}>
              <Text style={styles.fare}>₹{item.estimatedFare}</Text>
              <Text style={styles.metaText}>{item.seatsAvailable} seat(s) left</Text>
              <Text style={styles.metaText}>{new Date(item.departureTime).toLocaleTimeString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function isNow(date) {
  return Math.abs(Date.now() - date.getTime()) < 60000;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, color: colors.textPrimary },
  label: { fontWeight: '600', marginBottom: 8, marginTop: 4, color: '#333' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  timeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  timeChipText: { color: colors.textSecondary, fontWeight: '600' },
  timeChipTextActive: { color: colors.primary },
  searchButton: { marginTop: 20 },
  emptyText: { color: '#888', marginTop: 20, textAlign: 'center' },
  resultCard: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 12, marginBottom: 12 },
  rideMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  fare: { fontWeight: '800', color: colors.primary, fontSize: 16 },
  metaText: { color: '#666', fontSize: 12 },
});
