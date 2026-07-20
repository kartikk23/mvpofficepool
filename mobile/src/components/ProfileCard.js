import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * The core trust UI: a profile "banner" like a LinkedIn card —
 * photo, name + verified checkmarks, current company & designation, trust score.
 * Used on: own profile screen, ride search results (driver preview), booking confirmation.
 */
export function ProfileCard({ user, compact = false }) {
  const {
    photoUrl,
    fullName,
    company,
    designation,
    badges = {},
    trustScore,
    totalRides,
  } = user;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Image
        source={photoUrl ? { uri: photoUrl } : require('../../assets/default-avatar.png')}
        style={compact ? styles.avatarSmall : styles.avatar}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          {badges.linkedinVerified && <VerifiedBadge label="LinkedIn" color="#0A66C2" />}
          {badges.companyVerified && <VerifiedBadge label="Company" color="#12A150" />}
        </View>
        {(designation || company) && (
          <Text style={styles.role} numberOfLines={1}>
            {designation}{designation && company ? ' at ' : ''}{company}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.metaText}>{Number(trustScore || 4.5).toFixed(1)}</Text>
          {typeof totalRides === 'number' && (
            <Text style={styles.metaText}> · {totalRides} rides</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardCompact: { padding: 10, borderRadius: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 12, backgroundColor: '#eee' },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: '#eee' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', maxWidth: 140 },
  role: { fontSize: 13, color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  star: { color: '#F5A623', fontSize: 13, marginRight: 3 },
  metaText: { fontSize: 12, color: '#555' },
});
