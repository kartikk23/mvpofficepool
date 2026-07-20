import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { UserAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { RatingsList } from '../components/RatingsList';

export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    UserAPI.publicProfile(userId).then((res) => setProfile(res.data)).catch(() => {});
  }, [userId]);

  if (!profile) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <ProfileCard user={profile} />
      <RatingsList userId={userId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
});
