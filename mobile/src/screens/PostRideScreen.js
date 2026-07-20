import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideAPI, VehicleAPI } from '../api/client';
import { AddressAutocompleteInput } from '../components/AddressAutocompleteinput';
import { SavedAddressChips } from '../components/SavedAddressChips';
import { RoutePreviewMap } from '../components/RoutePreviewMap';
import { colors, radius, common } from '../theme';

export default function PostRideScreen({ navigation }) {
  const [origin, setOrigin] = useState(null); // { latitude, longitude, address }
  const [destination, setDestination] = useState(null);
  const [seatsTotal, setSeatsTotal] = useState('3');
  const [pricePerKm, setPricePerKm] = useState('5');
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(null);

  useEffect(() => {
    VehicleAPI.mine().then((res) => {
      setVehicles(res.data);
      if (res.data.length) setVehicleId(res.data[0].id);
    }).catch(() => {});
  }, []);

  const handlePost = async () => {
    if (!origin || !destination) {
      return Alert.alert('Missing info', 'Please select both pickup and drop locations from the suggestions');
    }
    setLoading(true);
    try {
      await RideAPI.create({
        vehicleId,
        originAddress: origin.address,
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationAddress: destination.address,
        destLat: destination.latitude,
        destLng: destination.longitude,
        departureTime: departureTime.toISOString(),
        seatsTotal: parseInt(seatsTotal, 10),
        pricePerKm: parseFloat(pricePerKm),
      });

      Alert.alert('Ride posted!', 'Your ride is now visible to nearby verified colleagues.');
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || err.message || 'Failed to post ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Offer a ride</Text>

      <Text style={styles.label}>Pickup location</Text>
      <SavedAddressChips onSelect={setOrigin} />
      <AddressAutocompleteInput placeholder="e.g. Baner, Pune" value={origin?.address} onLocationSelected={setOrigin} />

      <Text style={styles.label}>Drop location (office)</Text>
      <SavedAddressChips onSelect={setDestination} />
      <AddressAutocompleteInput placeholder="e.g. Hinjewadi Phase 2" value={destination?.address} onLocationSelected={setDestination} />

      <RoutePreviewMap origin={origin} destination={destination} />

      <Text style={styles.label}>Departure time</Text>
      <TouchableOpacity style={common.input} onPress={() => setShowPicker(true)}>
        <Text>{departureTime.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={departureTime}
          mode="datetime"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setDepartureTime(date);
          }}
        />
      )}

      <Text style={styles.label}>Seats available</Text>
      <TextInput style={common.input} keyboardType="number-pad" value={seatsTotal} onChangeText={setSeatsTotal} />

      <Text style={styles.label}>Price per km (₹4 - ₹5)</Text>
      <TextInput style={common.input} keyboardType="decimal-pad" value={pricePerKm} onChangeText={setPricePerKm} />

      <Text style={styles.label}>Vehicle</Text>
      {vehicles.length === 0 ? (
        <TouchableOpacity style={styles.addVehicleBanner} onPress={() => navigation.navigate('Vehicles')}>
          <Text style={styles.addVehicleText}>You haven't added a vehicle yet. Tap to add one (optional).</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.vehicleRow}>
          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleChip, vehicleId === v.id && styles.vehicleChipActive]}
              onPress={() => setVehicleId(v.id)}
            >
              <Text style={[styles.vehicleChipText, vehicleId === v.id && styles.vehicleChipTextActive]}>
                {v.vehicle_type === 'car' ? '🚗' : '🏍️'} {v.make_model}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[common.primaryButton, styles.postButton]} onPress={handlePost} disabled={loading}>
        <Text style={common.primaryButtonText}>{loading ? 'Posting...' : 'Post ride'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 20, color: colors.textPrimary },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 12, color: '#333' },
  addVehicleBanner: { backgroundColor: colors.warningTint, borderRadius: radius.md, padding: 14 },
  addVehicleText: { color: colors.warning },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  vehicleChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  vehicleChipText: { color: colors.textSecondary, fontWeight: '600' },
  vehicleChipTextActive: { color: colors.primary },
  postButton: { marginTop: 24 },
});
