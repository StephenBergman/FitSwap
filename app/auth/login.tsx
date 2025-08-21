// app/login.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    else router.replace('/home');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Login to FitSwap</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <View style={styles.pwRow}>
            <TextInput
              /* changing the key forces a remount so Android correctly re-renders masked/unmasked */
              key={showPw ? 'pw-text' : 'pw-secure'}
              style={[styles.input, styles.pwInput, Platform.OS === 'android' ? styles.androidPwFont : null]}
              placeholder="Password"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              /* DO NOT use keyboardType="visible-password" — it overrides masking on Android */
              keyboardType="default"
              secureTextEntry={!showPw}
              textContentType="password"
              autoComplete="password"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.pwToggle}>
              <Text style={styles.pwToggleText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Don’t have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INPUT_H = 48;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 32,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    height: INPUT_H,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontSize: 16,
    lineHeight: 20,
    color: '#111',
    marginBottom: 16,
  },
  pwRow: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  pwInput: { paddingRight: 54, marginBottom: 0 },
  /* Use a system font on Android to avoid odd masking glitches in some OEM keyboards */
  androidPwFont: {
    fontFamily: 'sans-serif',
    letterSpacing: 0,
  },
  pwToggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    height: INPUT_H,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pwToggleText: { color: '#007AFF', fontWeight: '600' },
  button: {
    width: '100%',
    height: INPUT_H,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  secondaryButton: { marginTop: 18 },
  secondaryText: { color: '#007AFF', fontSize: 16 },
});
