import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { UserAPI, ImpactAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { RatingsList } from '../components/RatingsList';
import { colors } from '../theme';

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [connectionsCount, setConnectionsCount] = useState(null);

  useEffect(() => {
    UserAPI.publicProfile(userId).then((res) => setProfile(res.data)).catch(() => {});
    ImpactAPI.connections(userId).then((res) => setConnectionsCount(res.data.count)).catch(() => {});
  }, [userId]);

  if (!profile) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <ProfileCard
        user={profile}
        connectionsCount={connectionsCount}
        onPressConnections={() => navigation.navigate('Connections', { userId })}
      />
      <RatingsList userId={userId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
