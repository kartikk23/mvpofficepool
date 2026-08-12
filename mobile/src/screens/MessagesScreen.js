import React, { useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessagesAPI } from '../api/client';
import { colors, radius, shadow } from '../theme';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function MessagesScreen({ navigation }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      MessagesAPI.threads()
        .then((res) => setThreads(res.data))
        .catch((err) => console.log('Failed to load threads', err?.response?.data || err.message))
        .finally(() => setLoading(false));
    }, [])
  );

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
      data={threads}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Message a ride partner from your booking to get started.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Chat', { recipientId: item.userId, name: item.name })}
        >
          <Image
            source={item.photoUrl ? { uri: item.photoUrl } : require('../../assets/default-avatar.png')}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.topLine}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.time}>{timeAgo(item.lastSentAt)}</Text>
            </View>
            <View style={styles.bottomLine}>
              <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                {item.lastBody}
              </Text>
              {item.unreadCount > 0 && <View style={styles.unreadDot} />}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: 60 },
  emptyIcon: { fontSize: 34, marginBottom: 10 },
  emptyTitle: { fontWeight: '700', fontSize: 15, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: radius.lg, padding: 14, marginHorizontal: 16, marginBottom: 10, ...shadow.card,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.bg },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  time: { fontSize: 11.5, color: colors.textFaint },
  bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  preview: { fontSize: 13, color: colors.textMuted, flex: 1 },
  previewUnread: { color: colors.textPrimary, fontWeight: '600' },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary },
});
