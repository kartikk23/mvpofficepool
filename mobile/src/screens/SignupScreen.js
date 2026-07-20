import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from '../api/client';
import { registerForPushNotifications } from '../utils/notifications';

const FIELDS = [
  { key: 'fullName', label: 'Full name', placeholder: 'e.g. Priya Sharma', autoCapitalize: 'words' },
  { key: 'username', label: 'Username', placeholder: 'Choose a username (letters, numbers, _, .)', autoCapitalize: 'none', autoCorrect: false },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'phone', label: 'Phone number', placeholder: '10-digit mobile number', keyboardType: 'phone-pad' },
  { key: 'password', label: 'Password', placeholder: 'Create a password', secureTextEntry: true },
  { key: 'companyName', label: 'Company name', placeholder: 'e.g. Infosys', autoCapitalize: 'words' },
  { key: 'designation', label: 'Designation', placeholder: 'e.g. Senior Analyst', autoCapitalize: 'words' },
];

export default function SignupScreen({ navigation }) {
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', phone: '', password: '', companyName: '', designation: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSignup = async () => {
    if (!form.fullName || !form.username || !form.email || !form.phone || !form.password) {
      return Alert.alert('Missing info', 'Please fill in your name, username, email, phone, and password');
    }
    setLoading(true);
    try {
      const { data } = await AuthAPI.signup(form);
      await AsyncStorage.setItem('token', data.token);
      registerForPushNotifications();
      navigation.replace('Verification', { userId: data.user.id });
    } catch (err) {
      Alert.alert('Signup failed', err?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Add your company & designation now — you can verify them right after for a trust badge.
        </Text>

        <View style={styles.form}>
          {FIELDS.map((f) => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor="#9AA0A6"
                secureTextEntry={!!f.secureTextEntry}
                keyboardType={f.keyboardType || 'default'}
                autoCapitalize={f.autoCapitalize || 'sentences'}
                value={form[f.key]}
                onChangeText={(v) => update(f.key, v)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#F7F9FC', flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 20, marginBottom: 6, color: '#111' },
  subtitle: { color: '#667085', marginBottom: 24, fontSize: 14, lineHeight: 20 },
  form: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#344054', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#E4E7EC', borderRadius: 12, padding: 14, fontSize: 15,
    backgroundColor: '#FCFCFD', color: '#111',
  },
  button: {
    backgroundColor: '#0B5FFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24,
    shadowColor: '#0B5FFF', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});