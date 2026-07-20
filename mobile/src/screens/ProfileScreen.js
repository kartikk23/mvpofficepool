import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput,
} from 'react-native';
import { UserAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { RatingsList } from '../components/RatingsList';
import { useAuth } from '../context/AuthContext';
import { colors, radius, common } from '../theme';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    UserAPI.me().then((res) => {
      setUser(res.data);
      setUpiId(res.data.upi_id || '');
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const saveUpi = async () => {
    if (!upiId.includes('@')) {
      return Alert.alert('Invalid UPI ID', 'A UPI ID looks like yourname@bankname (e.g. priya@okhdfcbank)');
    }
    setSavingUpi(true);
    try {
      await UserAPI.updateMe({ upiId });
      Alert.alert('Saved', 'Your UPI ID has been updated. Ride payouts will be sent here.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  if (!user) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <ProfileCard user={{
        fullName: user.full_name,
        photoUrl: user.profile_photo_url,
        company: user.company_name,
        designation: user.designation,
        badges: { linkedinVerified: user.linkedin_verified, companyVerified: user.company_email_verified },
        trustScore: user.trust_score,
        totalRides: user.total_rides,
      }} />
      <Text style={styles.username}>@{user.username}</Text>

      {!(user.linkedin_verified && user.company_email_verified) && (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => navigation.navigate('Verification', { userId: user.id })}
        >
          <Text style={styles.verifyBannerText}>
            🔒 Complete verification to unlock the trust badges on your profile
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout UPI ID</Text>
        <Text style={styles.sectionSubtitle}>
          If you offer rides as a driver, your fare payouts are sent here (minus the platform fee).
        </Text>
        <TextInput
          style={common.input}
          placeholder="yourname@okhdfcbank"
          placeholderTextColor="#9AA0A6"
          autoCapitalize="none"
          value={upiId}
          onChangeText={setUpiId}
        />
        <TouchableOpacity style={[common.primaryButton, { backgroundColor: colors.success, shadowColor: colors.success, marginTop: 12 }]} onPress={saveUpi} disabled={savingUpi}>
          <Text style={common.primaryButtonText}>{savingUpi ? 'Saving...' : 'Save UPI ID'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.linkSection} onPress={() => navigation.navigate('Vehicles')}>
        <Text style={styles.sectionTitle}>🚗 My vehicles</Text>
        <Text style={styles.sectionSubtitle}>Add or manage the vehicle(s) you drive.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkSection} onPress={() => navigation.navigate('SavedAddresses')}>
        <Text style={styles.sectionTitle}>📍 Saved addresses</Text>
        <Text style={styles.sectionSubtitle}>Manage Home, Work, and other quick-pick places.</Text>
      </TouchableOpacity>

      <RatingsList userId={user.id} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  username: { color: colors.textMuted, fontSize: 13, marginTop: 6, marginLeft: 4 },
  verifyBanner: { backgroundColor: colors.warningTint, borderRadius: radius.md, padding: 14, marginTop: 20 },
  verifyBannerText: { color: colors.warning, fontWeight: '600' },
  section: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  linkSection: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 17 },
  logoutButton: { marginTop: 30, marginBottom: 40, alignItems: 'center', padding: 16 },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
