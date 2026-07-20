import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { AuthAPI } from '../api/client';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:4000';

export default function VerificationScreen({ route }) {
  const { userId } = route.params;
  const [companyEmail, setCompanyEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [companyVerified, setCompanyVerified] = useState(false);
  const [linkedinVerified, setLinkedinVerified] = useState(false);
  const { signIn } = useAuth();

  const sendOtp = async () => {
    try {
      await AuthAPI.sendWorkEmailOtp({ userId, companyEmail });
      setOtpSent(true);
      Alert.alert('Code sent', 'Check your work inbox for a 6-digit code.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send code');
    }
  };

  const verifyOtp = async () => {
    try {
      await AuthAPI.verifyWorkEmailOtp({ companyEmail, code: otp });
      setCompanyVerified(true);
      Alert.alert('Verified!', 'Your company badge is now active.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Invalid code');
    }
  };

  const connectLinkedIn = async () => {
    // Opens LinkedIn OAuth consent screen; backend callback marks linkedin_verified=true
    // and deep-links back into the app (scheme: officepool://verification/linkedin/success)
    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
      `&client_id=${Constants.expoConfig?.extra?.linkedinClientId || 'YOUR_CLIENT_ID'}` +
      `&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/auth/linkedin/callback`)}` +
      `&scope=openid%20profile%20email&state=${userId}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'officepool://verification/linkedin/success');
    if (result.type === 'success') {
      setLinkedinVerified(true);
      Alert.alert('Verified!', 'Your LinkedIn badge is now active.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Build your trust badge</Text>
      <Text style={styles.subtitle}>
        Riders and drivers feel safer when they can confirm who you really are. This step is optional but strongly recommended.
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Company email verification</Text>
          {companyVerified && <VerifiedBadge label="Company" color="#12A150" />}
        </View>
        {!companyVerified && (
          <>
            <TextInput
              style={styles.input}
              placeholder="you@yourcompany.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={companyEmail}
              onChangeText={setCompanyEmail}
            />
            {!otpSent ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={sendOtp}>
                <Text style={styles.secondaryButtonText}>Send code</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity style={styles.secondaryButton} onPress={verifyOtp}>
                  <Text style={styles.secondaryButtonText}>Verify code</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LinkedIn verification</Text>
          {linkedinVerified && <VerifiedBadge label="LinkedIn" color="#0A66C2" />}
        </View>
        {!linkedinVerified && (
          <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: '#0A66C2' }]} onPress={connectLinkedIn}>
            <Text style={styles.secondaryButtonText}>Connect LinkedIn</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={signIn}>
        <Text style={styles.buttonText}>Continue to app</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginTop: 20 },
  subtitle: { color: '#666', marginTop: 6, marginBottom: 24 },
  section: { marginBottom: 24, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 10 },
  secondaryButton: { backgroundColor: '#12A150', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  button: { backgroundColor: '#0B5FFF', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
