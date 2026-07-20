import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SavedAddressAPI } from '../api/client';
import { AddressAutocompleteInput } from '../components/AddressAutocompleteinput';
import { colors, radius, common } from '../theme';

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState([]);
  const [label, setLabel] = useState('');
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    SavedAddressAPI.mine().then((res) => setAddresses(res.data)).catch(() => {});
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAdd = async () => {
    if (!label.trim() || !picked) {
      return Alert.alert('Missing info', 'Give it a label (e.g. Home) and pick an address from the suggestions');
    }
    setSaving(true);
    try {
      await SavedAddressAPI.create({
        label: label.trim(), address: picked.address, lat: picked.latitude, lng: picked.longitude,
      });
      setLabel('');
      setPicked(null);
      load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id) => {
    Alert.alert('Remove address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await SavedAddressAPI.remove(id); load(); } },
    ]);
  };

  return (
    <FlatList
      style={common.screen}
      contentContainerStyle={{ padding: 20 }}
      data={addresses}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Saved addresses</Text>
          <Text style={styles.subtitle}>Quick-pick Home, Work, or any other place you commute to often.</Text>

          <View style={styles.form}>
            <TextInput
              style={[common.input, { marginBottom: 10 }]}
              placeholder="Label, e.g. Home or Work"
              value={label}
              onChangeText={setLabel}
            />
            <AddressAutocompleteInput placeholder="Search address" onLocationSelected={setPicked} />
            <TouchableOpacity style={common.primaryButton} onPress={handleAdd} disabled={saving}>
              <Text style={common.primaryButtonText}>{saving ? 'Saving...' : 'Save address'}</Text>
            </TouchableOpacity>
          </View>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No saved addresses yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, marginTop: 6, marginBottom: 20, fontSize: 14 },
  form: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 16, marginBottom: 10, gap: 10 },
  emptyText: { color: colors.textFaint, marginTop: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: radius.md, padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border,
  },
  label: { fontWeight: '700', color: colors.textPrimary },
  address: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  removeText: { color: colors.danger, fontWeight: '700' },
});
