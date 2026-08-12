import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { VerifiedBadge } from './VerifiedBadge';
import { colors } from '../theme';

/**
 * The core trust UI: a profile "banner" like a LinkedIn card —
 * photo, name + verified checkmarks, current company & designation, trust score.
 * Used on: own profile screen, ride search results (driver preview), booking confirmation.
 * Pass `onEditPhoto` (own-profile screen only) to show a tappable camera badge on the avatar.
 */
export function ProfileCard({ user, compact = false, onEditPhoto, connectionsCount, onPressConnections }) {
  const {
    photoUrl,
    fullName,
    company,
    designation,
    badges = {},
    trustScore,
    totalRides,
  } = user;

  const avatarImage = (
    <Image
      source={photoUrl ? { uri: photoUrl } : require('../../assets/default-avatar.png')}
      style={compact ? styles.avatarSmall : styles.avatar}
    />
  );

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {onEditPhoto ? (
        <TouchableOpacity style={styles.avatarWrap} onPress={onEditPhoto} activeOpacity={0.8}>
          {avatarImage}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeIcon}>📷</Text>
          </View>
        </TouchableOpacity>
      ) : avatarImage}
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
          {typeof connectionsCount === 'number' && (
            onPressConnections ? (
              <TouchableOpacity onPress={onPressConnections}>
                <Text style={[styles.metaText, styles.connectionsLink]}> · 🤝 {connectionsCount} Connections</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.metaText}> · 🤝 {connectionsCount} Connections</Text>
            )
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
  avatarWrap: { marginRight: 12 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  editBadgeIcon: { fontSize: 10 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', maxWidth: 140 },
  role: { fontSize: 13, color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  star: { color: '#F5A623', fontSize: 13, marginRight: 3 },
  metaText: { fontSize: 12, color: '#555' },
  connectionsLink: { color: colors.primary, fontWeight: '600' },
});
