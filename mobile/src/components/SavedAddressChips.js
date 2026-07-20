import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SavedAddressAPI } from '../api/client';
import { colors, radius } from '../theme';

const LABEL_ICON = { Home: '🏠', Work: '💼' };

// Quick-select chips for a user's saved Home/Work/custom addresses, shown above
// address search inputs so riders/drivers don't have to retype frequent places.
export function SavedAddressChips({ onSelect }) {
  const [addresses, setAddresses] = useState([]);

  useFocusEffect(useCallback(() => {
    SavedAddressAPI.mine().then((res) => setAddresses(res.data)).catch(() => {});
  }, []));

  if (!addresses.length) return null;

  return (
    <View style={styles.row}>
      {addresses.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={styles.chip}
          onPress={() => onSelect({ latitude: a.lat, longitude: a.lng, address: a.address })}
        >
          <Text style={styles.chipText}>{LABEL_ICON[a.label] || '📍'} {a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
