import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RatingAPI } from '../api/client';

// Shows a user's received reviews — used on both the own-profile screen and public profiles.
export function RatingsList({ userId }) {
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    if (!userId) return;
    RatingAPI.forUser(userId).then((res) => setRatings(res.data)).catch(() => {});
  }, [userId]);

  if (!ratings.length) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <Text style={styles.emptyText}>No reviews yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews ({ratings.length})</Text>
      {ratings.map((r, i) => (
        <View key={i} style={styles.reviewRow}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text key={n} style={[styles.star, n <= r.stars && styles.starFilled]}>★</Text>
            ))}
            <Text style={styles.date}>{new Date(r.created_at).toLocaleDateString()}</Text>
          </View>
          {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
          {!!(r.tags && r.tags.length) && (
            <View style={styles.tagsRow}>
              {r.tags.map((tag, j) => (
                <View key={j} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 10 },
  emptyText: { color: '#888' },
  reviewRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  star: { fontSize: 14, color: '#ddd', marginRight: 2 },
  starFilled: { color: '#F5A623' },
  date: { color: '#999', fontSize: 11, marginLeft: 8 },
  comment: { color: '#333', marginTop: 6, fontSize: 13, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#F0F5FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: '#0B5FFF', fontSize: 11, fontWeight: '600' },
});
