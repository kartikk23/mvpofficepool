import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { io } from 'socket.io-client';
import { BASE_URL, MessagesAPI, UserAPI } from '../api/client';
import { colors, radius, shadow } from '../theme';

export default function ChatScreen({ route, navigation }) {
  const { recipientId, name, bookingId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (name) {
      navigation.setOptions({ title: name });
    } else {
      UserAPI.publicProfile(recipientId)
        .then((res) => navigation.setOptions({ title: res.data.fullName || 'Chat' }))
        .catch(() => {});
    }
  }, [recipientId, name]);

  useEffect(() => {
    let isMounted = true;

    UserAPI.me().then((res) => { if (isMounted) setMyUserId(res.data.id); }).catch(() => {});

    MessagesAPI.thread(recipientId)
      .then((res) => { if (isMounted) setMessages(res.data); })
      .catch((err) => console.log('Failed to load chat history', err?.response?.data || err.message));

    MessagesAPI.markRead(recipientId).catch(() => {});

    const socket = io(BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      if (myUserId) socket.emit('join_dm', { userId: myUserId, otherUserId: recipientId });
    });
    socket.on('chat_message', (msg) => {
      setMessages((prev) => [...prev, { id: msg.id, sender_id: msg.senderId, body: msg.body, sent_at: msg.sentAt }]);
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [recipientId]);

  // myUserId loads async; (re)join the DM room once it's known.
  useEffect(() => {
    if (myUserId && socketRef.current?.connected) {
      socketRef.current.emit('join_dm', { userId: myUserId, otherUserId: recipientId });
    }
  }, [myUserId, recipientId]);

  const sendMessage = () => {
    const body = text.trim();
    if (!body || !myUserId || !socketRef.current) return;
    socketRef.current.emit('chat_message', { recipientId, senderId: myUserId, body, bookingId });
    setText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, i) => item.id || `${i}`}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender_id === myUserId;
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Say hello 👋</Text>}
      />
      <View style={[styles.inputRow, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textFaint}
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...shadow.card },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: '#fff', fontSize: 14.5 },
  bubbleTextTheirs: { color: colors.textPrimary, fontSize: 14.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, gap: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15,
    backgroundColor: '#FCFCFD', color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary, borderRadius: radius.pill, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center', ...shadow.button,
  },
  sendButtonDisabled: { backgroundColor: colors.textFaint, shadowOpacity: 0 },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: 18, marginLeft: -2 },
});
