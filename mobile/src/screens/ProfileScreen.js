import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { UserAPI, ImpactAPI } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { RatingsList } from '../components/RatingsList';
import { useAuth } from '../context/AuthContext';
import { KeyboardScreen } from '../components/KeyboardScreen';
import { colors, radius, common } from '../theme';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(null);
  const { signOut } = useAuth();

  useEffect(() => {
    UserAPI.me().then((res) => {
      setUser(res.data);
      setUpiId(res.data.upi_id || '');
      ImpactAPI.connections(res.data.id).then((r) => setConnectionsCount(r.data.count)).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      "This permanently removes your profile, saved addresses, and vehicles. Your ride and payment history stays visible to the colleagues you rode with, but is no longer linked to your identity. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserAPI.deleteMe();
              await signOut();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingPhoto(true);
    try {
      const image = await ImageManipulator.manipulate(result.assets[0].uri)
        .resize({ width: 480, height: 480 })
        .renderAsync();
      const saved = await image.saveAsync({
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });
      const dataUri = `data:image/jpeg;base64,${saved.base64}`;
      await UserAPI.updateMe({ profilePhotoUrl: dataUri });
      setUser((u) => ({ ...u, profile_photo_url: dataUri }));
    } catch (err) {
      console.log('Profile photo update error', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploadingPhoto(false);
    }
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
    <KeyboardScreen>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <ProfileCard
        user={{
          fullName: user.full_name,
          photoUrl: user.profile_photo_url,
          company: user.company_name,
          designation: user.designation,
          badges: { linkedinVerified: user.linkedin_verified, companyVerified: user.company_email_verified },
          trustScore: user.trust_score,
          totalRides: user.total_rides,
        }}
        onEditPhoto={pickAndUploadPhoto}
        connectionsCount={connectionsCount}
        onPressConnections={() => navigation.navigate('Connections', { userId: user.id })}
      />
      {uploadingPhoto && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.uploadingText}>Updating photo...</Text>
        </View>
      )}
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
        <TouchableOpacity style={[common.primaryButton, { marginTop: 12 }]} onPress={saveUpi} disabled={savingUpi}>
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

      <TouchableOpacity style={styles.linkSection} onPress={() => navigation.navigate('MyImpact')}>
        <Text style={styles.sectionTitle}>🌱 My impact</Text>
        <Text style={styles.sectionSubtitle}>Your carpool streak, CO2 saved, and company leaderboard.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkSection} onPress={() => navigation.navigate('CommuteCircle')}>
        <Text style={styles.sectionTitle}>👥 Commute circle</Text>
        <Text style={styles.sectionSubtitle}>Colleagues near you worth carpooling with regularly.</Text>
      </TouchableOpacity>

      <RatingsList userId={user.id} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteAccountText}>Delete my account</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  username: { color: colors.textMuted, fontSize: 13, marginTop: 6, marginLeft: 4 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 4 },
  uploadingText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600' },
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
  logoutButton: { marginTop: 30, alignItems: 'center', padding: 16 },
  logoutText: { color: colors.danger, fontWeight: '700' },
  deleteAccountButton: { marginBottom: 40, alignItems: 'center', padding: 12 },
  deleteAccountText: { color: colors.textFaint, fontWeight: '600', fontSize: 12.5, textDecorationLine: 'underline' },
});
