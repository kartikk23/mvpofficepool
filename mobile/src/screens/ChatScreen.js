import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { io } from 'socket.io-client';
import { BASE_URL, BookingAPI, UserAPI } from '../api/client';

export default function ChatScreen({ route }) {
  const { bookingId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    UserAPI.me().then((res) => { if (isMounted) setMyUserId(res.data.id); }).catch(() => {});

    BookingAPI.messages(bookingId)
      .then((res) => { if (isMounted) setMessages(res.data); })
      .catch((err) => console.log('Failed to load chat history', err?.response?.data || err.message));

    const socket = io(BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_booking', bookingId);
    socket.on('chat_message', (msg) => {
      setMessages((prev) => [...prev, { id: msg.id, sender_id: msg.senderId, body: msg.body, sent_at: msg.sentAt }]);
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [bookingId]);

  const sendMessage = () => {
    const body = text.trim();
    if (!body || !myUserId || !socketRef.current) return;
    socketRef.current.emit('chat_message', { bookingId, senderId: myUserId, body });
    setText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, i) => item.id || `${i}`}
        contentContainerStyle={{ padding: 16 }}
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
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#0B5FFF', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: '#111' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButton: { backgroundColor: '#0B5FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
