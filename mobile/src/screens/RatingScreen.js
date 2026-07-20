import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { RatingAPI } from '../api/client';

export default function RatingScreen({ route, navigation }) {
  const { bookingId, rateeId } = route.params;
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const submit = async () => {
    try {
      await RatingAPI.submit({ bookingId, rateeId, stars, comment });
      Alert.alert('Thanks!', 'Your rating helps keep OfficePool trustworthy.');
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How was your ride?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setStars(n)}>
            <Text style={[styles.star, n <= stars && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Optional feedback"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Submit rating</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  star: { fontSize: 40, color: '#ddd', marginHorizontal: 4 },
  starFilled: { color: '#F5A623' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  button: { backgroundColor: '#0B5FFF', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
