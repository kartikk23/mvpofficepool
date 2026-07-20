import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// A small pill badge, similar to LinkedIn's blue checkmark, used inline next to a name.
export function VerifiedBadge({ label = 'Verified', color = '#0A66C2' }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 6,
  },
  checkmark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginRight: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
