import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImpactAPI } from '../api/client';
import { colors, radius, shadow, gradients } from '../theme';

export default function ConnectionsScreen({ route, navigation }) {
  const { userId } = route.params;
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ImpactAPI.connectionsList(userId)
      .then((res) => setConnections(res.data))
      .catch((err) => console.log('Connections load error', err?.response?.data || err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={connections}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <Text style={styles.heroIcon}>🤝</Text>
          <Text style={styles.title}>Connections</Text>
          <Text style={styles.subtitle}>
            Colleagues you've shared a completed ride with — your carpool network.
          </Text>
        </LinearGradient>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🧭</Text>
          <Text style={styles.emptyTitle}>No connections yet</Text>
          <Text style={styles.emptySub}>Complete a ride together and they'll show up here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PublicProfile', { userId: item.userId })}
        >
          <Image
            source={item.photoUrl ? { uri: item.photoUrl } : require('../../assets/default-avatar.png')}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {(item.designation || item.company) && (
              <Text style={styles.designation} numberOfLines={1}>
                {item.designation}{item.designation && item.company ? ' at ' : ''}{item.company}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  hero: {
    padding: 24, paddingTop: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 16,
  },
  heroIcon: { fontSize: 28, marginBottom: 8 },
  title: { fontSize: 21, fontWeight: '800', color: '#fff' },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 13, lineHeight: 19 },
  emptyBox: { alignItems: 'center', paddingHorizontal: 30, marginTop: 40 },
  emptyIcon: { fontSize: 34, marginBottom: 10 },
  emptyTitle: { fontWeight: '700', fontSize: 15, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: radius.lg, padding: 14, marginHorizontal: 16, marginBottom: 12, ...shadow.card,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  designation: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
