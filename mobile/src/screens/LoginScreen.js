import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from '../api/client';
import { registerForPushNotifications } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      return Alert.alert('Missing info', 'Please enter both username and password');
    }
    setLoading(true);
    try {
      const { data } = await AuthAPI.login({ username, password });
      await AsyncStorage.setItem('token', data.token);
      registerForPushNotifications();
      signIn();
    } catch (err) {
      Alert.alert('Login failed', err?.response?.data?.error || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>OP</Text>
        </View>
        <Text style={styles.logo}>OfficePool</Text>
        <Text style={styles.tagline}>Verified colleagues. Shared commute. Real trust.</Text>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="yourusername"
            placeholderTextColor="#9AA0A6"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9AA0A6"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkWrap}>
            <Text style={styles.link}>New here? <Text style={styles.linkBold}>Create an account</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7F9FC' },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#0B5FFF',
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#0B5FFF', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  logoBadgeText: { color: '#fff', fontWeight: '900', fontSize: 26 },
  logo: { fontSize: 30, fontWeight: '800', color: '#111', textAlign: 'center' },
  tagline: { textAlign: 'center', color: '#667085', marginTop: 8, marginBottom: 32, fontSize: 14 },
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
  linkWrap: { marginTop: 20, alignItems: 'center' },
  link: { color: '#667085', fontSize: 14 },
  linkBold: { color: '#0B5FFF', fontWeight: '700' },
});