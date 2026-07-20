import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { VehicleAPI } from '../api/client';

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleType, setVehicleType] = useState('car');
  const [makeModel, setMakeModel] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState('3');
  const [saving, setSaving] = useState(false);

  const load = () => {
    VehicleAPI.mine().then((res) => setVehicles(res.data)).catch(() => {});
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAdd = async () => {
    if (!makeModel || !registrationNo) {
      return Alert.alert('Missing info', 'Please enter make/model and registration number');
    }
    setSaving(true);
    try {
      await VehicleAPI.create({
        vehicleType, makeModel, registrationNo, seatsAvailable: parseInt(seatsAvailable, 10) || 3,
      });
      setMakeModel('');
      setRegistrationNo('');
      setSeatsAvailable('3');
      load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id) => {
    Alert.alert('Remove vehicle', 'Are you sure you want to remove this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await VehicleAPI.remove(id);
            load();
          } catch (err) {
            Alert.alert('Error', 'Failed to remove vehicle');
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      data={vehicles}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>My vehicles</Text>
          <Text style={styles.subtitle}>Add a vehicle so you can offer rides as a driver.</Text>

          <View style={styles.form}>
            <View style={styles.typeRow}>
              {['car', 'bike'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeButton, vehicleType === t && styles.typeButtonActive]}
                  onPress={() => setVehicleType(t)}
                >
                  <Text style={[styles.typeButtonText, vehicleType === t && styles.typeButtonTextActive]}>
                    {t === 'car' ? '🚗 Car' : '🏍️ Bike'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Make & model, e.g. Honda City"
              value={makeModel}
              onChangeText={setMakeModel}
            />
            <TextInput
              style={styles.input}
              placeholder="Registration number, e.g. MH12AB1234"
              autoCapitalize="characters"
              value={registrationNo}
              onChangeText={setRegistrationNo}
            />
            <TextInput
              style={styles.input}
              placeholder="Seats available"
              keyboardType="number-pad"
              value={seatsAvailable}
              onChangeText={setSeatsAvailable}
            />
            <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? 'Adding...' : 'Add vehicle'}</Text>
            </TouchableOpacity>
          </View>

          {vehicles.length > 0 && <Text style={styles.sectionTitle}>Your vehicles</Text>}
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No vehicles added yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.vehicleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{item.vehicle_type === 'car' ? '🚗' : '🏍️'} {item.make_model}</Text>
            <Text style={styles.vehicleMeta}>{item.registration_no} · {item.seats_available} seats</Text>
          </View>
          <TouchableOpacity onPress={() => handleRemove(item.id)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#667085', marginTop: 6, marginBottom: 20, fontSize: 14 },
  form: { backgroundColor: '#F7F9FC', borderRadius: 16, padding: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeButton: { flex: 1, borderWidth: 1.5, borderColor: '#E4E7EC', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  typeButtonActive: { borderColor: '#0B5FFF', backgroundColor: '#F0F5FF' },
  typeButtonText: { fontWeight: '600', color: '#344054' },
  typeButtonTextActive: { color: '#0B5FFF' },
  input: { borderWidth: 1.5, borderColor: '#E4E7EC', borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 10 },
  button: { backgroundColor: '#0B5FFF', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  emptyText: { color: '#888', marginTop: 10 },
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA',
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  vehicleName: { fontWeight: '700' },
  vehicleMeta: { color: '#666', fontSize: 12, marginTop: 4 },
  removeText: { color: '#D32F2F', fontWeight: '700' },
});
