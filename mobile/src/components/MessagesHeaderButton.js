import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MessagesAPI } from '../api/client';
import { colors } from '../theme';

export function MessagesHeaderButton() {
  const navigation = useNavigation();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      MessagesAPI.unreadCount()
        .then((res) => setUnread(res.data.count))
        .catch(() => {});
    }, [])
  );

  return (
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Messages')}>
      <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.textPrimary} />
      {unread > 0 && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 6, marginRight: 6 },
  dot: {
    position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: colors.danger, borderWidth: 1.5, borderColor: '#fff',
  },
});
